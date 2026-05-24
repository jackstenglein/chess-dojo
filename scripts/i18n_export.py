#!/usr/bin/env python3
import argparse
import csv
import json
import os
import sys
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

REPO_ROOT = Path(__file__).resolve().parent.parent
EN_JSON_PATH = REPO_ROOT / 'frontend' / 'messages' / 'en.json'

REQUIREMENT_FIELDS = (
    'name',
    'shortName',
    'dailyName',
    'description',
    'freeDescription',
    'progressBarSuffix',
)
COURSE_TOP_FIELDS = ('name', 'description')


def flatten_dict(obj, prefix=''):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if prefix == '' and k == '_translationMeta':
                continue
            key = f'{prefix}.{k}' if prefix else k
            out.update(flatten_dict(v, key))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out.update(flatten_dict(v, f'{prefix}.{i}'))
    elif obj is None:
        out[prefix] = ''
    elif isinstance(obj, str):
        out[prefix] = obj
    else:
        print(f'warning: skipping non-string leaf at {prefix}: {obj!r}', file=sys.stderr)
    return out


def load_json(path):
    if not path.exists():
        return {}
    with path.open(encoding='utf-8') as f:
        return json.load(f)


def scan_table(table):
    items = []
    kwargs = {}
    while True:
        resp = table.scan(**kwargs)
        items.extend(resp.get('Items', []))
        if 'LastEvaluatedKey' not in resp:
            return items
        kwargs['ExclusiveStartKey'] = resp['LastEvaluatedKey']


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


def rows_for_ui(en_flat, existing_flat, locale, pseudo_fill):
    for key in sorted(en_flat.keys()):
        english = en_flat[key]
        existing = existing_flat.get(key, '')
        target = ('[T] ' + english) if pseudo_fill else existing
        yield {
            'source': 'ui',
            'key': key,
            'english': english,
            'existing': existing,
            locale: target,
        }


def rows_for_requirement(req, existing_translations, locale, pseudo_fill):
    content_key = f'REQUIREMENT#{req["id"]}'
    existing_row = existing_translations.get(content_key, {})
    for field in REQUIREMENT_FIELDS:
        english = req.get(field, '') or ''
        if not english:
            continue
        existing = existing_row.get(field, '') or ''
        target = ('[T] ' + english) if pseudo_fill else existing
        yield {
            'source': 'requirement',
            'key': f'{content_key}.{field}',
            'english': english,
            'existing': existing,
            locale: target,
        }

    existing_positions = existing_row.get('positions', []) or []
    for i, position in enumerate(req.get('positions', []) or []):
        english = (position.get('title', '') or '') if isinstance(position, dict) else ''
        if not english:
            continue
        existing = existing_positions[i] if i < len(existing_positions) else ''
        target = ('[T] ' + english) if pseudo_fill else existing
        yield {
            'source': 'requirement',
            'key': f'{content_key}.positions.{i}',
            'english': english,
            'existing': existing,
            locale: target,
        }


