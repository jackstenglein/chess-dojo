import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOpeningBookMove, OPENING_BOOK_TIMEOUT_MS } from './openingBook';

const { axiosGet } = vi.hoisted(() => ({
    axiosGet: vi.fn(),
}));

vi.mock('../../api/axiosService', () => ({
    axiosService: {
        get: axiosGet,
    },
}));

const fen = 'rn1qkbnr/pppbpppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 3';

describe('getOpeningBookMove', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sets a short timeout on the Posira request', async () => {
        axiosGet.mockResolvedValue({ data: { moves: [] } });

        await expect(getOpeningBookMove(fen, 1500, 4)).resolves.toBeNull();

        expect(axiosGet).toHaveBeenCalledWith(
            'https://api.posira.dev/api/v1/explorer',
            expect.objectContaining({ timeout: OPENING_BOOK_TIMEOUT_MS }),
        );
    });

    it('exposes request failures so the caller can disable the opening book', async () => {
        const error = new Error('timeout');
        axiosGet.mockRejectedValue(error);

        await expect(getOpeningBookMove(fen, 1500, 4)).rejects.toBe(error);
    });
});
