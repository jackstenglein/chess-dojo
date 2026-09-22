import { ChesscomGame } from '@/api/external/chesscom';
import { LichessGame } from '@/api/external/lichess';
import { OtbTournament } from '@/api/external/otb';
import { RatingSystem } from '@/database/user';

export type ResultOutcome = 'win' | 'loss' | 'draw';

/** Platforms with unified results: online (live fetch) and OTB (OTB service). */
export type ResultPlatform =
    | RatingSystem.Lichess
    | RatingSystem.Chesscom
    | RatingSystem.Fide
    | RatingSystem.Uscf;

export interface UnifiedResult {
    id: string;
    platform: ResultPlatform;
    url: string;
    /** Unix ms timestamp the game ended. */
    date: number;
    opponent: string;
    opponentRating?: number;
    myRating?: number;
    /** 'unknown' for USCF games where color wasn't recorded. */
    color: 'white' | 'black' | 'unknown';
    outcome: ResultOutcome;
    /** e.g. bullet/blitz/rapid/classical/daily. */
    timeClass: string;
}

const LICHESS_ABANDONED_STATUSES = new Set(['aborted', 'noStart']);

/**
 * Converts a Lichess game into a UnifiedResult from the given username's perspective.
 * Returns undefined for games that never really started (aborted/no moves played).
 */
export function toUnifiedLichessResult(
    game: LichessGame,
    username: string,
): UnifiedResult | undefined {
    if (LICHESS_ABANDONED_STATUSES.has(game.status)) {
        return undefined;
    }

    const lowerUsername = username.toLowerCase();
    const isWhite = game.players.white.user?.id === lowerUsername;
    const color: 'white' | 'black' = isWhite ? 'white' : 'black';
    const me = game.players[color];
    const opponentColor = color === 'white' ? 'black' : 'white';
    const opponent = game.players[opponentColor];

    let outcome: ResultOutcome;
    if (!game.winner) {
        outcome = 'draw';
    } else {
        outcome = game.winner === color ? 'win' : 'loss';
    }

    return {
        id: game.id,
        platform: RatingSystem.Lichess,
        url: `https://lichess.org/${game.id}`,
        date: game.lastMoveAt ?? game.createdAt,
        opponent:
            opponent.user?.name ??
            (opponent.aiLevel ? `Stockfish AI (${opponent.aiLevel})` : 'Anonymous'),
        opponentRating: opponent.rating,
        myRating: me.rating,
        color,
        outcome,
        timeClass: game.speed,
    };
}

const CHESSCOM_DRAW_RESULTS = new Set([
    'agreed',
    'repetition',
    'insufficient',
    'stalemate',
    '50move',
    'timevsinsufficient',
]);

/**
 * Converts a Chess.com game into a UnifiedResult from the given username's perspective.
 */
export function toUnifiedChesscomResult(game: ChesscomGame, username: string): UnifiedResult {
    const lowerUsername = username.toLowerCase();
    const isWhite = game.white.username.toLowerCase() === lowerUsername;
    const color: 'white' | 'black' = isWhite ? 'white' : 'black';
    const me = game[color];
    const opponent = game[color === 'white' ? 'black' : 'white'];

    let outcome: ResultOutcome;
    if (me.result === 'win') {
        outcome = 'win';
    } else if (CHESSCOM_DRAW_RESULTS.has(me.result)) {
        outcome = 'draw';
    } else {
        outcome = 'loss';
    }

    return {
        id: game.uuid,
        platform: RatingSystem.Chesscom,
        url: game.url,
        date: game.end_time * 1000,
        opponent: opponent.username,
        opponentRating: opponent.rating,
        myRating: me.rating,
        color,
        outcome,
        timeClass: game.time_class,
    };
}

export interface ResultsBreakdown {
    games: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
}

/** OTB time control (FIDE type / USCF system) to tab time class. */
function otbTimeClass(code?: string): string {
    switch ((code || '').toLowerCase()) {
        case 'standard':
        case 'r':
            return 'classical';
        case 'rapid':
        case 'q':
            return 'rapid';
        default:
            return 'blitz';
    }
}

function otbColor(color?: string): 'white' | 'black' | 'unknown' {
    const c = (color || '').toLowerCase();
    return c === 'white' || c === 'black' ? c : 'unknown';
}

function otbOutcome(score?: number): ResultOutcome | undefined {
    if (score === 1) return 'win';
    if (score === 0.5) return 'draw';
    if (score === 0) return 'loss';
    return undefined;
}

/**
 * Converts one FIDE tournament's per-opponent rows into unified results.
 * Multi-game aggregate rows are skipped (a result can't be attributed).
 */
export function toUnifiedFideResults(
    tournament: OtbTournament,
    index: number,
): UnifiedResult[] {
    const date = Date.parse(tournament.start || '') || 0;
    const out: UnifiedResult[] = [];
    (tournament.rounds || []).forEach((g, i) => {
        if (g.games !== 1) return;
        const outcome = otbOutcome(g.score);
        if (!outcome) return;
        out.push({
            id: `fide-${index}-${i}`,
            platform: RatingSystem.Fide,
            url: tournament.report_url || '',
            date,
            opponent: g.opp,
            opponentRating: g.rating && g.rating > 0 ? g.rating : undefined,
            myRating: undefined,
            color: otbColor(g.color),
            outcome,
            timeClass: otbTimeClass(tournament.rating_type),
        });
    });
    return out;
}

