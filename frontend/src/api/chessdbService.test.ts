import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('./axiosService', () => ({ axiosService: { get: mockGet } }));

import { ChessDBService } from './chessdbService';

const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('ChessDBService', () => {
    beforeEach(() => {
        mockGet.mockReset();
    });

    it('does not queue analysis when a position is unavailable', async () => {
        mockGet.mockResolvedValue({ data: { status: 'unknown', moves: [] } });
        const service = new ChessDBService('https://example.test/cdb.php');
        const queueAnalysis = vi.spyOn(service, 'queueAnalysis');

        const result = await service.getAnalysis(fen);

        expect(result).toEqual({ error: 'Position evaluation not available: unknown' });
        expect(queueAnalysis).not.toHaveBeenCalled();
        expect(mockGet).toHaveBeenCalledWith(
            `https://example.test/cdb.php?action=queryall&board=${encodeURIComponent(fen)}&json=1`,
        );
    });
});
