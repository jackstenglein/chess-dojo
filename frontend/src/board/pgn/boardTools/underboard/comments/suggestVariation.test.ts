import { GameApiContextType } from '@/api/gameApi';
import { Game, GameResult } from '@/database/game';
import { User } from '@/database/user';
import { Chess, Move } from '@jackstenglein/chess';
import { describe, expect, it, vi } from 'vitest';
import { getUnsavedSuggestedVariationRoots, saveAllSuggestedVariations } from './suggestVariation';

const user = {
    username: 'dojo-user',
    displayName: 'Dojo User',
    dojoCohort: '1500-1600',
    previousCohort: '1400-1500',
} as User;

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        cohort: '1500-1600',
        id: 'game-id',
        date: '2026.06.01',
        owner: 'game-owner',
        ownerDisplayName: 'Game Owner',
        ownerPreviousCohort: '1400-1500',
        headers: {
            White: 'White',
            Black: 'Black',
            Date: '2026.06.01',
            Site: 'ChessDojo',
            Result: GameResult.Incomplete,
        },
        createdAt: '2026-06-01T00:00:00Z',
        pgn: '[Event "?"]\n\n1. e4 e5 *',
        positionComments: {},
        ...overrides,
    };
}

function markUnsaved(chess: Chess, move: Move) {
    chess.setCommand('dojoComment', `${user.username},${user.displayName},unsaved`, move);
}

function markSaved(chess: Chess, move: Move, commentId: string) {
    chess.setCommand('dojoComment', `${user.username},${user.displayName},${commentId}`, move);
}

function requireMove(move: Move | null): Move {
    expect(move).not.toBeNull();
    if (!move) {
        throw new Error('Expected move to be legal');
    }
    return move;
}

describe('getUnsavedSuggestedVariationRoots', () => {
    it('returns one root for a multi-move unsaved variation', () => {
        const chess = new Chess({ pgn: '[Event "?"]\n\n1. e4 e5 *' });
        const e4 = chess.history()[0];
        const c5 = requireMove(chess.move('c5', { previousMove: e4, skipSeek: true }));
        markUnsaved(chess, c5);

        const nf3 = requireMove(chess.move('Nf3', { previousMove: c5, skipSeek: true }));
        markUnsaved(chess, nf3);

        const roots = getUnsavedSuggestedVariationRoots(user, chess);

        expect(roots).toHaveLength(1);
        expect(roots[0]).toBe(c5);
    });

    it('returns each independent unsaved variation root once', () => {
        const chess = new Chess({ pgn: '[Event "?"]\n\n1. e4 e5 2. Nf3 Nc6 *' });
        const e4 = chess.history()[0];
        const e5 = chess.history()[1];

        const c5 = requireMove(chess.move('c5', { previousMove: e4, skipSeek: true }));
        markUnsaved(chess, c5);

        const d4 = requireMove(chess.move('d4', { previousMove: e5, skipSeek: true }));
        markUnsaved(chess, d4);

        const roots = getUnsavedSuggestedVariationRoots(user, chess);

        expect(roots).toHaveLength(2);
        expect(roots).toContain(c5);
        expect(roots).toContain(d4);
    });

    it('returns the saved comment root when an existing suggested variation has an unsaved extension', () => {
        const chess = new Chess({ pgn: '[Event "?"]\n\n1. e4 e5 *' });
        const e4 = chess.history()[0];
        const c5 = requireMove(chess.move('c5', { previousMove: e4, skipSeek: true }));
        markSaved(chess, c5, 'comment-1');

        const nf3 = requireMove(chess.move('Nf3', { previousMove: c5, skipSeek: true }));
        markUnsaved(chess, nf3);

        const roots = getUnsavedSuggestedVariationRoots(user, chess);

        expect(roots).toHaveLength(1);
        expect(roots[0]).toBe(c5);
    });

    it('ignores unsaved variations from another user', () => {
        const chess = new Chess({ pgn: '[Event "?"]\n\n1. e4 e5 *' });
        const e4 = chess.history()[0];
        const c5 = requireMove(chess.move('c5', { previousMove: e4, skipSeek: true }));
        chess.setCommand('dojoComment', 'other-user,Other User,unsaved', c5);

        expect(getUnsavedSuggestedVariationRoots(user, chess)).toEqual([]);
    });
});

