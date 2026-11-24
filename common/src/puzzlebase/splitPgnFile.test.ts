import { describe, expect, it } from 'vitest';
import { splitPgnFile } from './splitPgnFile';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const game = (event: string, moves = '1. Rd8#') =>
    `[Event "${event}"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n${moves}`;

describe('splitPgnFile', () => {
    it('splits games that have no result', () => {
        const games = splitPgnFile([game('A'), game('B'), game('C')].join('\n\n'));
        expect(games).toEqual([game('A'), game('B'), game('C')]);
    });

    it('splits games with results, with or without blank lines between them', () => {
        expect(splitPgnFile(`${game('A', '1. Rd8# 1-0')}\n${game('B', '1. Rd8# *')}`)).toHaveLength(
            2,
        );
    });

    it('handles Windows line endings and a byte order mark', () => {
        const text = `\uFEFF${game('A')}\r\n\r\n${game('B')}\r\n`;
        expect(splitPgnFile(text)).toHaveLength(2);
    });

    it('does not split on a bracket inside a multi-line comment', () => {
        const moves = '{ A note\n[Event "not a header"] still the note } 1. Rd8#';
        expect(splitPgnFile(`${game('A', moves)}\n\n${game('B')}`)).toHaveLength(2);
    });

    it('treats movetext without headers as one game', () => {
        expect(splitPgnFile('1. e4 e5 2. Nf3 *')).toEqual(['1. e4 e5 2. Nf3 *']);
    });

    it('returns nothing for an empty file', () => {
        expect(splitPgnFile(' \n\n ')).toEqual([]);
    });
});
