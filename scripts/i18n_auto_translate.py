#!/usr/bin/env python3
"""Auto-translate frontend/messages locale JSON files from en.json.

Mirrors en.json structure into target locale files, translating string leaves while
respecting _translationMeta.skipAutoTranslate and preserveStructure rules.
"""
import argparse
import html
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

try:
    import certifi
except ImportError:
    certifi = None

REPO_ROOT = Path(__file__).resolve().parent.parent
MESSAGES_DIR = REPO_ROOT / 'frontend' / 'messages'
EN_JSON_PATH = MESSAGES_DIR / 'en.json'
SOURCE_LOCALE = 'en'
DEFAULT_TARGET_LOCALES = ('pseudo', 'de', 'es', 'pt')
PSEUDO_PREFIX = '[T] '

GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'
GOOGLE_BATCH_SIZE = 100

TEMPLATE_RE = re.compile(r'\{\{[A-Za-z_][A-Za-z0-9_]*\}\}')
OPEN_TAG_RE = re.compile(r'<([a-zA-Z][a-zA-Z0-9]*)>')
CLOSE_TAG_RE = re.compile(r'</([a-zA-Z][a-zA-Z0-9]*)>')
SIMPLE_VAR_RE = re.compile(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}')
ICU_HEADER_RE = re.compile(r'^([a-zA-Z_][a-zA-Z0-9_]*),\s*(plural|select)\s*,\s*(.*)$', re.DOTALL)
ICU_OPTION_KEY_RE = re.compile(r'^(\w+|=[0-9]+|other|zero|one|two|few|many)\s+')


def ssl_context() -> ssl.SSLContext:
    """CA bundle for HTTPS. macOS python.org builds often lack system certs without this."""
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding='utf-8') as f:
        return json.load(f)


def write_messages_json(path: Path, tree: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(tree, f, indent=4, ensure_ascii=False)
        f.write('\n')


def get_skip_paths(en_tree: dict) -> set[str]:
    meta = en_tree.get('_translationMeta') or {}
    skip = meta.get('skipAutoTranslate') or {}
    return set(skip.keys())


def should_skip_auto_translate(key_path: str, skip_paths: set[str]) -> bool:
    for skip_prefix in skip_paths:
        if key_path == skip_prefix or key_path.startswith(skip_prefix + '.'):
            return True
    return False


def is_empty_value(value) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == '')


def parse_brace_block(text: str, start: int) -> tuple[str, int]:
    if start >= len(text) or text[start] != '{':
        raise ValueError(f'expected {{ at index {start}')
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return text[start:i + 1], i + 1
        i += 1
    raise ValueError(f'unmatched {{ at index {start}')


def is_icu_block(block: str) -> bool:
    inner = block[1:-1]
    return bool(ICU_HEADER_RE.match(inner))


def parse_icu_options(options_str: str) -> list[tuple[str, str]]:
    options = []
    pos = 0
    length = len(options_str)
    while pos < length:
        while pos < length and options_str[pos].isspace():
            pos += 1
        if pos >= length:
            break
        remaining = options_str[pos:]
        key_match = ICU_OPTION_KEY_RE.match(remaining)
        if not key_match:
            raise ValueError(f'could not parse ICU option key at {pos}: {remaining[:40]!r}')
        key = key_match.group(1)
        pos += key_match.end()
        while pos < length and options_str[pos].isspace():
            pos += 1
        if pos >= length or options_str[pos] != '{':
            raise ValueError(f'expected value block after ICU option {key!r}')
        block, end = parse_brace_block(options_str, pos)
        options.append((key, block[1:-1]))
        pos = end
    return options


def translate_icu_inner(text: str, translate_fn) -> str:
    if re.search(r'\{[a-zA-Z_][a-zA-Z0-9_]*,\s*(plural|select)\s*,', text):
        return translate_message(text, translate_fn)
    return translate_tags_and_text(text, translate_fn)


def translate_icu_block(block: str, translate_fn) -> str:
    inner = block[1:-1]
    header = ICU_HEADER_RE.match(inner)
    if not header:
        return block
    var_name, kind, options_str = header.group(1), header.group(2), header.group(3)
    try:
        options = parse_icu_options(options_str)
    except ValueError:
        return block
    translated_options = []
    for key, value in options:
        translated_value = translate_icu_inner(value, translate_fn)
        translated_options.append(f'{key} {{{translated_value}}}')
    return '{' + f'{var_name}, {kind}, ' + ' '.join(translated_options) + '}'


