#!/usr/bin/env python3
import argparse
import csv
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

REPO_ROOT = Path(__file__).resolve().parent.parent
MESSAGES_DIR = REPO_ROOT / 'frontend' / 'messages'
EN_JSON_PATH = MESSAGES_DIR / 'en.json'

REQUIREMENT_FIELDS = (
    'name',
    'shortName',
    'dailyName',
    'description',
    'freeDescription',
    'progressBarSuffix',
)
COURSE_TOP_FIELDS = ('name', 'description')

LOCALE_RE = re.compile(r'^(pseudo|[a-z]{2}(-[A-Z]{2})?)$')
ICU_TOKEN = re.compile(r'{{\s*\w+\s*}}')
ALLOWED_ICU_TOKENS = {'{{time}}', '{{count}}'}
ICU_FIELD_ALLOW = {
    'dailyName': {'{{time}}'},
    'name': {'{{count}}'},
    'description': {'{{count}}'},
}


def en_key_order(node, prefix=''):
    out = []
    if isinstance(node, dict):
        for k, v in node.items():
            if prefix == '' and k == '_translationMeta':
                continue
            key = f'{prefix}.{k}' if prefix else k
            out.extend(en_key_order(v, key))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            out.extend(en_key_order(v, f'{prefix}.{i}'))
    else:
        out.append(prefix)
    return out


def unflatten(rows_ui, locale):
    out = {}
    for row in rows_ui:
        value = row[locale]
        if not value:
            continue
        path = row['key'].split('.')
        cursor = out
        for i, segment in enumerate(path):
            is_last = i == len(path) - 1
            next_segment = path[i + 1] if not is_last else None
            next_is_index = next_segment is not None and next_segment.isdigit()
            if segment.isdigit():
                idx = int(segment)
                if not isinstance(cursor, list):
                    raise ValueError(
                        f'key {row["key"]!r} treats {".".join(path[:i]) or "<root>"} as a list, '
                        f'but earlier rows treated it as a dict'
                    )
                while len(cursor) <= idx:
                    cursor.append(None)
                if is_last:
                    cursor[idx] = value
                else:
                    if cursor[idx] is None:
                        cursor[idx] = [] if next_is_index else {}
                    cursor = cursor[idx]
            else:
                if not isinstance(cursor, dict):
                    raise ValueError(
                        f'key {row["key"]!r} treats {".".join(path[:i]) or "<root>"} as a dict, '
                        f'but earlier rows treated it as a list'
                    )
                if is_last:
                    cursor[segment] = value
                else:
                    if segment not in cursor or cursor[segment] is None:
                        cursor[segment] = [] if next_is_index else {}
                    cursor = cursor[segment]
    return out


def init_requirement_item(content_key):
    return {
        'contentType': 'REQUIREMENT',
        'contentKey': content_key,
        'name': '',
        'shortName': '',
        'dailyName': '',
        'description': '',
        'freeDescription': '',
        'progressBarSuffix': '',
    }


def init_course_item(content_key):
    return {
        'contentType': 'COURSE',
        'contentKey': content_key,
        'name': '',
        'description': '',
        'whatsIncluded': [],
        'chapters': [],
    }


def set_requirement_field(item, field_path, value):
    parts = field_path.split('.')
    if len(parts) == 1 and parts[0] in REQUIREMENT_FIELDS:
        item[parts[0]] = value
        return

    if parts[0] == 'positions' and len(parts) == 2:
        idx = int(parts[1])
        positions = item.setdefault('positions', [])
        while len(positions) <= idx:
            positions.append('')
        positions[idx] = value
        return

    raise ValueError(f'unrecognized requirement field path: {field_path}')


def set_course_field(item, field_path, value):
    parts = field_path.split('.')
    if len(parts) == 1 and parts[0] in ('name', 'description'):
        item[parts[0]] = value
        return

    if parts[0] == 'whatsIncluded' and len(parts) == 2:
        idx = int(parts[1])
        while len(item['whatsIncluded']) <= idx:
            item['whatsIncluded'].append('')
        item['whatsIncluded'][idx] = value
        return

    if parts[0] == 'chapters' and len(parts) >= 3:
        ci = int(parts[1])
        while len(item['chapters']) <= ci:
            item['chapters'].append({'name': '', 'modules': []})
        chapter = item['chapters'][ci]
        if parts[2] == 'name' and len(parts) == 3:
            chapter['name'] = value
            return
        if parts[2] == 'modules' and len(parts) == 5 and parts[4] == 'name':
            mi = int(parts[3])
            while len(chapter['modules']) <= mi:
                chapter['modules'].append({'name': ''})
            chapter['modules'][mi]['name'] = value
            return

    raise ValueError(f'unrecognized course field path: {field_path}')


