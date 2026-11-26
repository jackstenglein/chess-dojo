#!/usr/bin/env python3
"""Export Stripe payment intents and refunds in a time window, categorized by course.

ChessDojo checkout stores course ids on the PaymentIntent metadata. One course
is `courseIds` set to that id. A bundle is a comma-separated `courseIds` list.
The script also reads `courseId` when that key is present. Bundle amounts are
split evenly across those ids (any leftover minor units go to the earliest ids)
so a sum grouped by `course_id` is not double-counted. Payment intents with no
course metadata are omitted.

Refunds are listed separately. Their course ids come from the expanded
PaymentIntent, because charge metadata does not include them.

After the Stripe export, the script scans the DynamoDB courses table and
fills `course_name` and `course_author` (`ownerDisplayName`, or `owner` when
the display name is missing).

Amounts are in the charge currency's major units (dollars for USD). Refunds
are negative. The window is inclusive and based on each object's `created`
time. A date without a time is a UTC calendar day.

Requires a restricted Stripe key with read access to PaymentIntents and
Refunds, and AWS credentials that can scan the courses table:

    pip install stripe boto3
    export STRIPE_API_KEY=...
    python3 scripts/stripe_transactions_by_course.py \\
        --start 2026-01-01 --end 2026-03-31 \\
        --output stripe_transactions.csv
"""

import argparse
import csv
import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

try:
    import boto3
except ImportError:
    print('Missing dependency. Install it with: pip install boto3', file=sys.stderr)
    sys.exit(1)

try:
    import stripe
except ImportError:
    print('Missing dependency. Install it with: pip install stripe', file=sys.stderr)
    sys.exit(1)


API_VERSION = '2026-09-30.endive'

COURSES_TABLE = 'prod-courses'

COLUMNS = [
    'created_utc',
    'course_id',
    'course_name',
    'course_author',
    'description',
    'currency',
    'amount',
    'transaction_type',
    'id',
    'charge_id',
    'payment_intent_id',
    'status',
    'bundle_size',
    'metadata_type',
    'username',
    'customer_id',
]

# https://docs.stripe.com/currencies#zero-decimal
ZERO_DECIMAL_CURRENCIES = {
    'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
    'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
}
THREE_DECIMAL_CURRENCIES = {'bhd', 'jod', 'kwd', 'omr', 'tnd'}