def mask_templates(text: str, tokens: list[str]) -> str:
    def repl(match):
        tokens.append(match.group(0))
        return f'__PH_{len(tokens) - 1}__'
    return TEMPLATE_RE.sub(repl, text)


def mask_simple_vars(text: str, tokens: list[str]) -> str:
    def repl(match):
        tokens.append(match.group(0))
        return f'__PH_{len(tokens) - 1}__'
    return SIMPLE_VAR_RE.sub(repl, text)


def unmask_tokens(text: str, tokens: list[str]) -> str:
    for i, token in enumerate(tokens):
        text = text.replace(f'__PH_{i}__', token)
    return text


def translate_plain_segment(text: str, translate_fn) -> str:
    if not text:
        return text
    tokens: list[str] = []
    masked = mask_templates(text, tokens)
    masked = mask_simple_vars(masked, tokens)
    if masked.strip() == '':
        return text
    translated = translate_fn(masked)
    return unmask_tokens(translated, tokens)


def translate_tags_and_text(text: str, translate_fn) -> str:
    parts = re.split(r'(<[^>]+>)', text)
    out = []
    for part in parts:
        if not part:
            continue
        if part.startswith('<') and part.endswith('>'):
            out.append(part)
        else:
            out.append(translate_plain_segment(part, translate_fn))
    return ''.join(out)


def find_icu_blocks(text: str) -> list[tuple[int, int, str]]:
    blocks = []
    pos = 0
    while pos < len(text):
        brace = text.find('{', pos)
        if brace == -1:
            break
        try:
            block, end = parse_brace_block(text, brace)
        except ValueError:
            pos = brace + 1
            continue
        if is_icu_block(block):
            blocks.append((brace, end, block))
            pos = end
        else:
            pos = brace + 1
    return blocks


def translate_message(text: str, translate_fn) -> str:
    if not text:
        return text
    icu_blocks = find_icu_blocks(text)
    if not icu_blocks:
        return translate_tags_and_text(text, translate_fn)

    result = []
    last = 0
    for start, end, block in icu_blocks:
        if start > last:
            result.append(translate_tags_and_text(text[last:start], translate_fn))
        result.append(translate_icu_block(block, translate_fn))
        last = end
    if last < len(text):
        result.append(translate_tags_and_text(text[last:], translate_fn))
    return ''.join(result)


def pseudo_translate(text: str) -> str:
    return PSEUDO_PREFIX + text


def extract_placeholders(text: str) -> dict:
    variables = set(SIMPLE_VAR_RE.findall(text))
    templates = {match.group(0) for match in TEMPLATE_RE.finditer(text)}
    tags: dict[str, dict[str, int]] = {}
    for match in OPEN_TAG_RE.finditer(text):
        name = match.group(1)
        entry = tags.setdefault(name, {'open': 0, 'close': 0})
        entry['open'] += 1
    for match in CLOSE_TAG_RE.finditer(text):
        name = match.group(1)
        entry = tags.setdefault(name, {'open': 0, 'close': 0})
        entry['close'] += 1
    return {'variables': variables, 'templates': templates, 'tags': tags}


def validate_placeholders(source: str, target: str) -> list[str]:
    if not target:
        return []
    src = extract_placeholders(source)
    tgt = extract_placeholders(target)
    errors = []
    for var in src['variables']:
        if var not in tgt['variables']:
            errors.append(f'missing variable {{{var}}}')
    for var in tgt['variables']:
        if var not in src['variables']:
            errors.append(f'extra variable {{{var}}}')
    for tpl in src['templates']:
        if tpl not in tgt['templates']:
            errors.append(f'missing template {tpl}')
    for tpl in tgt['templates']:
        if tpl not in src['templates']:
            errors.append(f'extra template {tpl}')
    for tag_name, src_counts in src['tags'].items():
        tgt_counts = tgt['tags'].get(tag_name, {'open': 0, 'close': 0})
        if tgt_counts['open'] != src_counts['open']:
            errors.append(f'<{tag_name}> count mismatch')
        if tgt_counts['close'] != src_counts['close']:
            errors.append(f'</{tag_name}> count mismatch')
    for tag_name in tgt['tags']:
        if tag_name not in src['tags']:
            errors.append(f'extra <{tag_name}> tag')
    return errors