def build_translation_items(rows_db, locale, updated_by):
    grouped = {}
    for row in rows_db:
        value = row[locale]
        if not value:
            continue
        key = row['key']
        content_key, sep, field_path = key.partition('.')
        if not sep:
            print(f'warning: skipping row with no field path: {key}', file=sys.stderr)
            continue
        if row['source'] == 'requirement':
            item = grouped.setdefault(content_key, init_requirement_item(content_key))
            try:
                set_requirement_field(item, field_path, value)
            except ValueError as e:
                print(f'warning: {e} (key={key})', file=sys.stderr)
        elif row['source'] == 'course':
            item = grouped.setdefault(content_key, init_course_item(content_key))
            try:
                set_course_field(item, field_path, value)
            except ValueError as e:
                print(f'warning: {e} (key={key})', file=sys.stderr)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    items = []
    for item in grouped.values():
        item['locale'] = locale
        item['updatedAt'] = now
        item['updatedBy'] = updated_by
        items.append(item)
    return items


def write_messages_json(out_path, tree):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8') as f:
        json.dump(tree, f, indent=4, ensure_ascii=False)
        f.write('\n')


def write_ddb_seed(path, items):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        f.write('\n')


def apply_items(dynamodb, stage, items):
    table = dynamodb.Table(f'{stage}-translations')
    with table.batch_writer(overwrite_by_pkeys=['locale', 'contentKey']) as batch:
        for item in items:
            batch.put_item(Item=item)
    if items:
        print(f'first contentKey: {items[0]["contentKey"]}')
        print(f'last  contentKey: {items[-1]["contentKey"]}')
    return len(items)


def check_prod_gate(args):
    if args.stage == 'dev':
        return None
    if args.prod_confirmed != args.stage:
        return (f'Refusing --apply against stage={args.stage} without '
                f'--prod-confirmed {args.stage} (got {args.prod_confirmed!r}).')
    return None


def valid_locale(locale):
    return bool(locale) and bool(LOCALE_RE.match(locale))


def validate_seed_items(items):
    if not isinstance(items, list):
        return ['seed root must be a JSON array']

    errors = []
    req_key_re = re.compile(r'^REQUIREMENT#.+$')
    course_key_re = re.compile(r'^COURSE#.+$')

    for i, item in enumerate(items):
        tag = f'item[{i}]'
        if not isinstance(item, dict):
            errors.append(f'{tag}: not an object')
            continue
        content_type = item.get('contentType')
        content_key = item.get('contentKey', '')
        if not valid_locale(item.get('locale', '')):
            errors.append(f'{tag} ({content_key}): invalid locale {item.get("locale")!r}')

        def need_str(field):
            if not isinstance(item.get(field), str):
                errors.append(f'{tag} ({content_key}): {field} must be a string')

        def need_str_array(field, optional):
            value = item.get(field)
            if value is None:
                if not optional:
                    errors.append(f'{tag} ({content_key}): {field} must be an array of strings')
                return
            if not isinstance(value, list) or any(not isinstance(x, str) for x in value):
                errors.append(f'{tag} ({content_key}): {field} must be an array of strings')

        if content_type == 'REQUIREMENT':
            if not req_key_re.match(content_key):
                errors.append(f'{tag}: contentKey must match REQUIREMENT#<id> (got {content_key!r})')
            for field in REQUIREMENT_FIELDS:
                need_str(field)
            need_str_array('positions', optional=True)
        elif content_type == 'COURSE':
            if not course_key_re.match(content_key):
                errors.append(f'{tag}: contentKey must match COURSE#<id> (got {content_key!r})')
            for field in COURSE_TOP_FIELDS:
                need_str(field)
            need_str_array('whatsIncluded', optional=False)
            chapters = item.get('chapters')
            if not isinstance(chapters, list):
                errors.append(f'{tag} ({content_key}): chapters must be an array')
            else:
                for ci, chapter in enumerate(chapters):
                    if not isinstance(chapter, dict) or not isinstance(chapter.get('name'), str):
                        errors.append(f'{tag} ({content_key}): chapters[{ci}].name must be a string')
                    modules = (chapter or {}).get('modules')
                    if not isinstance(modules, list):
                        errors.append(f'{tag} ({content_key}): chapters[{ci}].modules must be an array')
                    else:
                        for mi, module in enumerate(modules):
                            if not isinstance(module, dict) or not isinstance(module.get('name'), str):
                                errors.append(
                                    f'{tag} ({content_key}): chapters[{ci}].modules[{mi}].name must be a string')
        else:
            errors.append(f'{tag} ({content_key}): contentType must be REQUIREMENT or COURSE (got {content_type!r})')

        for field in ('updatedAt', 'updatedBy'):
            if field in item and not isinstance(item[field], str):
                errors.append(f'{tag} ({content_key}): {field} must be a string')

    return errors


