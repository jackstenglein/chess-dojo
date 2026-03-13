import { z } from 'zod';

/** The maximum number of players in a round robin. */
export const MAX_ROUND_ROBIN_PLAYERS = 10;

/** The minimum number of players in a round robin. */
export const MIN_ROUND_ROBIN_PLAYERS = 4;

/** Verifies a request to register for the round robin. */
export const RoundRobinRegisterSchema = z.object({
    /** The cohort of the tournament. */
    cohort: z.string(),

    /** The Lichess username of the player registering. */
    lichessUsername: z.string(),

    /** The Chess.com username of the player registering. */
    chesscomUsername: z.string(),
});

/** A request to register for a round robin. */
export type RoundRobinRegisterRequest = z.infer<typeof RoundRobinRegisterSchema>;

/** Verifies a request to withdraw from a round robin. */
export const RoundRobinWithdrawSchema = z.object({
    /** The cohort of the round robin to withdraw from. */
    cohort: z.string(),

    /** The startsAt field of the round robin to withdraw from. */
    startsAt: z.string().regex(/^(ACTIVE|WAITING)/),
});

/** A request to withdraw from a round robin. */
export type RoundRobinWithdrawRequest = z.infer<typeof RoundRobinWithdrawSchema>;

/** Verifies a request to submit a game for a round robin. */
export const RoundRobinSubmitGameSchema = z.object({
    /** The cohort of the tournament. */
    cohort: z.string(),

    /** The startsAt field of the tournament. */
    startsAt: z.string().regex(/^ACTIVE/),

    /** The url of the game to submit. */
    url: z.string(),

    /** The usernames of the players in the game if usernames don't match. */
    manualUsernames: z.object({
        white: z.string(),
        black: z.string(),
    }).optional(),
});

/** A request to submit a game for a round robin. */
export type RoundRobinSubmitGameRequest = z.infer<typeof RoundRobinSubmitGameSchema>;

const roundRobinStatus = z.enum(['ACTIVE', 'WAITING', 'COMPLETE']);

/** The status of a round robin tournament. */
export type RoundRobinStatus = z.infer<typeof roundRobinStatus>;

/** The status of a round robin tournament. */
export const RoundRobinStatuses = roundRobinStatus.enum;

/** Verifies a request to list round robin tournaments. */
export const RoundRobinListSchema = z.object({
    /** The cohort to fetch tournaments in. */
    cohort: z.string(),

    /** Filters based on the status of the tournaments. */
    status: roundRobinStatus.optional(),

    /** The start key to use for pagination. */
    startKey: z.string().optional(),
});

/** A request to list round robin tournaments. */
export type RoundRobinListRequest = z.infer<typeof RoundRobinListSchema>;

export type RoundRobinWaitlist = Pick<
    RoundRobin,
    'type' | 'startsAt' | 'updatedAt' | 'cohort' | 'players' | 'name' | 'startEligibleAt'
>;

const RoundRobinPairingSchema = z.object({
    /** The username of the player with white. */
    white: z.string().optional(),
    /** The username of the player with black. */
    black: z.string().optional(),
    /** The result of the game. */
    result: z.union([z.literal('1-0'), z.literal('1/2-1/2'), z.literal('0-1')]).optional(),
    /** The URL of the game. */
    url: z.string().optional(),
});

export type RoundRobinPairing = z.infer<typeof RoundRobinPairingSchema>;

const roundRobinPlayerStatus = z.enum([
    /** The player is active in the tournament. */
    'ACTIVE',
    /** The player is withdrawn from the tournament. */
    'WITHDRAWN',
]);

export type RoundRobinPlayerStatus = z.infer<typeof roundRobinPlayerStatus>;

export const RoundRobinPlayerStatuses = roundRobinPlayerStatus.enum;

export const RoundRobinPlayerSchema = z.object({
    /** The username of the player. */
    username: z.string(),
    /** The Dojo display name of the player. */
    displayName: z.string(),
    /** The Lichess username of the player. */
    lichessUsername: z.string(),
    /** The Chess.com username of the player. */
    chesscomUsername: z.string(),
    /** The Discord username of the player registering. */
    discordUsername: z.string(),
    /** The Discord id of the player registering. */
    discordId: z.string(),
    /** The status of the player. */
    status: roundRobinPlayerStatus,
    /** The Stripe checkout session for players who paid to enter. */
    checkoutSession: z
        .object({
            /** The ID of the setup intent for the checkout session. */
            setup_intent: z.string().nullish(),
            /** The ID of the customer for the checkout session. */
            customer: z.string().nullish(),
        })
        .optional(),
    /** The price the user must pay when the tournament starts. */
    price: z.string().optional(),
});

export type RoundRobinPlayer = z.infer<typeof RoundRobinPlayerSchema>;