@dataclass
class PlannedChange:
    key: str
    english: str
    previous: str
    translated: str
    reason: str


@dataclass
class LocalePlan:
    locale: str
    kept_existing: int = 0
    copied_english: int = 0
    changes: list[PlannedChange] = field(default_factory=list)
    validation_errors: list[str] = field(default_factory=list)


class GoogleTranslator:
    def __init__(self, api_key: str, target_locale: str):
        self.api_key = api_key
        self.target_locale = target_locale
        self._cache: dict[str, str] = {}

    def __call__(self, text: str) -> str:
        if text in self._cache:
            return self._cache[text]
        translated = self._translate_batch([text])[0]
        self._cache[text] = translated
        return translated

    def prefetch(self, texts: list[str]) -> None:
        pending = [t for t in texts if t and t not in self._cache]
        for i in range(0, len(pending), GOOGLE_BATCH_SIZE):
            batch = pending[i:i + GOOGLE_BATCH_SIZE]
            results = self._translate_batch(batch)
            for src, dst in zip(batch, results):
                self._cache[src] = dst

    def _translate_batch(self, texts: list[str]) -> list[str]:
        if not texts:
            return []
        query = urllib.parse.urlencode({
            'key': self.api_key,
            'source': SOURCE_LOCALE,
            'target': self.target_locale,
            'format': 'text',
        })
        url = f'{GOOGLE_TRANSLATE_URL}?{query}'
        body = json.dumps({'q': texts}).encode('utf-8')
        request = urllib.request.Request(
            url,
            data=body,
            method='POST',
            headers={'Content-Type': 'application/json'},
        )
        try:
            with urllib.request.urlopen(request, timeout=60, context=ssl_context()) as response:
                data = json.load(response)
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', errors='replace')
            raise RuntimeError(f'Google Translate API error ({e.code}): {detail}') from e
        except urllib.error.URLError as e:
            reason = getattr(e, 'reason', e)
            if isinstance(reason, ssl.SSLCertVerificationError) or 'CERTIFICATE_VERIFY_FAILED' in str(e):
                hint = ('pip install certifi' if certifi is None else
                        'SSL verification failed; certifi is installed but may be outdated '
                        '(try: pip install -U certifi)')
                raise RuntimeError(
                    f'Google Translate API SSL verification failed: {reason}. {hint}') from e
            raise RuntimeError(f'Google Translate API request failed: {e}') from e

        translations = data.get('data', {}).get('translations', [])
        if len(translations) != len(texts):
            raise RuntimeError(
                f'Google Translate API returned {len(translations)} results for {len(texts)} inputs')
        return [html.unescape(item.get('translatedText', '')) for item in translations]


def collect_translation_units(en_node, existing_node, key_path, skip_paths, overwrite_existing):
    units = []

    def walk(en_value, existing_value, path):
        if isinstance(en_value, dict):
            existing_dict = existing_value if isinstance(existing_value, dict) else {}
            for child_key, child_en in en_value.items():
                if path == '' and child_key == '_translationMeta':
                    continue
                child_path = f'{path}.{child_key}' if path else child_key
                walk(child_en, existing_dict.get(child_key), child_path)
            return
        if isinstance(en_value, list):
            existing_list = existing_value if isinstance(existing_value, list) else []
            for idx, child_en in enumerate(en_value):
                child_path = f'{path}.{idx}'
                existing_child = existing_list[idx] if idx < len(existing_list) else None
                walk(child_en, existing_child, child_path)
            return
        if not isinstance(en_value, str):
            return

        if should_skip_auto_translate(path, skip_paths):
            units.append((path, en_value, existing_value, 'skip'))
            return

        if not overwrite_existing and not is_empty_value(existing_value):
            units.append((path, en_value, existing_value, 'keep'))
            return

        units.append((path, en_value, existing_value, 'translate'))

    walk(en_node, existing_node, key_path)
    return units