/**
 * Converts one USCF section's per-game rows into unified results.
 * Opponent ratings and per-game dates are not published by US Chess.
 */
export function toUnifiedUscfResults(
    section: OtbTournament,
    uscfId: string,
    index: number,
): UnifiedResult[] {
    const date = Date.parse(section.start || '') || 0;
    const out: UnifiedResult[] = [];
    (section.rounds || []).forEach((g, i) => {
        const outcome = otbOutcome(g.score);
        if (!outcome) return;
        out.push({
            id: `uscf-${index}-${i}`,
            platform: RatingSystem.Uscf,
            url: `https://ratings.uschess.org/player/${uscfId}`,
            date,
            opponent: g.opp,
            opponentRating: undefined,
            myRating: undefined,
            color: otbColor(g.color),
            outcome,
            timeClass: otbTimeClass(g.system),
        });
    });
    return out;
}

function summarize(results: UnifiedResult[]): ResultsBreakdown {
    const games = results.length;
    const wins = results.filter((r) => r.outcome === 'win').length;
    const losses = results.filter((r) => r.outcome === 'loss').length;
    const draws = games - wins - losses;
    const winRate = games > 0 ? (wins / games) * 100 : 0;
    return { games, wins, losses, draws, winRate };
}

export interface AggregatedResults {
    overall: ResultsBreakdown;
    byPlatform: Partial<Record<ResultPlatform, ResultsBreakdown>>;
    byTimeClass: Record<string, ResultsBreakdown>;
    byColor: Record<'white' | 'black', ResultsBreakdown>;
    /** Average rated opponent strength across all results with a known rating. */
    avgOpponentRating?: number;
    /** The longest run of consecutive wins across all results in the period. */
    bestWinStreak: number;
    /** The win against the highest-rated opponent (with a known rating) in the period, if any. */
    bestWin?: UnifiedResult;
}

/** Computes the longest run of consecutive wins. Order doesn't matter. */
function computeBestWinStreak(results: UnifiedResult[]): number {
    let best = 0;
    let current = 0;
    for (const result of results) {
        if (result.outcome === 'win') {
            current++;
            best = Math.max(best, current);
        } else {
            current = 0;
        }
    }
    return best;
}

/** The win against the highest-rated opponent (with a known rating), or undefined if there are none. */
function computeBestWin(results: UnifiedResult[]): UnifiedResult | undefined {
    let best: UnifiedResult | undefined;
    for (const result of results) {
        if (
            result.outcome !== 'win' ||
            result.opponentRating === undefined ||
            result.opponentRating <= 0
        ) {
            continue;
        }
        if (!best || result.opponentRating > (best.opponentRating ?? 0)) {
            best = result;
        }
    }
    return best;
}

/**
 * Aggregates the given results.
 */
export function aggregateResults(results: UnifiedResult[]): AggregatedResults {
    const byPlatform: AggregatedResults['byPlatform'] = {};
    const byTimeClassResults: Record<string, UnifiedResult[]> = {};

    for (const platform of [
        RatingSystem.Lichess,
        RatingSystem.Chesscom,
        RatingSystem.Fide,
        RatingSystem.Uscf,
    ] as const) {
        const platformResults = results.filter((r) => r.platform === platform);
        if (platformResults.length > 0) {
            byPlatform[platform] = summarize(platformResults);
        }
    }

    for (const result of results) {
        (byTimeClassResults[result.timeClass] ??= []).push(result);
    }

    const byTimeClass: Record<string, ResultsBreakdown> = {};
    for (const [timeClass, timeClassResults] of Object.entries(byTimeClassResults)) {
        byTimeClass[timeClass] = summarize(timeClassResults);
    }

    const byColor: AggregatedResults['byColor'] = {
        white: summarize(results.filter((r) => r.color === 'white')),
        black: summarize(results.filter((r) => r.color === 'black')),
    };

    const opponentRatings = results
        .map((r) => r.opponentRating)
        .filter((r): r is number => r !== undefined && r > 0);
    const avgOpponentRating =
        opponentRatings.length > 0
            ? opponentRatings.reduce((sum, r) => sum + r, 0) / opponentRatings.length
            : undefined;

    return {
        overall: summarize(results),
        byPlatform,
        byTimeClass,
        byColor,
        avgOpponentRating,
        bestWinStreak: computeBestWinStreak(results),
        bestWin: computeBestWin(results),
    };
}

/**
 * Returns the list of {year, month} pairs (as used by the Chess.com monthly
 * archive API) spanning from `windowDays` ago through the current month.
 */
export function getChesscomArchiveMonths(windowDays: number): { year: string; month: string }[] {
    const months: { year: string; month: string }[] = [];
    const start = new Date();
    start.setDate(start.getDate() - windowDays);

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const now = new Date();

    while (cursor <= now) {
        months.push({
            year: String(cursor.getFullYear()),
            month: String(cursor.getMonth() + 1).padStart(2, '0'),
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
}
