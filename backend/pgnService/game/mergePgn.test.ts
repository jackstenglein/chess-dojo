'use strict';

import { Chess } from '@jackstenglein/chess';
import {
    PgnMergeRequest,
    PgnMergeTypes,
} from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import { assert, describe, expect, test } from 'vitest';
import { ApiError } from '../../directoryService/api';
import { mergePgn } from './mergePgn';

/**
 * Builds a minimal PgnMergeRequest with defaults for testing.
 * @param overrides Partial request fields to apply on top of the defaults.
 * @returns A PgnMergeRequest with sensible defaults and the given overrides applied.
 */
function makeRequest(overrides: Partial<PgnMergeRequest> = {}): PgnMergeRequest {
    return {
        cohort: '2000-2100',
        id: '2025-01-01_abc',
        pgn: '',
        commentMergeType: PgnMergeTypes.MERGE,
        nagMergeType: PgnMergeTypes.MERGE,
        drawableMergeType: PgnMergeTypes.MERGE,
        ...overrides,
    };
}

describe('mergePgn', () => {
    test('happy path: overlapping and diverging lines are merged', () => {
        const target = new Chess({ pgn: '1. e4 e5 2. Nf3 *' });
        const source = new Chess({ pgn: '1. e4 e5 2. Nf3 Nc6 *' });

        const result = mergePgn(source, target, makeRequest());

        const merged = new Chess({ pgn: result });
        merged.seek(null);
        const history = merged.history();
        assert.equal(history.length, 4, 'merged line should have 4 moves');
        assert.equal(history[0].san, 'e4');
        assert.equal(history[1].san, 'e5');
        assert.equal(history[2].san, 'Nf3');
        assert.equal(history[3].san, 'Nc6');
    });

    test('happy path: diverging move creates a variation', () => {
        const target = new Chess({ pgn: '1. e4 e5 2. Nf3 *' });
        const source = new Chess({ pgn: '1. e4 e5 2. Bc4 *' });

        const result = mergePgn(source, target, makeRequest());

        const merged = new Chess({ pgn: result });
        merged.seek(null);
        const history = merged.history();
        // Main line should still be e4 e5 Nf3
        assert.equal(history[2].san, 'Nf3');
        // Bc4 should appear as a variation on Nf3
        assert.isTrue(
            history[2].variations.some((v) => v.some((m) => m.san === 'Bc4')),
            'Bc4 should appear as a variation on Nf3',
        );
    });

    test('empty source is a no-op', () => {
        const target = new Chess({ pgn: '1. e4 e5 2. Nf3 *' });
        const source = new Chess({ pgn: '*' });

        const result = mergePgn(source, target, makeRequest());

        const merged = new Chess({ pgn: result });
        merged.seek(null);
        const history = merged.history();
        assert.equal(history.length, 3);
        assert.equal(history[0].san, 'e4');
        assert.equal(history[1].san, 'e5');
        assert.equal(history[2].san, 'Nf3');
    });

    test('nested source variations are flattened into sibling variations', () => {
        // Source has nested variations: 1. e4 (1. d4 (1. c4))
        // After merge, d4 and c4 both become sibling variations on move 1
        const source = new Chess({ pgn: '1. e4 (1. d4 (1. c4)) *' });
        const target = new Chess({ pgn: '*' });

        const result = mergePgn(source, target, makeRequest());

        const merged = new Chess({ pgn: result });
        merged.seek(null);
        const history = merged.history();
        // Main line should be e4
        assert.equal(history[0].san, 'e4');
        // Both d4 and c4 should appear as variations on e4
        const variationSans = history[0].variations.map((v) => v[0]?.san);
        assert.include(variationSans, 'd4', 'd4 should be a variation');
        assert.include(variationSans, 'c4', 'c4 should be a variation');
    });

    test('FEN mismatch throws 400', () => {
        const target = new Chess({ pgn: '1. e4 *' });
        const source = new Chess({
            pgn: '[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n[SetUp "1"]\n\n1... e5 *',
        });

        try {
            mergePgn(source, target, makeRequest());
            assert.fail('should have thrown');
        } catch (err) {
            assert.instanceOf(err, ApiError);
            assert.equal((err as ApiError).statusCode, 400);
            assert.include(
                (err as ApiError).publicMessage,
                'do not start from the same position',
            );
        }
    });

    describe('citeSource', () => {
        test('appends citation comment to the last move of the merged line', () => {
            const sourcePgn = `[White "Magnus Carlsen"]
[WhiteElo "2850"]
[Black "Ian Nepomniachtchi"]
[BlackElo "2789"]
[Date "2024.01.15"]

1. e4 e5 *`;
            const source = new Chess({ pgn: sourcePgn });
            const target = new Chess({ pgn: '1. e4 *' });

            const origHost = process.env['frontendHost'];
            process.env['frontendHost'] = 'https://www.chessdojo.club';

            try {
                const result = mergePgn(
                    source,
                    target,
                    makeRequest({
                        citeSource: true,
                        sourceCohort: '2800+',
                        sourceId: 'game-123',
                    }),
                );

                const merged = new Chess({ pgn: result });
                merged.seek(null);
                const history = merged.history();
                const lastMove = history[history.length - 1];

                assert.isString(lastMove.commentAfter);
                assert.include(lastMove.commentAfter!, 'Magnus Carlsen (2850)');
                assert.include(lastMove.commentAfter!, 'Ian Nepomniachtchi (2789)');
                assert.include(lastMove.commentAfter!, '2024.01.15');
                assert.include(
                    lastMove.commentAfter!,
                    '/games/2800+/game-123',
                );
            } finally {
                if (origHost !== undefined) {
                    process.env['frontendHost'] = origHost;
                } else {
                    delete process.env['frontendHost'];
                }
            }
        });

        test('citation appends to existing comment', () => {
            const sourcePgn = `[White "Player1"]
[Black "Player2"]
[Date "2024.06.01"]

1. e4 {existing source comment} *`;
            const source = new Chess({ pgn: sourcePgn });
            const target = new Chess({ pgn: '1. e4 {target comment} *' });

            const origHost = process.env['frontendHost'];
            process.env['frontendHost'] = 'https://www.chessdojo.club';

            try {
                const result = mergePgn(
                    source,
                    target,
                    makeRequest({
                        citeSource: true,
                        sourceCohort: 'cohort1',
                        sourceId: 'id1',
                    }),
                );

                const merged = new Chess({ pgn: result });
                merged.seek(null);
                const history = merged.history();
                const lastMove = history[history.length - 1];

                // Should contain both the merged comment and the citation
                assert.include(lastMove.commentAfter!, 'target comment');
                assert.include(lastMove.commentAfter!, 'existing source comment');
                assert.include(lastMove.commentAfter!, 'Player1');
            } finally {
                if (origHost !== undefined) {
                    process.env['frontendHost'] = origHost;
                } else {
                    delete process.env['frontendHost'];
                }
            }
        });

        test('no citation when citeSource is false', () => {
            const sourcePgn = `[White "Player1"]
[Black "Player2"]

1. e4 *`;
            const source = new Chess({ pgn: sourcePgn });
            const target = new Chess({ pgn: '*' });

            const result = mergePgn(
                source,
                target,
                makeRequest({
                    citeSource: false,
                    sourceCohort: 'cohort1',
                    sourceId: 'id1',
                }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const history = merged.history();
            const lastMove = history[history.length - 1];
            assert.notInclude(lastMove.commentAfter || '', 'chessdojo.club');
        });

        test('no citation without sourceCohort/sourceId', () => {
            const source = new Chess({ pgn: '1. e4 *' });
            const target = new Chess({ pgn: '*' });

            const origHost = process.env['frontendHost'];
            process.env['frontendHost'] = 'https://www.chessdojo.club';

            try {
                const result = mergePgn(
                    source,
                    target,
                    makeRequest({ citeSource: true }),
                );

                const merged = new Chess({ pgn: result });
                merged.seek(null);
                const history = merged.history();
                const lastMove = history[history.length - 1];
                assert.notInclude(lastMove.commentAfter || '', 'chessdojo.club');
            } finally {
                if (origHost !== undefined) {
                    process.env['frontendHost'] = origHost;
                } else {
                    delete process.env['frontendHost'];
                }
            }
        });
    });

    describe('comment merge options', () => {
        test('DISCARD ignores source comments', () => {
            const source = new Chess({ pgn: '1. e4 {source comment} *' });
            const target = new Chess({ pgn: '1. e4 {target comment} *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ commentMergeType: PgnMergeTypes.DISCARD }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            assert.equal(e4.commentAfter, 'target comment');
        });

        test('OVERWRITE replaces target comments with source', () => {
            const source = new Chess({ pgn: '1. e4 {source comment} *' });
            const target = new Chess({ pgn: '1. e4 {target comment} *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ commentMergeType: PgnMergeTypes.OVERWRITE }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            assert.equal(e4.commentAfter, 'source comment');
        });

        test('MERGE concatenates comments', () => {
            const source = new Chess({ pgn: '1. e4 {source comment} *' });
            const target = new Chess({ pgn: '1. e4 {target comment} *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ commentMergeType: PgnMergeTypes.MERGE }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            assert.include(e4.commentAfter!, 'target comment');
            assert.include(e4.commentAfter!, 'source comment');
        });
    });

    describe('NAG merge options', () => {
        test('DISCARD ignores source NAGs', () => {
            const source = new Chess({ pgn: '1. e4 $1 *' });
            const target = new Chess({ pgn: '1. e4 $2 *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ nagMergeType: PgnMergeTypes.DISCARD }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            expect(e4.nags).toEqual(['$2']);
        });

        test('MERGE deduplicates NAGs', () => {
            const source = new Chess({ pgn: '1. e4 $1 $3 *' });
            const target = new Chess({ pgn: '1. e4 $1 $2 *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ nagMergeType: PgnMergeTypes.MERGE }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            assert.include(e4.nags!, '$1');
            assert.include(e4.nags!, '$2');
            assert.include(e4.nags!, '$3');
            assert.equal(new Set(e4.nags).size, e4.nags!.length);
        });

        test('OVERWRITE replaces target NAGs', () => {
            const source = new Chess({ pgn: '1. e4 $1 *' });
            const target = new Chess({ pgn: '1. e4 $2 *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ nagMergeType: PgnMergeTypes.OVERWRITE }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            expect(e4.nags).toEqual(['$1']);
        });
    });

    describe('drawable merge options', () => {
        test('DISCARD ignores source drawables', () => {
            const source = new Chess({ pgn: '1. e4 { [%cal Ge2e4] } *' });
            const target = new Chess({ pgn: '1. e4 { [%cal Gd2d4] } *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ drawableMergeType: PgnMergeTypes.DISCARD }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            expect(e4.commentDiag?.colorArrows).toEqual(['Gd2d4']);
        });

        test('OVERWRITE replaces target drawables', () => {
            const source = new Chess({ pgn: '1. e4 { [%cal Ge2e4] } *' });
            const target = new Chess({ pgn: '1. e4 { [%cal Gd2d4] } *' });

            const result = mergePgn(
                source,
                target,
                makeRequest({ drawableMergeType: PgnMergeTypes.OVERWRITE }),
            );

            const merged = new Chess({ pgn: result });
            merged.seek(null);
            const e4 = merged.history()[0];
            expect(e4.commentDiag?.colorArrows).toEqual(['Ge2e4']);
        });
    });
});