def plan_locale(locale: str, en_tree: dict, skip_paths: set[str], overwrite_existing: bool) -> LocalePlan:
    existing_path = MESSAGES_DIR / f'{locale}.json'
    existing_tree = load_json(existing_path)
    plan = LocalePlan(locale=locale)
    units = collect_translation_units(en_tree, existing_tree, '', skip_paths, overwrite_existing)

    for key_path, english, existing_value, action in units:
        previous = existing_value if isinstance(existing_value, str) else ''
        if action == 'keep':
            plan.kept_existing += 1
            continue
        if action == 'skip':
            plan.copied_english += 1
            if overwrite_existing or is_empty_value(existing_value) or existing_value != english:
                plan.changes.append(PlannedChange(
                    key=key_path,
                    english=english,
                    previous=previous,
                    translated=english,
                    reason='skipAutoTranslate',
                ))
            continue
        plan.changes.append(PlannedChange(
            key=key_path,
            english=english,
            previous=previous,
            translated='',
            reason='new' if is_empty_value(existing_value) else 'overwrite',
        ))

    return plan


def execute_translations(plan: LocalePlan, locale: str, translator: GoogleTranslator | None) -> None:
    pending = [change for change in plan.changes if change.reason != 'skipAutoTranslate']
    if locale != 'pseudo' and translator is not None:
        plain_segments: list[str] = []

        def collect_plain(text: str) -> None:
            parts = re.split(r'(<[^>]+>)', text)
            for part in parts:
                if not part or (part.startswith('<') and part.endswith('>')):
                    continue
                tokens: list[str] = []
                masked = mask_simple_vars(mask_templates(part, tokens), tokens)
                if masked.strip():
                    plain_segments.append(masked)

        for change in pending:
            collect_plain(change.english)
            for _, _, block in find_icu_blocks(change.english):
                inner = block[1:-1]
                header = ICU_HEADER_RE.match(inner)
                if not header:
                    continue
                try:
                    for _, value in parse_icu_options(header.group(3)):
                        collect_plain(value)
                except ValueError:
                    pass
        translator.prefetch(list(dict.fromkeys(plain_segments)))

    for change in pending:
        if locale == 'pseudo':
            change.translated = pseudo_translate(change.english)
        else:
            change.translated = translate_message(change.english, translator)
        for err in validate_placeholders(change.english, change.translated):
            plan.validation_errors.append(f'{change.key}: {err}')


def apply_plan_to_tree(en_tree: dict, existing_tree: dict, plan: LocalePlan, skip_paths: set[str],
                       overwrite_existing: bool) -> dict:
    changes_by_key = {change.key: change.translated for change in plan.changes}

    def resolve(path, english, existing_value):
        if should_skip_auto_translate(path, skip_paths):
            return english
        if not overwrite_existing and not is_empty_value(existing_value):
            return existing_value
        return changes_by_key.get(path, english)

    def walk(en_value, existing_value, path):
        if isinstance(en_value, dict):
            existing_dict = existing_value if isinstance(existing_value, dict) else {}
            out = {}
            for child_key, child_en in en_value.items():
                if path == '' and child_key == '_translationMeta':
                    out[child_key] = child_en
                    continue
                child_path = f'{path}.{child_key}' if path else child_key
                out[child_key] = walk(child_en, existing_dict.get(child_key), child_path)
            return out
        if isinstance(en_value, list):
            existing_list = existing_value if isinstance(existing_value, list) else []
            out = []
            for idx, child_en in enumerate(en_value):
                child_path = f'{path}.{idx}'
                existing_child = existing_list[idx] if idx < len(existing_list) else None
                out.append(walk(child_en, existing_child, child_path))
            return out
        if isinstance(en_value, str):
            return resolve(path, en_value, existing_value)
        return en_value

    return walk(en_tree, existing_tree, '')