def check_icu_consistency(items):
    errors = []

    def scan(content_key, field, value):
        if not isinstance(value, str) or not value:
            return
        if '{' in ICU_TOKEN.sub('', value) or '}' in ICU_TOKEN.sub('', value):
            errors.append(f'{content_key}: {field} has malformed/stray braces: {value!r}')
            return
        tokens = set(ICU_TOKEN.findall(value))
        unknown = tokens - ALLOWED_ICU_TOKENS
        if unknown:
            errors.append(f'{content_key}: {field} has unknown placeholder(s) {sorted(unknown)}: {value!r}')
        allowed_here = ICU_FIELD_ALLOW.get(field)
        if allowed_here is not None and tokens - allowed_here:
            errors.append(f'{content_key}: {field} may only use {sorted(allowed_here)}, found {sorted(tokens)}')

    for item in items:
        content_key = item.get('contentKey', '?')
        if item.get('contentType') == 'REQUIREMENT':
            for field in REQUIREMENT_FIELDS:
                scan(content_key, field, item.get(field, ''))
            for j, position in enumerate(item.get('positions') or []):
                scan(content_key, f'positions[{j}]', position)
        elif item.get('contentType') == 'COURSE':
            for field in COURSE_TOP_FIELDS:
                scan(content_key, field, item.get(field, ''))
            for j, included in enumerate(item.get('whatsIncluded') or []):
                scan(content_key, f'whatsIncluded[{j}]', included)
            for ci, chapter in enumerate(item.get('chapters') or []):
                scan(content_key, f'chapters[{ci}].name', (chapter or {}).get('name', ''))
                for mi, module in enumerate((chapter or {}).get('modules') or []):
                    scan(content_key, f'chapters[{ci}].modules[{mi}].name', (module or {}).get('name', ''))

    return errors


def normalize_item(item):
    content_type = item.get('contentType')
    if content_type == 'REQUIREMENT':
        norm = {field: (item.get(field) or '') for field in REQUIREMENT_FIELDS}
        norm['positions'] = list(item.get('positions') or [])
    elif content_type == 'COURSE':
        norm = {field: (item.get(field) or '') for field in COURSE_TOP_FIELDS}
        norm['whatsIncluded'] = list(item.get('whatsIncluded') or [])
        norm['chapters'] = [
            {
                'name': (chapter or {}).get('name') or '',
                'modules': [{'name': (module or {}).get('name') or ''}
                            for module in ((chapter or {}).get('modules') or [])],
            }
            for chapter in (item.get('chapters') or [])
        ]
    else:
        norm = {}
    norm['contentType'] = content_type
    norm['contentKey'] = item.get('contentKey')
    norm['locale'] = item.get('locale')
    return norm


def items_differ(seed_item, existing_item):
    if existing_item is None:
        return True
    return normalize_item(seed_item) != normalize_item(existing_item)


def report_mismatches(items, existing, stage):
    mismatches = [item['contentKey'] for item in items
                  if items_differ(item, existing.get(item['contentKey']))]
    if mismatches:
        print(f'VERIFY FAILED: {len(mismatches)} item(s) differ from {stage}-translations:', file=sys.stderr)
        for key in mismatches[:50]:
            print(f'  - {key}', file=sys.stderr)
        if len(mismatches) > 50:
            print(f'  ... and {len(mismatches) - 50} more', file=sys.stderr)
    return mismatches


def fetch_existing_translations(dynamodb, stage, locale):
    table = dynamodb.Table(f'{stage}-translations')
    items = {}
    kwargs = {'KeyConditionExpression': Key('locale').eq(locale)}
    while True:
        resp = table.query(**kwargs)
        for item in resp.get('Items', []):
            items[item['contentKey']] = item
        if 'LastEvaluatedKey' not in resp:
            return items
        kwargs['ExclusiveStartKey'] = resp['LastEvaluatedKey']


def restamp(items, updated_by):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for item in items:
        item['updatedAt'] = now
        item['updatedBy'] = updated_by
    return items


