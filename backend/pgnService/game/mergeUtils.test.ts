'use strict';

import { Move } from '@jackstenglein/chess';
import { PgnMergeTypes } from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import { describe, expect, test } from 'vitest';
import { getPlayer, mergeComments, mergeDrawables, mergeNags } from './mergeUtils';

/**
 * Creates a minimal Move-shaped object for testing annotation merge helpers.
 * @param overrides Partial Move fields to apply on top of the defaults.
 * @returns A Move object with sensible defaults and the given overrides applied.
 */
function makeMove(overrides: Partial<Move> = {}): Move {
    return {
        san: 'e4',
        lan: 'e2e4',
        color: 'w',
        from: 'e2',
        to: 'e4',
        piece: 'p',
        before: '',
        after: '',
        fen: '',
        uci: 'e2e4',
        ply: 1,
        next: null,
        previous: null,
        variation: [],
        variations: [],
        materialDifference: 0,
        isNullMove: false,
        ...overrides,
    } as Move;
}

describe('getPlayer', () => {
    test('returns name and elo when both provided', () => {
        expect(getPlayer('Magnus Carlsen', '2850')).toBe('Magnus Carlsen (2850)');
    });

    test('returns name only when elo is undefined', () => {
        expect(getPlayer('Magnus Carlsen', undefined)).toBe('Magnus Carlsen');
    });

    test('returns NN with elo when name is undefined', () => {
        expect(getPlayer(undefined, '2850')).toBe('NN (2850)');
    });

    test('returns NN when both are undefined', () => {
        expect(getPlayer(undefined, undefined)).toBe('NN');
    });

    test('returns NN when name is empty string', () => {
        expect(getPlayer('', undefined)).toBe('NN');
    });

    test('returns NN with elo when name is empty string', () => {
        expect(getPlayer('', '2850')).toBe('NN (2850)');
    });
});

describe('mergeComments', () => {
    test('DISCARD does nothing', () => {
        const source = makeMove({ commentAfter: 'src', commentMove: 'srcMove' });
        const target = makeMove({ commentAfter: 'tgt', commentMove: 'tgtMove' });

        mergeComments(source, target, PgnMergeTypes.DISCARD);

        expect(target.commentAfter).toBe('tgt');
        expect(target.commentMove).toBe('tgtMove');
    });

    test('OVERWRITE replaces target comments with source comments', () => {
        const source = makeMove({ commentAfter: 'src', commentMove: 'srcMove' });
        const target = makeMove({ commentAfter: 'tgt', commentMove: 'tgtMove' });

        mergeComments(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.commentAfter).toBe('src');
        expect(target.commentMove).toBe('srcMove');
    });

    test('MERGE appends source commentAfter to existing target commentAfter', () => {
        const source = makeMove({ commentAfter: 'src' });
        const target = makeMove({ commentAfter: 'tgt' });

        mergeComments(source, target, PgnMergeTypes.MERGE);

        expect(target.commentAfter).toBe('tgt\n\nsrc');
    });

    test('MERGE appends source commentMove to existing target commentMove', () => {
        const source = makeMove({ commentMove: 'srcMove' });
        const target = makeMove({ commentMove: 'tgtMove' });

        mergeComments(source, target, PgnMergeTypes.MERGE);

        expect(target.commentMove).toBe('tgtMove\n\nsrcMove');
    });

    test('MERGE sets target comment when target has no comment', () => {
        const source = makeMove({ commentAfter: 'src', commentMove: 'srcMove' });
        const target = makeMove();

        mergeComments(source, target, PgnMergeTypes.MERGE);

        expect(target.commentAfter).toBe('src');
        expect(target.commentMove).toBe('srcMove');
    });

    test('source with no comments leaves target unchanged', () => {
        const source = makeMove();
        const target = makeMove({ commentAfter: 'tgt', commentMove: 'tgtMove' });

        mergeComments(source, target, PgnMergeTypes.MERGE);

        expect(target.commentAfter).toBe('tgt');
        expect(target.commentMove).toBe('tgtMove');
    });

    test('both source and target empty remains empty', () => {
        const source = makeMove();
        const target = makeMove();

        mergeComments(source, target, PgnMergeTypes.MERGE);

        expect(target.commentAfter).toBeUndefined();
        expect(target.commentMove).toBeUndefined();
    });

    test('OVERWRITE with empty source leaves target unchanged', () => {
        const source = makeMove();
        const target = makeMove({ commentAfter: 'keep' });

        mergeComments(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.commentAfter).toBe('keep');
    });
});