def rows_for_course(course, existing_translations, locale, pseudo_fill):
    content_key = f'COURSE#{course["id"]}'
    existing_row = existing_translations.get(content_key, {})

    for field in COURSE_TOP_FIELDS:
        english = course.get(field, '') or ''
        if not english:
            continue
        existing = existing_row.get(field, '') or ''
        target = ('[T] ' + english) if pseudo_fill else existing
        yield {
            'source': 'course',
            'key': f'{content_key}.{field}',
            'english': english,
            'existing': existing,
            locale: target,
        }

    for i, item in enumerate(course.get('whatsIncluded', []) or []):
        english = item if isinstance(item, str) else ''
        if not english:
            continue
        existing_list = existing_row.get('whatsIncluded', []) or []
        existing = existing_list[i] if i < len(existing_list) else ''
        target = ('[T] ' + english) if pseudo_fill else existing
        yield {
            'source': 'course',
            'key': f'{content_key}.whatsIncluded.{i}',
            'english': english,
            'existing': existing,
            locale: target,
        }

    for ci, chapter in enumerate(course.get('chapters', []) or []):
        existing_chapters = existing_row.get('chapters', []) or []
        existing_chapter = existing_chapters[ci] if ci < len(existing_chapters) else {}

        ch_name = chapter.get('name', '') or ''
        if ch_name:
            existing = existing_chapter.get('name', '') if isinstance(existing_chapter, dict) else ''
            target = ('[T] ' + ch_name) if pseudo_fill else (existing or '')
            yield {
                'source': 'course',
                'key': f'{content_key}.chapters.{ci}.name',
                'english': ch_name,
                'existing': existing or '',
                locale: target,
            }

        existing_modules = (
            existing_chapter.get('modules', []) or []
        ) if isinstance(existing_chapter, dict) else []
        for mi, module in enumerate(chapter.get('modules', []) or []):
            mod_name = module.get('name', '') or ''
            if not mod_name:
                continue
            existing_module = existing_modules[mi] if mi < len(existing_modules) else {}
            existing = existing_module.get('name', '') if isinstance(existing_module, dict) else ''
            target = ('[T] ' + mod_name) if pseudo_fill else (existing or '')
            yield {
                'source': 'course',
                'key': f'{content_key}.chapters.{ci}.modules.{mi}.name',
                'english': mod_name,
                'existing': existing or '',
                locale: target,
            }


def main():
    parser = argparse.ArgumentParser(description='Export translatable chess-dojo content to CSV.')
    parser.add_argument('--stage', required=True, help='DynamoDB stage prefix (dev, prod, ...).')
    parser.add_argument('--locale', required=True, help='Target locale code (e.g. de, pseudo).')
    parser.add_argument('--out', required=True, help='Output CSV path.')
    parser.add_argument('--pseudo-fill', action='store_true',
                        help='Fill target column with "[T] " + english (deterministic, no MT).')
    parser.add_argument('--skip-db', action='store_true', help='Skip DDB; UI strings only.')
    parser.add_argument('--scan-prod-confirmed', action='store_true',
                        help='Required to Scan ${prod}-requirements / ${prod}-courses. Translation table queries are always allowed (read-only, small).')
    parser.add_argument('--region', default=os.environ.get('AWS_REGION', 'us-east-1'))
    args = parser.parse_args()

    locale = args.locale
    if locale == 'en':
        print('Refusing to export the source locale (en).', file=sys.stderr)
        return 2

    en = flatten_dict(load_json(EN_JSON_PATH))
    if not en:
        print(f'No UI strings found in {EN_JSON_PATH}', file=sys.stderr)
        return 2

    existing_locale_path = REPO_ROOT / 'frontend' / 'messages' / f'{locale}.json'
    existing_ui = flatten_dict(load_json(existing_locale_path))

    rows = list(rows_for_ui(en, existing_ui, locale, args.pseudo_fill))

    if not args.skip_db:
        dynamodb = boto3.resource('dynamodb', region_name=args.region)
        existing_translations = fetch_existing_translations(dynamodb, args.stage, locale)
        if args.stage.startswith('prod') and not args.scan_prod_confirmed:
            print(f'Refusing to scan {args.stage}-requirements/courses without --scan-prod-confirmed.', file=sys.stderr)
            return 2
        for req in scan_table(dynamodb.Table(f'{args.stage}-requirements')):
            rows.extend(rows_for_requirement(req, existing_translations, locale, args.pseudo_fill))
        for course in scan_table(dynamodb.Table(f'{args.stage}-courses')):
            rows.extend(rows_for_course(course, existing_translations, locale, args.pseudo_fill))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['source', 'key', 'english', 'existing', locale])
        writer.writeheader()
        writer.writerows(rows)

    print(f'Wrote {len(rows)} rows to {out_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