describe('saveAllSuggestedVariations', () => {
    it('creates one comment for each independent unsaved variation', async () => {
        const chess = new Chess({ pgn: '[Event "?"]\n\n1. e4 e5 *' });
        const e4 = chess.history()[0];

        const c5 = requireMove(chess.move('c5', { previousMove: e4, skipSeek: true }));
        markUnsaved(chess, c5);

        const e6 = requireMove(chess.move('e6', { previousMove: e4, skipSeek: true }));
        markUnsaved(chess, e6);

        const firstGame = makeGame();
        const secondGame = makeGame({
            positionComments: {
                [chess.normalizedFen(e4)]: {
                    'comment-1': {
                        id: 'comment-1',
                        fen: chess.normalizedFen(e4),
                        ply: e4.ply,
                        san: e4.san,
                        owner: {
                            username: user.username,
                            displayName: user.displayName,
                            cohort: user.dojoCohort,
                            previousCohort: user.previousCohort,
                        },
                        createdAt: '2026-06-01T00:00:00Z',
                        updatedAt: '2026-06-01T00:00:00Z',
                        content: '',
                        parentIds: '',
                        replies: {},
                        suggestedVariation: '1... c5 *',
                    },
                },
            },
        });
        const finalGame = makeGame();

        const api = {
            createComment: vi
                .fn()
                .mockResolvedValueOnce({
                    data: {
                        game: secondGame,
                        comment: { id: 'comment-1' },
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        game: finalGame,
                        comment: { id: 'comment-2' },
                    },
                }),
        } as unknown as GameApiContextType;

        const result = await saveAllSuggestedVariations(user, firstGame, api, chess);

        expect(api.createComment).toHaveBeenCalledTimes(2);
        expect(result.savedCount).toBe(2);
        expect(result.game).toBe(finalGame);
        expect(c5.commentDiag?.dojoComment).toBe(`${user.username},${user.displayName},comment-1`);
        expect(e6.commentDiag?.dojoComment).toBe(`${user.username},${user.displayName},comment-2`);
    });

    it('updates an existing suggested variation when only the extension is unsaved', async () => {
        const chess = new Chess({ pgn: '[Event "?"]\n\n1. e4 e5 *' });
        const e4 = chess.history()[0];
        const c5 = requireMove(chess.move('c5', { previousMove: e4, skipSeek: true }));
        markSaved(chess, c5, 'comment-1');

        const nf3 = requireMove(chess.move('Nf3', { previousMove: c5, skipSeek: true }));
        markUnsaved(chess, nf3);

        const updatedGame = makeGame();
        const game = makeGame({
            positionComments: {
                [chess.normalizedFen(e4)]: {
                    'comment-1': {
                        id: 'comment-1',
                        fen: chess.normalizedFen(e4),
                        ply: e4.ply,
                        san: e4.san,
                        owner: {
                            username: user.username,
                            displayName: user.displayName,
                            cohort: user.dojoCohort,
                            previousCohort: user.previousCohort,
                        },
                        createdAt: '2026-06-01T00:00:00Z',
                        updatedAt: '2026-06-01T00:00:00Z',
                        content: '',
                        parentIds: '',
                        replies: {},
                        suggestedVariation: '1... c5 *',
                    },
                },
            },
        });

        const api = {
            updateComment: vi.fn().mockResolvedValue({ data: updatedGame }),
        } as unknown as GameApiContextType;

        const result = await saveAllSuggestedVariations(user, game, api, chess);

        expect(api.updateComment).toHaveBeenCalledTimes(1);
        expect(result.savedCount).toBe(1);
        expect(result.game).toBe(updatedGame);
        expect(nf3.commentDiag?.dojoComment).toBe(`${user.username},${user.displayName},comment-1`);
    });
});
