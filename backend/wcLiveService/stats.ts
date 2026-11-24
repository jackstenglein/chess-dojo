import { isWcSensei, WcRoundRequestSchema } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parsePathParameters,
    requireUserInfo,
} from '../directoryService/api';
import { getUser } from '../directoryService/database';
import { getPlayed, GuessLogEntry, isLocal, listGuessItems, listGuessLog, ok } from './database';
import { getRoundState } from './lichess';

/** A right guess made less than this long before the move was seen is worth a look. */
export const CLOSE_CALL_SECONDS = 5;

export interface GuessStatsDetail {
    ply: number;
    uci: string;
    /** When the guess was last set. */
    guessedAt?: string;
    /** When the server first saw the move. */
    playedAt?: string;
    /** Seconds from the guess to the move. Small or negative is suspicious. */
    leadSeconds?: number;
}

export interface GuessStatsRow {
    username: string;
    displayName: string;
    correct: number;
    guessed: number;
    /** Every guess and change of mind in this game. */
    changes: number;
    /** Right guesses made less than CLOSE_CALL_SECONDS before the move was seen. */
    closeCalls: number;
    medianLeadSeconds?: number;
    /** The right guesses, with their timing. */
    details: GuessStatsDetail[];
}

function median(values: number[]): number | undefined {
    if (values.length === 0) {
        return undefined;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * For each user, their right guesses and how long before the move each was
 * made. The most suspicious come first: the most close calls, then the most
 * right guesses.
 */
export function computeGuessStats(
    played: string[],
    playedAt: Record<number, string>,
    items: {
        username: string;
        displayName: string;
        guesses: Record<string, string>;
        times: Record<string, string>;
    }[],
    log: GuessLogEntry[],
): GuessStatsRow[] {
    const rows = items.map((item): GuessStatsRow => {
        const details: GuessStatsDetail[] = [];
        let guessed = 0;
        for (const [plyKey, uci] of Object.entries(item.guesses)) {
            const ply = parseInt(plyKey);
            if (ply < 1 || ply > played.length) {
                continue;
            }
            guessed++;
            if (played[ply - 1] !== uci) {
                continue;
            }
            const guessedAt = item.times[plyKey];
            const seenAt = playedAt[ply];
            details.push({
                ply,
                uci,
                guessedAt,
                playedAt: seenAt,
                leadSeconds:
                    guessedAt && seenAt
                        ? Math.round((Date.parse(seenAt) - Date.parse(guessedAt)) / 100) / 10
                        : undefined,
            });
        }
        details.sort((a, b) => a.ply - b.ply);
        const leads = details.flatMap((d) => (d.leadSeconds === undefined ? [] : [d.leadSeconds]));
        return {
            username: item.username,
            displayName: item.displayName,
            correct: details.length,
            guessed,
            changes: log.filter((l) => l.username === item.username).length,
            closeCalls: leads.filter((l) => l < CLOSE_CALL_SECONDS).length,
            medianLeadSeconds: median(leads),
            details,
        };
    });
    return rows
        .filter((r) => r.guessed > 0)
        .sort((a, b) => b.closeCalls - a.closeCalls || b.correct - a.correct);
}

/** Admins only. Locally, where there is no users table, the senseis count as admins. */
async function requireAdmin(event: Parameters<APIGatewayProxyHandlerV2>[0]): Promise<void> {
    const { username } = requireUserInfo(event);
    const admin = isLocal ? isWcSensei(username) : (await getUser(username)).isAdmin;
    if (!admin) {
        throw new ApiError({ statusCode: 403, publicMessage: 'Guess stats are for admins only' });
    }
}

/** GET /wc-live/rounds/{roundId}/stats: when everyone guessed, against when each move came in. */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        await requireAdmin(event);
        const { roundId } = parsePathParameters(event, WcRoundRequestSchema);
        const state = await getRoundState(roundId);
        const [playedAt, items, log] = await Promise.all([
            getPlayed(roundId),
            listGuessItems(roundId),
            listGuessLog(roundId),
        ]);
        return ok({
            roundId,
            plies: state.played.length,
            closeCallSeconds: CLOSE_CALL_SECONDS,
            playedAt,
            rows: computeGuessStats(state.played, playedAt, items, log),
            guessCount: log.length,
        });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
