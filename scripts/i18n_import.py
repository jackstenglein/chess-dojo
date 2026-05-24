#!/usr/bin/env python3
import argparse
import csv
import datetime
import json
import os
import sys
from pathlib import Path

import boto3

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


def batch_write(dynamodb, stage, items):
    table = dynamodb.Table(f'{stage}-translations')
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)


def main():
    parser = argparse.ArgumentParser(description='Import a filled translation CSV.')
    parser.add_argument('--csv', required=True, help='Path to filled CSV.')
    parser.add_argument('--stage', required=True, help='DynamoDB stage (dev required for --apply).')
    parser.add_argument('--locale', required=True, help='Target locale (e.g. de, pseudo).')
    parser.add_argument('--updated-by', help='Audit field for DDB updatedBy. Required if --apply or --ddb-out.')
    parser.add_argument('--ddb-out', help='Write the DDB seed JSON to this path.')
    parser.add_argument('--apply', action='store_true',
                        help='BatchWriteItem the seed into ${stage}-translations. Dev-only.')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print summary; write no files; do not apply.')
    parser.add_argument('--region', default=os.environ.get('AWS_REGION', 'us-east-1'))
    args = parser.parse_args()

    locale = args.locale
    if locale == 'en':
        print('Refusing to import into the source locale (en).', file=sys.stderr)
        return 2
    if args.apply and args.stage != 'dev':
        print(f'Refusing --apply against stage={args.stage}. Dev-only.', file=sys.stderr)
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
        batch_write(dynamodb, args.stage, items)
        print(f'Applied {len(items)} items to {args.stage}-translations')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