export const RoundRobinSchema = z.object({
    /** The hash key of the tournaments table. For round robins, this is the value ROUND_ROBIN_<cohort>. */
    type: z.string(),
    /**
     * The range key of the tournaments table. For round robins, this value has the following form:
     *   - If the tournament is running, it is ACTIVE_<ISO start date>
     *   - If the tournament is waiting, it is WAITING
     *   - If the tournament is over, it is COMPLETE_<ISO start date>
     */
    startsAt: z.string(),
    /** The cohort of the round robin. */
    cohort: z.string(),
    /**
     * The name of the tournament. For a waitlist, this is the number the tournament will have
     * once created.
     */
    name: z.string(),
    /** The start date of the tournament in ISO format. */
    startDate: z.string(),
    /** The end date of the tournament in ISO format. */
    endDate: z.string(),
    /**
     * The players in the tournament, mapped by their usernames.
     * A running round robin can only have MAX_ROUND_ROBIN_PLAYERS players.
     */
    players: z.record(z.string(), RoundRobinPlayerSchema),
    /** The order of the players' usernames in the tournament when pairing. */
    playerOrder: z.string().array(),
    /**
     * The pairings for the tournament. The first level of the array corresponds
     * to the round number. Once this field is set, the order of the pairings
     * never changes.
     */
    pairings: RoundRobinPairingSchema.array().array(),
    /**
     * The usernames of the winners of the tournament. Only set for completed tournaments.
     */
    winners: z.string().array().optional(),
    /** The time the tournament was last updated. */
    updatedAt: z.string(),
    /** The time the tournament reached enough registrations to be eligible to start. */
    startEligibleAt: z.string().optional(),
    /** Whether reminders were sent to players who did not submit games. */
    reminderSent: z.boolean().optional(),
    /** The ID of the scheduling thread on Discord. */
    discordThreadId: z.string().optional(),
});

export type RoundRobin = z.infer<typeof RoundRobinSchema>;

/** Stats for a player in a round robin tournament. */
export interface PlayerStats {
    /** The player's total score in the tournament so far. */
    score: number;
    /** The player's win count in the tournament so far. */
    wins: number;
    /** The player's draw count in the tournament so far. */
    draws: number;
    /** The player's loss count in the tournament so far. */
    losses: number;
    /** The number of games the player has played in the tournament so far. */
    played: number;
    /** The Sonneborn-Berger score of the player. https://en.wikipedia.org/wiki/Sonneborn%E2%80%93Berger_score */
    tiebreakScore: number;
}

/**
 * Calculates the PlayerStats for active players in the given tournament.
 * Only active players are included.
 * @param tournament The tournament to calculate the counts for.
 * @returns A map from username to stats for each active player in the tournament.
 */
export function calculatePlayerStats(tournament: RoundRobin) {
    const results: Record<string, PlayerStats> = {};

    for (const round of tournament.pairings) {
        for (const pairing of round) {
            if (
                !pairing.result ||
                !pairing.white ||
                !pairing.black ||
                tournament.players[pairing.white].status === RoundRobinPlayerStatuses.WITHDRAWN ||
                tournament.players[pairing.black].status === RoundRobinPlayerStatuses.WITHDRAWN
            ) {
                continue;
            }

            const white = results[pairing.white] || {
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                played: 0,
                tiebreakScore: 0,
            };
            const black = results[pairing.black] || {
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                played: 0,
                tiebreakScore: 0,
            };
            results[pairing.white] = white;
            results[pairing.black] = black;

            white.played++;
            black.played++;

            if (pairing.result === '1-0') {
                white.wins++;
                black.losses++;
            } else if (pairing.result === '1/2-1/2') {
                white.draws++;
                black.draws++;
            } else {
                white.losses++;
                black.wins++;
            }

            white.score = white.wins + white.draws / 2;
            black.score = black.wins + black.draws / 2;
        }
    }

    for (const round of tournament.pairings) {
        for (const pairing of round) {
            if (
                !pairing.result ||
                !pairing.white ||
                !pairing.black ||
                tournament.players[pairing.white].status === RoundRobinPlayerStatuses.WITHDRAWN ||
                tournament.players[pairing.black].status === RoundRobinPlayerStatuses.WITHDRAWN
            ) {
                continue;
            }

            if (pairing.result === '1-0') {
                results[pairing.white].tiebreakScore += results[pairing.black].score;
            } else if (pairing.result === '1/2-1/2') {
                results[pairing.white].tiebreakScore += 0.5 * results[pairing.black].score;
                results[pairing.black].tiebreakScore += 0.5 * results[pairing.white].score;
            } else {
                results[pairing.black].tiebreakScore += results[pairing.white].score;
            }
        }
    }

    return results;
}