def warn_if_seed_dirty(seed_path):
    try:
        result = subprocess.run(
            ['git', 'status', '--porcelain', '--', str(seed_path)],
            cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=10)
        if result.stdout.strip():
            print(f'warning: {seed_path} has uncommitted git changes; applying anyway.', file=sys.stderr)
    except Exception as e:
        print(f'warning: could not check git status of seed ({e}); continuing.', file=sys.stderr)


def run_seed_apply(args):
    if args.ddb_out:
        print('--ddb-out is a CSV-mode flag; ignored with --seed-in.', file=sys.stderr)
    if args.verify and args.apply:
        print('Use either --verify or --apply, not both.', file=sys.stderr)
        return 2
    if args.no_verify and not args.apply:
        print('--no-verify only applies to --apply.', file=sys.stderr)
        return 2

    seed_path = Path(args.seed_in)
    try:
        with seed_path.open(encoding='utf-8') as f:
            items = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f'Failed to read seed {seed_path}: {e}', file=sys.stderr)
        return 2

    errors = validate_seed_items(items)
    if errors:
        print(f'Seed schema validation failed ({len(errors)} error(s)):', file=sys.stderr)
        for error in errors:
            print(f'  - {error}', file=sys.stderr)
        return 2

    icu_errors = check_icu_consistency(items)
    if icu_errors:
        print(f'ICU placeholder check failed ({len(icu_errors)} error(s)):', file=sys.stderr)
        for error in icu_errors:
            print(f'  - {error}', file=sys.stderr)
        return 2

    locales = {item.get('locale') for item in items}
    if len(locales) != 1:
        print(f'Seed mixes locales: {sorted(locales)}', file=sys.stderr)
        return 2
    locale = next(iter(locales))
    if locale == 'en':
        print('Refusing to import into the source locale (en).', file=sys.stderr)
        return 2
    if args.locale and args.locale != locale:
        print(f'--locale {args.locale} != seed locale {locale}.', file=sys.stderr)
        return 2

    requirements = sum(1 for item in items if item['contentType'] == 'REQUIREMENT')
    courses = sum(1 for item in items if item['contentType'] == 'COURSE')
    print(f'Seed: {len(items)} items (REQUIREMENT={requirements} COURSE={courses}) locale={locale}')
    print('Schema OK. ICU OK.')

    if not (args.apply or args.verify or args.only_changed):
        print('No --apply/--verify/--only-changed: validation only. Done.')
        return 0

    if args.apply:
        gate_error = check_prod_gate(args)
        if gate_error:
            print(gate_error, file=sys.stderr)
            return 2
        if not args.updated_by and not args.dry_run:
            print('--updated-by is required when --apply.', file=sys.stderr)
            return 2

    dynamodb = boto3.resource('dynamodb', region_name=args.region)
    existing = fetch_existing_translations(dynamodb, args.stage, locale)
    print(f'Existing rows in {args.stage}-translations for {locale}: {len(existing)}')

    if args.verify:
        if report_mismatches(items, existing, args.stage):
            return 1
        print(f'VERIFY OK: all {len(items)} seed items match {args.stage}-translations.')
        return 0

    to_write = items
    if args.only_changed:
        to_write = [item for item in items if items_differ(item, existing.get(item['contentKey']))]
        print(f'--only-changed: {len(to_write)}/{len(items)} items differ and will be written.')

    if args.dry_run:
        print(f'--dry-run: would write {len(to_write)} item(s) to {args.stage}-translations. No writes.')
        return 0
    if not args.apply:
        print(f'{len(to_write)}/{len(items)} item(s) differ from {args.stage}-translations. '
              f'Pass --apply to write.')
        return 0

    if not to_write:
        print('Nothing to write (0 items).')
        return 0

    restamp(to_write, args.updated_by)
    warn_if_seed_dirty(seed_path)
    applied = apply_items(dynamodb, args.stage, to_write)
    print(f'Applied {applied} items to {args.stage}-translations')

    if args.no_verify:
        print('Skipped post-apply verify (--no-verify).')
        return 0
    existing_after = fetch_existing_translations(dynamodb, args.stage, locale)
    if report_mismatches(items, existing_after, args.stage):
        return 1
    print(f'Post-apply verify OK: all {len(items)} seed items match {args.stage}-translations.')
    return 0


