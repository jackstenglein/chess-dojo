import { describe, expect, it } from 'vitest';
import { PuzzlebasePuzzle } from './api';
import { contributionFromPgn, defaultTaxonomy } from './build';
import { playerHeaders, puzzlesToPgn, puzzleToPgn } from './exportPgn';
import { linesFromSolution } from './lines';
import { parsePuzzlePgn } from './parse';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const solutionPgn = `[White "Old"]\n[Themes "Fork"]\n[Rating "400"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n{ keep this comment } 1. Rd8# 1-0`;

const puzzle = (over: Partial<PuzzlebasePuzzle> = {}): PuzzlebasePuzzle => ({
    id: '007',
    fen: FEN,
    solutionPgn,
    annotator: 'a',
    annotatorDisplayName: 'Kostya',
    rating: 1450,
    buckets: ['Tactics'],
    themes: ['Back rank mate', 'Sacrifice'],
    white: 'Ex 7 Tactics, Back rank mate',
    black: 'Portisch - Larsen',
    event: 'Las Palmas',
    year: 1973,
    createdAt: 'T0',
    updatedAt: 'T0',
    ...over,
});

describe('puzzleToPgn', () => {
    it('writes the current tags and rating, not the ones the PGN came with', () => {
        const pgn = puzzleToPgn(puzzle());
        expect(pgn).toContain('[Themes "Tactics, Back rank mate, Sacrifice"]');
        expect(pgn).toContain('[Rating "1450"]');
        expect(pgn).not.toContain('[Themes "Fork"]');
        expect(pgn).not.toContain('[Rating "400"]');
    });

    it('writes the details and keeps the solution and its comments', () => {
        const pgn = puzzleToPgn(puzzle());
        expect(pgn).toContain('[White "Portisch"]');
        expect(pgn).toContain('[Black "Larsen"]');
        expect(pgn).not.toContain('Ex 7');
        expect(pgn).toContain('[Event "Las Palmas"]');
        expect(pgn).toContain('[Date "1973.??.??"]');
        expect(pgn).toContain('keep this comment');
        expect(pgn).toContain('Rd8#');
    });

    it('leaves out details the puzzle does not have', () => {
        const pgn = puzzleToPgn(
            puzzle({ event: undefined, year: undefined, buckets: [], themes: [] }),
        );
        expect(pgn).toContain('[Event "?"]');
        expect(pgn).toContain('[Date "????.??.??"]');
        expect(pgn).not.toContain('[Themes');
    });

    it('imports again with the same tags, rating and moves', () => {
        const pgn = puzzleToPgn(puzzle());
        const parsed = parsePuzzlePgn(pgn);
        const tags = contributionFromPgn(defaultTaxonomy(), parsed);
        expect(tags.rating).toBe(1450);
        expect(tags.buckets).toEqual(['Tactics']);
        expect(tags.themes.sort()).toEqual(['Back rank mate', 'Sacrifice']);
        expect(tags.warnings).toEqual([]);
        expect(linesFromSolution(pgn).lines).toEqual([['Rd8#']]);
        expect(parsed.fen).toBe(FEN);
    });
});

describe('puzzlesToPgn', () => {
    it('writes every puzzle, in id order, one game each', () => {
        const pgn = puzzlesToPgn([puzzle({ id: '010' }), puzzle({ id: '002', rating: 900 })]);
        const games = pgn.trim().split(/\n\n(?=\[)/);
        expect(games).toHaveLength(2);
        expect(games[0]).toContain('[Rating "900"]');
        expect(games[1]).toContain('[Rating "1450"]');
    });
});

describe('playerHeaders', () => {
    it('drops the Ex label and splits the players', () => {
        expect(playerHeaders({ white: 'Ex 1 Tactics, Pin', black: 'Smirnov - Dydyshko' })).toEqual({
            white: 'Smirnov',
            black: 'Dydyshko',
        });
    });

    it('leaves real player headers alone', () => {
        expect(playerHeaders({ white: 'Fischer', black: 'Spassky' })).toEqual({
            white: 'Fischer',
            black: 'Spassky',
        });
    });

    it('writes ? when a labelled puzzle has no players', () => {
        expect(playerHeaders({ white: 'Ex 5 Tactics', black: 'White to play' })).toEqual({
            white: '?',
            black: '?',
        });
    });
});