def print_plan_summary(plan: LocalePlan, apply: bool) -> None:
    new_count = sum(1 for c in plan.changes if c.reason == 'new')
    overwrite_count = sum(1 for c in plan.changes if c.reason == 'overwrite')
    skip_count = sum(1 for c in plan.changes if c.reason == 'skipAutoTranslate')

    print(f'\n=== {plan.locale}.json ===')
    print(f'Kept existing: {plan.kept_existing}')
    print(f'Copied English (skipAutoTranslate): {skip_count}')
    print(f'New translations: {new_count}')
    print(f'Overwritten translations: {overwrite_count}')
    if plan.validation_errors:
        print(f'Validation warnings: {len(plan.validation_errors)}')
        for err in plan.validation_errors[:20]:
            print(f'  - {err}')
        if len(plan.validation_errors) > 20:
            print(f'  ... and {len(plan.validation_errors) - 20} more')

    preview = [c for c in plan.changes if c.reason != 'skipAutoTranslate'][:10]
    if preview:
        print('Sample changes:')
        for change in preview:
            prev = change.previous or '(empty)'
            print(f'  [{change.reason}] {change.key}')
            print(f'    en:  {change.english[:120]}{"..." if len(change.english) > 120 else ""}')
            print(f'    was: {prev[:120]}{"..." if len(prev) > 120 else ""}')
            print(f'    ->:  {change.translated[:120]}{"..." if len(change.translated) > 120 else ""}')

    if not apply:
        print('Dry run only (pass --apply to write files).')


def default_target_locales() -> list[str]:
    locales = sorted(
        path.stem for path in MESSAGES_DIR.glob('*.json') if path.stem != SOURCE_LOCALE)
    return locales or list(DEFAULT_TARGET_LOCALES)


def parse_locales(raw: str | None) -> list[str]:
    if not raw:
        return default_target_locales()
    locales = [part.strip() for part in raw.split(',') if part.strip()]
    if SOURCE_LOCALE in locales:
        raise ValueError(f'cannot target source locale {SOURCE_LOCALE!r}')
    return locales


def main():
    parser = argparse.ArgumentParser(
        description='Auto-translate frontend/messages locale JSON files from en.json.')
    parser.add_argument('--apply', action='store_true',
                        help='Write updated locale files. Without this flag, only print a summary.')
    parser.add_argument('--locales',
                        help='Comma-separated target locales (default: pseudo,de,es,pt).')
    parser.add_argument('--overwrite-existing', action='store_true',
                        help='Retranslate fields that already have non-empty translations.')
    parser.add_argument('--api-key', default=os.environ.get('GOOGLE_TRANSLATE_API_KEY'),
                        help='Google Cloud Translation API key (or set GOOGLE_TRANSLATE_API_KEY). '
                             'Not required for pseudo locale only.')
    args = parser.parse_args()

    try:
        locales = parse_locales(args.locales)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 2

    needs_api = any(loc != 'pseudo' for loc in locales)
    if needs_api and not args.api_key:
        print('Google Translate API key required for non-pseudo locales. '
              'Pass --api-key or set GOOGLE_TRANSLATE_API_KEY.', file=sys.stderr)
        return 2

    en_tree = load_json(EN_JSON_PATH)
    if not en_tree:
        print(f'No messages found in {EN_JSON_PATH}', file=sys.stderr)
        return 2

    skip_paths = get_skip_paths(en_tree)
    print(f'Source: {EN_JSON_PATH}')
    print(f'Target locales: {", ".join(locales)}')
    print(f'Overwrite existing: {args.overwrite_existing}')
    print(f'skipAutoTranslate paths: {len(skip_paths)}')

    exit_code = 0
    for locale in locales:
        plan = plan_locale(locale, en_tree, skip_paths, args.overwrite_existing)
        translator = GoogleTranslator(args.api_key, locale) if locale != 'pseudo' else None
        try:
            execute_translations(plan, locale, translator)
        except RuntimeError as e:
            print(f'[{locale}] {e}', file=sys.stderr)
            return 2

        print_plan_summary(plan, apply=args.apply)

        if plan.validation_errors:
            exit_code = 1

        if args.apply:
            existing_tree = load_json(MESSAGES_DIR / f'{locale}.json')
            output = apply_plan_to_tree(
                en_tree, existing_tree, plan, skip_paths, args.overwrite_existing)
            out_path = MESSAGES_DIR / f'{locale}.json'
            write_messages_json(out_path, output)
            print(f'Wrote {out_path}')

    if not args.apply:
        print('\nDry run complete. Pass --apply to write files.')

    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