def main():
    parser = argparse.ArgumentParser(
        description='Import translations: build from a filled CSV, or apply a prebuilt seed JSON.')
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--csv', help='Path to filled CSV (build messages + DDB items).')
    source.add_argument('--seed-in',
                        help='Path to a prebuilt seed JSON array; apply directly to ${stage}-translations.')
    parser.add_argument('--stage', required=True,
                        help='DynamoDB stage. Non-dev --apply requires --prod-confirmed <stage>.')
    parser.add_argument('--locale',
                        help='Target locale. Required for --csv; for --seed-in it is validated against the seed.')
    parser.add_argument('--updated-by', help='Audit field for DDB updatedBy. Required if --apply or --ddb-out.')
    parser.add_argument('--ddb-out', help='(CSV mode) Write the DDB seed JSON to this path.')
    parser.add_argument('--apply', action='store_true',
                        help='BatchWriteItem into ${stage}-translations. Non-dev requires --prod-confirmed.')
    parser.add_argument('--prod-confirmed', metavar='STAGE',
                        help='Confirm writes to a non-dev stage. Value MUST equal --stage (e.g. --prod-confirmed prod).')
    parser.add_argument('--only-changed', action='store_true',
                        help='(--seed-in) Write only items that differ from existing ${stage}-translations rows.')
    parser.add_argument('--verify', action='store_true',
                        help='(--seed-in) Diff seed against ${stage}-translations (ignoring provenance); '
                             'exit nonzero on mismatch. No writes.')
    parser.add_argument('--no-verify', action='store_true',
                        help='(--seed-in --apply) Skip the default post-apply seed<->table verification.')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print summary; write no files; do not apply.')
    parser.add_argument('--region', default=os.environ.get('AWS_REGION', 'us-east-1'))
    args = parser.parse_args()

    if args.seed_in:
        return run_seed_apply(args)

    if not args.locale:
        print('--locale is required in CSV mode.', file=sys.stderr)
        return 2
    if args.only_changed or args.verify or args.no_verify:
        print('--only-changed/--verify/--no-verify are only valid with --seed-in.', file=sys.stderr)
        return 2

    locale = args.locale
    if locale == 'en':
        print('Refusing to import into the source locale (en).', file=sys.stderr)
        return 2
    if args.apply:
        gate_error = check_prod_gate(args)
        if gate_error:
            print(gate_error, file=sys.stderr)
            return 2
    if (args.apply or args.ddb_out) and not args.updated_by and not args.dry_run:
        print('--updated-by is required when --apply or --ddb-out is set.', file=sys.stderr)
        return 2

    csv_path = Path(args.csv)
    with csv_path.open(encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        required_cols = {'source', 'key', 'english', locale}
        missing_cols = required_cols - set(fieldnames)
        if missing_cols:
            print(f'CSV is missing required column(s): {sorted(missing_cols)}. Header: {fieldnames}', file=sys.stderr)
            return 2
        rows = list(reader)

    if not rows:
        print(f'No rows in {csv_path}', file=sys.stderr)
        return 2

    rows_ui = [r for r in rows if r['source'] == 'ui']
    rows_db = [r for r in rows if r['source'] in ('requirement', 'course')]

    with EN_JSON_PATH.open(encoding='utf-8') as f:
        en_tree = json.load(f)
    en_order = {k: i for i, k in enumerate(en_key_order(en_tree))}
    rows_ui.sort(key=lambda r: en_order.get(r['key'], len(en_order)))

    filled_ui = sum(1 for r in rows_ui if r[locale])
    filled_db = sum(1 for r in rows_db if r[locale])

    print(f'Total rows: {len(rows)} (ui={len(rows_ui)} db={len(rows_db)})')
    print(f'Filled:     ui={filled_ui}/{len(rows_ui)}  db={filled_db}/{len(rows_db)}')

    if args.dry_run:
        print('--dry-run: no files written, no DDB writes.')
        return 0

    if rows_ui:
        msg_path = MESSAGES_DIR / f'{locale}.json'
        write_messages_json(msg_path, unflatten(rows_ui, locale))
        print(f'Wrote {msg_path}')
    else:
        print('Skipped messages JSON: no UI rows in CSV.')

    items = build_translation_items(rows_db, locale, args.updated_by or '')
    print(f'Built {len(items)} DDB items')

    if args.ddb_out:
        seed_path = Path(args.ddb_out)
        write_ddb_seed(seed_path, items)
        print(f'Wrote DDB seed to {seed_path}')

    if args.apply:
        dynamodb = boto3.resource('dynamodb', region_name=args.region)
        applied = apply_items(dynamodb, args.stage, items)
        print(f'Applied {applied} items to {args.stage}-translations')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
