#!/usr/bin/env python3
"""Convert PGN files into JSON arrays of header-only PGN strings.

Each game in a PGN file becomes one string containing only that game's
tag-pair headers (no movetext or comments). Output is written next to
each input file as <name>.json.
"""

import argparse
import json
from pathlib import Path


def extract_header_blocks(text: str) -> list[str]:
    """Return one header-only PGN string per game."""
    blocks: list[str] = []
    current: list[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith('[') and stripped.endswith(']'):
            current.append(stripped)
        elif current:
            blocks.append('\n'.join(current))
            current = []

    if current:
        blocks.append('\n'.join(current))

    return blocks


def convert_file(path: Path) -> Path:
    text = path.read_text(encoding='utf-8-sig')
    headers = extract_header_blocks(text)
    out_path = path.with_suffix('.json')
    out_path.write_text(json.dumps(headers, indent=2) + '\n', encoding='utf-8')
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Convert PGN files to JSON lists of header-only PGN strings.'
    )
    parser.add_argument(
        'files',
        nargs='+',
        type=Path,
        help='PGN files to convert. Each file is written to <name>.json.',
    )
    args = parser.parse_args()

    for path in args.files:
        if not path.is_file():
            raise SystemExit(f'File not found: {path}')
        out_path = convert_file(path)
        print(f'{path} -> {out_path}')


if __name__ == '__main__':
    main()
