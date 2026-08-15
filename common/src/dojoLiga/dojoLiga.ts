import { z } from 'zod';

/** Verifies the type of a request to get the DojoLiga leaderboard. */
export const GetDojoLigaLeaderboardSchema = z.object({
    month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
});

/** A request to get the DojoLiga leaderboard. */
export type GetDojoLigaLeaderboardRequest = z.infer<typeof GetDojoLigaLeaderboardSchema>;

/** A DojoLiga leaderboard. */
export interface Leaderboard {
    /** The partition key of the Dynamo table. */
    type: 'DOJO_LIGA';
    /** The month of the leaderboard in YYYY-MM format and the range key of the Dynamo table. */
    startsAt: string;
    /** The tournaments in the leaderboard, mapped by lichess id. */
    tournaments: Record<string, Tournament>;
    /** The players in the leaderboard, mapped by lichess username. */
    players: Record<string, Player>;
}

/** A tournament in the DojoLiga leaderboard. */
export interface Tournament {
    /** The lichess id of the tournament. */
    id: string;
    /** The name of the tournament. */
    name: string;
    /** The date of the tournament. */
    date: string;
    /** Whether the tournament is a DojoLiga tournament. */
    dojoLiga: boolean;
    /** The point multiplier for the tournament. */
    multiplier: number;
}

/** A player in the DojoLiga leaderboard. */
export interface Player {
    /** The lichess username of the player. */
    lichess: string;
    /** The player's total score. */
    score: number;
    /** The player's score from DojoLiga events. */
    dojoLigaScore: number;
    /** The tournaments the player participated in. */
    tournaments: PlayerTournament[];
}

/** A tournament that a player participated in. */
export interface PlayerTournament {
    /** The id of the tournament. */
    id: string;
    /** The 1-based index of the player. Player 1 won the tournament. */
    rank: number;
    /** The points the player received for the tournament. */
    points: number;
}
