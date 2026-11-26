import { describe, expect, it } from 'vitest';
import { formatPoints, formatResult, parseMatchPgn, pointsFor } from './crosstable';

const game = (round: string, white: string, black: string, result: string) =>
    `[Event "FIDE World Chess Championship 2026"]
[Round "${round}"]
[White "${white}"]
[Black "${black}"]
[Result "${result}"]

1. e4 { [%clk 1:59:50] } ${result}

`;

const PGN =
    game('1.1', 'Sindarov, Javokhir', 'Gukesh D', '1/2-1/2') +
    game('2.1', 'Gukesh D', 'Sindarov, Javokhir', '1-0') +
    game('3.1', 'Sindarov, Javokhir', 'Gukesh D', '1-0') +
    game('4.1', 'Gukesh D', 'Sindarov, Javokhir', '*');

describe('parseMatchPgn', () => {
    it('reads each game and totals the finished ones', () => {
        const table = parseMatchPgn(PGN);
        expect(table.games.map((g) => [g.number, g.white, g.result])).toEqual([
            [1, 'sindarov', '1/2-1/2'],
            [2, 'gukesh', '1-0'],
            [3, 'sindarov', '1-0'],
            [4, 'gukesh', '*'],
        ]);
        expect(table.totals).toEqual({ gukesh: 1.5, sindarov: 1.5 });
    });

    it('gives each player their own points per game', () => {
        const [g1, g2, g3, g4] = parseMatchPgn(PGN).games;
        expect([pointsFor(g1, 'gukesh'), pointsFor(g1, 'sindarov')]).toEqual([0.5, 0.5]);
        expect([pointsFor(g2, 'gukesh'), pointsFor(g2, 'sindarov')]).toEqual([1, 0]);
        expect([pointsFor(g3, 'gukesh'), pointsFor(g3, 'sindarov')]).toEqual([0, 1]);
        expect(pointsFor(g4, 'gukesh')).toBeUndefined();
    });
});

describe('formatResult', () => {
    it('writes a finished game with halves and a dash', () => {
        expect(['1-0', '0-1', '1/2-1/2'].map(formatResult)).toEqual(['1–0', '0–1', '½–½']);
    });

    it('has nothing to write for a game that is not over', () => {
        expect(formatResult('*')).toBeUndefined();
        expect(formatResult('')).toBeUndefined();
    });
});

describe('formatPoints', () => {
    it('writes halves as ½', () => {
        expect([0, 0.5, 1, 7.5].map(formatPoints)).toEqual(['0', '½', '1', '7½']);
    });
});
