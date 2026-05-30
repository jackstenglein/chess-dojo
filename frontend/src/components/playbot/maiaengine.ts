/**
 * Maia chess engine — ChessAgine NN API backed implementation.
 *
 * Replaces the previous ONNX/browser-inference version.
 * All inference runs on the ChessAgine neural-net server via ChessAgineNNService.
 */

import { chessAgineNNService } from '@/api/chessAgineNNService';

export type MaiaRating =
    | 600
    | 700
    | 800
    | 900
    | 1000
    | 1100
    | 1200
    | 1300
    | 1400
    | 1500
    | 1600
    | 1700
    | 1800
    | 1900
    | 2000
    | 2100
    | 2200
    | 2300
    | 2400
    | 2500
    | 2600;

export const MAIA_RATINGS: MaiaRating[] = [
    600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100,
    2200, 2300, 2400, 2500, 2600,
];

/** Always 'ready' — no download needed with the API backend. */
export type MaiaStatus = 'ready';

export interface MaiaEvalResult {
    bestMove: string;
    policy: Record<string, number>;
    value: number;
}

/**
 * Call the ChessAgine NN service for Maia move generation.
 * Uses Maia3 server-side at the given rating.
 */
export async function callMaiaApi(fen: string, rating: MaiaRating): Promise<MaiaEvalResult> {
    const result = await chessAgineNNService.analyzeMaia(fen, rating);
    if (result.error || !result.data) {
        throw new Error(result.error ?? 'Maia API returned no data');
    }
    return result.data;
}
