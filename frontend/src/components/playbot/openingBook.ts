/**
 * Opening book via Posira API
 *
 * Uses https://api.posira.dev/api/v1/explorer filtered by rating bracket
 * to play human-like openings matching each Maia rating level.
 *
 * Strategy:
 *   - Active for the first OPENING_PLY_LIMIT half-moves (20 ply = 10 moves each)
 *   - Weighted-random selection from top moves proportional to play_rate,
 *     so the bot plays varied, realistic openings rather than always the top move
 *   - Falls back to Maia ONNX if Posira returns no moves or errors
 *   - Rate limit friendly: one call per bot move, max 20 calls per game,
 *     well within the 60 RPM free tier
 */

import { axiosService } from '../../api/axiosService';
import { MaiaRating } from './maiaengine';

/** Stop using the opening book after this many half-moves (plies) */
export const OPENING_PLY_LIMIT = 20;

const POSIRA_BASE = 'https://api.posira.dev/api/v1/explorer';

/**
 * Rating bracket mapping
 * Posira brackets: 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500
 * We map each Maia rating to the most representative bracket(s).
 * Using two adjacent brackets broadens the sample while keeping it realistic.
 */

const MAIA_TO_POSIRA_RATINGS: Record<MaiaRating, string> = {
    600: '1000',
    700: '1000',
    800: '1000',
    900: '1000',
    1000: '1000',
    1100: '1000',
    1200: '1000,1200',
    1300: '1200',
    1400: '1200,1400',
    1500: '1400,1600',
    1600: '1600',
    1700: '1600,1800',
    1800: '1800',
    1900: '1800,2000',
    2000: '2000',
    2100: '2000,2200',
    2200: '2200',
    2300: '2200,2500',
    2400: '2500',
    2500: '2500',
    2600: '2500',
};

interface PosiraMove {
    san: string;
    uci: string;
    games: number;
    play_rate: number;
    white_pct: number;
    draw_pct: number;
    black_pct: number;
}

interface PosiraResponse {
    moves: PosiraMove[];
}

/**
 * A function that picks a move proportional to play_rate so the bot plays varied openings. Moves with very low play_rate (<1%) are filtered out to avoid rare blunders.
 * @param moves the list of candidate moves from Posira, each with a play_rate indicating how often it's played at the given rating level
 * @returns the selected move or null if no valid moves are available
 */
function weightedRandomMove(moves: PosiraMove[]): PosiraMove | null {
    if (moves.length === 0) return null;

    const filtered = moves.filter((m) => m.play_rate >= 0.01);
    if (filtered.length === 0) return moves[0];

    const total = filtered.reduce((sum, m) => sum + m.play_rate, 0);
    let rand = Math.random() * total;

    for (const move of filtered) {
        rand -= move.play_rate;
        if (rand <= 0) return move;
    }
    return filtered[filtered.length - 1];
}

export interface OpeningBookResult {
    uci: string;
    san: string;
    source: 'book';
}

/**
 * Look up the best opening book move for the given FEN + Maia rating.
 * Returns null if outside opening range, no moves found, or on error.
 * @param fen the fen
 * @param maiaRating the maia rating
 * @param plyCount the ply count
 * @returns the selected opening move in UCI and SAN format, or null if no book move is available
 */
export async function getOpeningBookMove(
    fen: string,
    maiaRating: MaiaRating,
    plyCount: number,
): Promise<OpeningBookResult | null> {
    if (plyCount >= OPENING_PLY_LIMIT) return null;

    const ratings = MAIA_TO_POSIRA_RATINGS[maiaRating];

    try {
        const res = await axiosService.get<PosiraResponse>(POSIRA_BASE, {
            params: { fen, ratings, top_n: '12' },
            functionName: 'getPosiraExplorer',
        });
        const data = res.data;
        const chosen = weightedRandomMove(data.moves);
        if (!chosen) return null;

        return { uci: chosen.uci, san: chosen.san, source: 'book' };
    } catch {
        return null;
    }
}