describe('mergeNags', () => {
    test('DISCARD does nothing', () => {
        const source = makeMove({ nags: ['$1'] });
        const target = makeMove({ nags: ['$2'] });

        mergeNags(source, target, PgnMergeTypes.DISCARD);

        expect(target.nags).toEqual(['$2']);
    });

    test('OVERWRITE replaces target nags with source nags', () => {
        const source = makeMove({ nags: ['$1'] });
        const target = makeMove({ nags: ['$2', '$3'] });

        mergeNags(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.nags).toEqual(['$1']);
    });

    test('MERGE unions and deduplicates nags', () => {
        const source = makeMove({ nags: ['$1', '$3'] });
        const target = makeMove({ nags: ['$1', '$2'] });

        mergeNags(source, target, PgnMergeTypes.MERGE);

        expect(target.nags).toEqual(['$1', '$2', '$3']);
    });

    test('MERGE sets target nags when target has no nags', () => {
        const source = makeMove({ nags: ['$1', '$2'] });
        const target = makeMove();

        mergeNags(source, target, PgnMergeTypes.MERGE);

        expect(target.nags).toEqual(['$1', '$2']);
    });

    test('source with no nags leaves target unchanged', () => {
        const source = makeMove();
        const target = makeMove({ nags: ['$5'] });

        mergeNags(source, target, PgnMergeTypes.MERGE);

        expect(target.nags).toEqual(['$5']);
    });

    test('both empty remains empty', () => {
        const source = makeMove();
        const target = makeMove();

        mergeNags(source, target, PgnMergeTypes.MERGE);

        expect(target.nags).toBeUndefined();
    });

    test('OVERWRITE with undefined source nags leaves target unchanged', () => {
        const source = makeMove();
        const target = makeMove({ nags: ['$4'] });

        mergeNags(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.nags).toEqual(['$4']);
    });

    test('MERGE with all duplicates produces no duplicates', () => {
        const source = makeMove({ nags: ['$1', '$2'] });
        const target = makeMove({ nags: ['$1', '$2'] });

        mergeNags(source, target, PgnMergeTypes.MERGE);

        expect(target.nags).toEqual(['$1', '$2']);
    });
});

describe('mergeDrawables', () => {
    test('DISCARD does nothing', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'], colorFields: ['Rd4'] },
        });
        const target = makeMove({
            commentDiag: { colorArrows: ['Bd1h5'], colorFields: ['Ye5'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.DISCARD);

        expect(target.commentDiag?.colorArrows).toEqual(['Bd1h5']);
        expect(target.commentDiag?.colorFields).toEqual(['Ye5']);
    });

    test('OVERWRITE replaces target arrows with source arrows', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'] },
        });
        const target = makeMove({
            commentDiag: { colorArrows: ['Bd1h5'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.commentDiag?.colorArrows).toEqual(['Ge2e4']);
    });

    test('OVERWRITE replaces target fields with source fields', () => {
        const source = makeMove({
            commentDiag: { colorFields: ['Rd4'] },
        });
        const target = makeMove({
            commentDiag: { colorFields: ['Ye5'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.commentDiag?.colorFields).toEqual(['Rd4']);
    });

    test('MERGE unions and deduplicates arrows (string values)', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4', 'Rd1d8'] },
        });
        const target = makeMove({
            commentDiag: { colorArrows: ['Ge2e4', 'Bf1c4'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorArrows).toEqual(['Ge2e4', 'Bf1c4', 'Rd1d8']);
    });

    test('MERGE unions and deduplicates fields (string values)', () => {
        const source = makeMove({
            commentDiag: { colorFields: ['Rd4', 'Ge5'] },
        });
        const target = makeMove({
            commentDiag: { colorFields: ['Rd4', 'Yf6'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorFields).toEqual(['Rd4', 'Yf6', 'Ge5']);
    });

    test('MERGE sets target arrows when target has no arrows', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'] },
        });
        const target = makeMove();

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorArrows).toEqual(['Ge2e4']);
    });

    test('MERGE sets target fields when target has no fields', () => {
        const source = makeMove({
            commentDiag: { colorFields: ['Rd4'] },
        });
        const target = makeMove();

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorFields).toEqual(['Rd4']);
    });

    test('source with no drawables leaves target unchanged', () => {
        const source = makeMove();
        const target = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'], colorFields: ['Rd4'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorArrows).toEqual(['Ge2e4']);
        expect(target.commentDiag?.colorFields).toEqual(['Rd4']);
    });

    test('both empty remains without drawables', () => {
        const source = makeMove();
        const target = makeMove();

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag).toBeUndefined();
    });

    test('MERGE preserves existing commentDiag properties when adding arrows', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'] },
        });
        const target = makeMove({
            commentDiag: { clk: '1:30:00' },
        });

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorArrows).toEqual(['Ge2e4']);
        expect(target.commentDiag?.clk).toBe('1:30:00');
    });

    test('OVERWRITE preserves existing commentDiag properties when replacing arrows', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'] },
        });
        const target = makeMove({
            commentDiag: { colorArrows: ['Bd1h5'], clk: '1:30:00' },
        });

        mergeDrawables(source, target, PgnMergeTypes.OVERWRITE);

        expect(target.commentDiag?.colorArrows).toEqual(['Ge2e4']);
        expect(target.commentDiag?.clk).toBe('1:30:00');
    });

    test('MERGE handles arrows and fields independently', () => {
        const source = makeMove({
            commentDiag: { colorArrows: ['Ge2e4'], colorFields: ['Rd4'] },
        });
        const target = makeMove({
            commentDiag: { colorArrows: ['Bf1c4'] },
        });

        mergeDrawables(source, target, PgnMergeTypes.MERGE);

        expect(target.commentDiag?.colorArrows).toEqual(['Bf1c4', 'Ge2e4']);
        expect(target.commentDiag?.colorFields).toEqual(['Rd4']);
    });
});
