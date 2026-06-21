/**
 * ChessAgine Neural Network Service
 *
 * Calls the ChessAgine NN server for Maia3 position analysis.
 */

import { MaiaEvalResult, MaiaRating } from '@/components/playbot/maiaengine';
import { axiosService } from './axiosService';

const NN_BASE_URL = 'https://www.chessagine.com/api/nn';

// ── Wire types ─────────────────────────────────────────────────────────────────

interface TopMove {
    move: string;
    probability: number;
}

interface NNAnalyzeData {
    topMoves: TopMove[];
    uciEval?: { value: number; policy: Record<string, number> };
    HumanEstimateEval?: string;
}

interface NNAnalyzeResponse {
    success: boolean;
    data: NNAnalyzeData;
}

interface BatchEntry {
    rating: number;
    analysis: {
        topMoves: TopMove[];
        uciEval?: { value: number };
        HumanEstimateEval?: string;
        LeelaZeroEstimateEval?: string;
    };
}

interface NNBatchResponse {
    success: boolean;
    fen: string;
    totalLevels: number;
    results: BatchEntry[];
}

// ── Service class ──────────────────────────────────────────────────────────────

export class ChessAgineNNService {
    /**
     * Analyze a position with Maia3 at a specific rating level (600–2600).
     */
    async analyzeMaia(
        fen: string,
        rating: MaiaRating,
    ): Promise<{ data?: MaiaEvalResult; error?: string }> {
        if (!fen) return { error: 'Missing required argument: fen' };

        try {
            const response = await axiosService.post<NNAnalyzeResponse>(NN_BASE_URL, {
                endpoint: 'analyze',
                fen,
                engine: 'maia3',
                rating,
            });

            if (!response.data.success) {
                return { error: 'NN server returned success: false' };
            }

            const { topMoves, uciEval } = response.data.data;
            const policy: Record<string, number> = {};
            for (const { move, probability } of topMoves) policy[move] = probability;

            return {
                data: {
                    bestMove: topMoves[0]?.move ?? '',
                    policy,
                    value: uciEval?.value ?? 0.5,
                },
            };
        } catch (error) {
            return { error: `Maia analyze request failed: ${String(error)}` };
        }
    }

    /**
     * Analyze a position across all 21 Maia3 rating levels (600–2600) in one
     * batched call. Returns a map of `maia_kdd_<rating>` → MaiaEvalResult.
     */
    async batchAnalyzeMaia3(
        fen: string,
    ): Promise<{ data?: Record<string, MaiaEvalResult>; error?: string }> {
        if (!fen) return { error: 'Missing required argument: fen' };

        try {
            const response = await axiosService.post<NNBatchResponse>(NN_BASE_URL, {
                endpoint: 'batch-maia3',
                fen,
            });

            if (!response.data.success) {
                return { error: 'NN server returned success: false' };
            }

            const out: Record<string, MaiaEvalResult> = {};
            for (const entry of response.data.results) {
                const { topMoves, uciEval } = entry.analysis;
                const policy: Record<string, number> = {};
                for (const { move, probability } of topMoves) policy[move] = probability;
                out[`maia_kdd_${entry.rating}`] = {
                    bestMove: topMoves[0]?.move ?? '',
                    policy,
                    value: uciEval?.value ?? 0.5,
                };
            }

            return { data: out };
        } catch (error) {
            return { error: `Maia batch request failed: ${String(error)}` };
        }
    }
}

export const chessAgineNNService = new ChessAgineNNService();
