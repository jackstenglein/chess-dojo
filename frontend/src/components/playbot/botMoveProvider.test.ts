import { describe, expect, it, vi } from 'vitest';
import { resolveBotMove, type BotMoveContext } from './botMoveProvider';

const context: BotMoveContext = {
    fen: 'rn1qkbnr/pppbpppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 3',
    maiaRating: 1500,
    plyCount: 4,
};

describe('resolveBotMove', () => {
    it('uses a custom provider result before the Maia fallback', async () => {
        const provider = vi.fn().mockResolvedValue({
            uci: 'c2c4',
            san: 'c4',
            source: 'repertoire-spy' as const,
        });
        const getDefaultOpeningBookMove = vi.fn();
        const callMaia = vi.fn();

        await expect(
            resolveBotMove(context, {
                provider,
                getDefaultOpeningBookMove,
                callMaia,
            }),
        ).resolves.toEqual({
            uci: 'c2c4',
            san: 'c4',
            source: 'repertoire-spy',
        });

        expect(provider).toHaveBeenCalledWith(context);
        expect(getDefaultOpeningBookMove).not.toHaveBeenCalled();
        expect(callMaia).not.toHaveBeenCalled();
    });

    it('falls back to Maia when the custom provider and opening book return null', async () => {
        const provider = vi.fn().mockResolvedValue(null);
        const getDefaultOpeningBookMove = vi.fn().mockResolvedValue(null);
        const callMaia = vi.fn().mockResolvedValue({
            bestMove: 'g1f3',
            value: 0.54,
            policy: {},
        });

        await expect(
            resolveBotMove(context, {
                provider,
                getDefaultOpeningBookMove,
                callMaia,
            }),
        ).resolves.toEqual({
            uci: 'g1f3',
            san: undefined,
            source: 'maia',
            winProbability: 0.54,
        });
    });
});