def field(obj, name, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        value = obj.get(name, default)
    else:
        getter = getattr(obj, 'get', None)
        value = getter(name, default) if callable(getter) else getattr(obj, name, default)
    return default if value is None else value


def object_id(value):
    if not value or isinstance(value, str):
        return value or ''
    return field(value, 'id', '') or ''


def metadata_dict(obj):
    return field(obj, 'metadata', {}).to_dict() or {}


def course_ids_from_metadata(metadata):
    """Return course ids from `courseId` and comma-separated `courseIds`."""
    raw_values = [metadata.get('courseId', ''), metadata.get('courseIds', '')]
    ids = []
    for raw in raw_values:
        for part in str(raw).split(','):
            course_id = part.strip()
            if course_id and course_id not in ids:
                ids.append(course_id)
    return ids


def currency_scale(currency):
    code = (currency or 'usd').lower()
    if code in ZERO_DECIMAL_CURRENCIES:
        return 0
    if code in THREE_DECIMAL_CURRENCIES:
        return 3
    return 2


def format_minor(amount, currency):
    scale = currency_scale(currency)
    quant = Decimal(1).scaleb(-scale)
    return format((Decimal(amount) * quant).quantize(quant), 'f')


def allocate_minor(total, parts):
    """Split an integer amount into `parts` shares that sum back to `total`."""
    if parts <= 0:
        raise ValueError('parts must be positive')
    base, remainder = divmod(int(total), parts)
    return [base + (1 if index < remainder else 0) for index in range(parts)]


def format_created(timestamp):
    return datetime.fromtimestamp(int(timestamp), timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def rows_for_transaction(transaction_type, record_id, payment_intent, created, status, currency, amount_minor, description, charge_id):
    metadata = metadata_dict(payment_intent)
    course_ids = course_ids_from_metadata(metadata)
    if not course_ids:
        return []

    categories = course_ids
    shares = allocate_minor(amount_minor, len(categories))
    if transaction_type == 'refund':
        shares = [-share for share in shares]

    customer_id = object_id(field(payment_intent, 'customer'))
    payment_intent_id = object_id(payment_intent)

    rows = []
    for course_id, share in zip(categories, shares):
        rows.append({
            'course_id': course_id,
            'transaction_type': transaction_type,
            'id': record_id,
            'charge_id': charge_id,
            'payment_intent_id': payment_intent_id,
            'created_utc': format_created(created),
            'status': status or '',
            'currency': (currency or '').lower(),
            'amount': format_minor(share, currency),
            'bundle_size': len(categories) if course_ids else 0,
            'metadata_type': metadata.get('type', ''),
            'username': metadata.get('username', ''),
            'description': description or field(payment_intent, 'description', '') or '',
            'customer_id': customer_id,
        })
    return rows


def parse_time(value, is_end):
    """Parse a CLI timestamp into a UTC unix time.

    Date-only values use UTC midnight. An end date is exclusive at the next
    midnight so the calendar day is included. Datetime ends are inclusive to
    the second. The returned value is an exclusive upper bound when is_end.
    """
    text = value.strip()
    try:
        if len(text) == 10:
            moment = datetime.strptime(text, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            if is_end:
                moment += timedelta(days=1)
            return int(moment.timestamp())

        normalized = text.replace('Z', '+00:00')
        moment = datetime.fromisoformat(normalized)
    except ValueError:
        raise SystemExit(
            f'Invalid time {value!r}. Use YYYY-MM-DD or an ISO-8601 datetime.'
        )

    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    timestamp = int(moment.timestamp())
    return timestamp + 1 if is_end else timestamp


def created_filter(start, end):
    start_ts = parse_time(start, is_end=False)
    end_ts = parse_time(end, is_end=True)
    if start_ts >= end_ts:
        raise SystemExit('--start must be before --end')
    return {'gte': start_ts, 'lt': end_ts}


def include_status(status, allowed):
    if allowed is None:
        return True
    return (status or '') in allowed


def fetch_transactions(client, created, allowed_statuses):
    rows = []
    payment_intent_count = 0
    refund_count = 0

    payment_intents = client.v1.payment_intents.list(params={
        'limit': 100,
        'created': created,
    })
    for payment_intent in payment_intents.auto_paging_iter():
        status = field(payment_intent, 'status', '')
        if not include_status(status, allowed_statuses):
            continue
        payment_intent_count += 1
        rows.extend(rows_for_transaction(
            'payment_intent',
            object_id(payment_intent),
            payment_intent,
            field(payment_intent, 'created', 0),
            status,
            field(payment_intent, 'currency', ''),
            field(payment_intent, 'amount', 0) or 0,
            field(payment_intent, 'description', '') or '',
            object_id(field(payment_intent, 'latest_charge')),
        ))
        if payment_intent_count % 100 == 0:
            print(f'Fetched {payment_intent_count} payment intents...', file=sys.stderr)

    refunds = client.v1.refunds.list(params={
        'limit': 100,
        'created': created,
        'expand': ['data.payment_intent'],
    })
    for refund in refunds.auto_paging_iter():
        status = field(refund, 'status', '')
        if not include_status(status, allowed_statuses):
            continue
        payment_intent = field(refund, 'payment_intent')
        if not payment_intent or isinstance(payment_intent, str):
            print(
                f'Skipping refund {object_id(refund)}: payment intent was not expanded',
                file=sys.stderr,
            )
            continue
        refund_count += 1
        rows.extend(rows_for_transaction(
            'refund',
            object_id(refund),
            payment_intent,
            field(refund, 'created', 0),
            status,
            field(refund, 'currency', '') or field(payment_intent, 'currency', ''),
            field(refund, 'amount', 0) or 0,
            field(payment_intent, 'description', '') or '',
            object_id(field(refund, 'charge')),
        ))
        if refund_count % 100 == 0:
            print(f'Fetched {refund_count} refunds...', file=sys.stderr)

    rows.sort(key=lambda row: (
        row['course_id'] == '',
        row['course_id'],
        row['created_utc'],
        row['transaction_type'],
        row['id'],
    ))
    return rows, payment_intent_count, refund_count


def load_courses(table):
    """Return a map of course id to name and author.

    The courses table is keyed by type and id. Ids are unique, so the scan
    result is indexed by id. Only the fields needed for the CSV are read.
    """
    courses = {}
    kwargs = {
        'ProjectionExpression': 'id, #name, #owner, ownerDisplayName',
        'ExpressionAttributeNames': {'#name': 'name', '#owner': 'owner'},
    }
    while True:
        response = table.scan(**kwargs)
        for item in response.get('Items', []):
            course_id = item.get('id')
            if not course_id or course_id in courses:
                continue
            courses[course_id] = {
                'name': item.get('name') or '',
                'author': item.get('ownerDisplayName') or item.get('owner') or '',
            }
        last_key = response.get('LastEvaluatedKey')
        if not last_key:
            return courses
        kwargs['ExclusiveStartKey'] = last_key


def apply_courses(rows, courses):
    """Fill course name and author on each transaction row."""
    missing = set()
    for row in rows:
        course_id = row.get('course_id') or ''
        course = courses.get(course_id)
        if course is None:
            row['course_name'] = ''
            row['course_author'] = ''
            if course_id:
                missing.add(course_id)
            continue
        row['course_name'] = course['name']
        row['course_author'] = course['author']
    return missing


def write_csv(rows, output_path):
    with open(output_path, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description=(
            'Fetch Stripe payment intents and refunds in a time window and write a CSV '
            'categorized by course id metadata.'
        ),
    )
    parser.add_argument(
        '--start',
        required=True,
        help='Inclusive start. YYYY-MM-DD (UTC) or an ISO-8601 datetime.',
    )
    parser.add_argument(
        '--end',
        required=True,
        help='Inclusive end. YYYY-MM-DD includes that whole UTC day.',
    )
    parser.add_argument(
        '-o',
        '--output',
        default='stripe_transactions.csv',
        help='Destination CSV path (default: stripe_transactions.csv).',
    )
    parser.add_argument(
        '--api-key',
        default=os.environ.get('STRIPE_API_KEY', ''),
        help='Stripe API key. Defaults to the STRIPE_API_KEY environment variable. Prefer a restricted key.',
    )
    parser.add_argument(
        '--status',
        default='succeeded',
        choices=['succeeded', 'all'],
        help='PaymentIntent and refund statuses to include (default: succeeded).',
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    if not args.api_key:
        raise SystemExit('Set STRIPE_API_KEY or pass --api-key. Use a restricted key with PaymentIntents and Refunds read access.')

    created = created_filter(args.start, args.end)
    allowed = None if args.status == 'all' else {args.status}
    client = stripe.StripeClient(args.api_key, stripe_version=API_VERSION)

    try:
        rows, payment_intent_count, refund_count = fetch_transactions(client, created, allowed)
    except stripe.StripeError as exc:
        message = getattr(exc, 'user_message', None) or str(exc)
        raise SystemExit(f'Stripe API error: {message}')

    courses = load_courses(boto3.resource('dynamodb').Table(COURSES_TABLE))
    missing = apply_courses(rows, courses)
    if missing:
        print(
            f'{len(missing)} course ids had no match in {COURSES_TABLE}: {", ".join(sorted(missing))}',
            file=sys.stderr,
        )

    write_csv(rows, args.output)
    print(
        f'Wrote {len(rows)} rows ({payment_intent_count} payment intents, {refund_count} refunds) to {args.output}',
        file=sys.stderr,
    )


if __name__ == '__main__':
    main()
