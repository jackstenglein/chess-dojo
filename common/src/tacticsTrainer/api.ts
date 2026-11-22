import { z } from 'zod';

/** The three Tactics Forger tabs, each with its own rating and rank. */
export const tacticsForgerTracks = ['tactics', 'openings', 'endgames'] as const;

/** A player's standing in one Tactics Forger tab. */
const trackSummarySchema = z.object({
    /** Unique puzzles in this tab solved on the first try. */
    solved: z.number().int().nonnegative(),
    /** The tab's rating, or null before any puzzle in the tab has been played. */
    rating: z.number().nullable(),
    /** The tab's rank name (e.g. "Grasshopper"). */
    rank: z.string().max(40),
});

/**
 * The numbers shown on the Tactics Forger leaderboard. The app computes them from the
 * player's progress and sends them with every save.
 */
export const tacticsForgerSummarySchema = z.object({
    /** Unique puzzles solved on the first try, across all tabs. */
    solved: z.number().int().nonnegative(),
    /** Ladder sets cleared (8/10 or better). */
    setsCleared: z.number().int().nonnegative(),
    /** Stars earned across all ladder sets. */
    stars: z.number().int().nonnegative(),
    /** Puzzle attempts played. */
    attempts: z.number().int().nonnegative(),
    /** Share of attempts solved on the first try, 0–1, or null with no attempts. */
    accuracy: z.number().min(0).max(1).nullable(),
    /** Average time per puzzle in milliseconds, or null with no attempts. */
    avgMs: z.number().nonnegative().nullable(),
    /** Experience points. */
    xp: z.number().nonnegative(),
    /** Per-tab solved count, rating and rank. */
    tracks: z.object({
        tactics: trackSummarySchema,
        openings: trackSummarySchema,
        endgames: trackSummarySchema,
    }),
});

/** The numbers shown on the Tactics Forger leaderboard. */
export type TacticsForgerSummary = z.infer<typeof tacticsForgerSummarySchema>;

/** Verifies a request to save the caller's Tactics Forger progress. */
export const saveTacticsForgerProgressSchema = z.object({
    /**
     * The app's whole saved state (ladders, puzzle records, sessions, settings). It is
     * stored as-is; the app owns its shape.
     */
    progress: z.record(z.string(), z.unknown()),
    /**
     * The version this save is based on: the version returned by the last load or save,
     * or 0 when the caller has never saved. A mismatch means another device saved first,
     * and the request fails with 409 so the app can load, merge and save again.
     */
    baseVersion: z.number().int().nonnegative(),
    /** The leaderboard numbers for this progress. */
    summary: tacticsForgerSummarySchema,
});

/** A request to save the caller's Tactics Forger progress. */
export type SaveTacticsForgerProgressRequest = z.infer<typeof saveTacticsForgerProgressSchema>;

/** The response to a save. */
export interface SaveTacticsForgerProgressResponse {
    /** The new version. Send it as `baseVersion` with the next save. */
    version: number;
    /** When the progress was saved, as an ISO timestamp. */
    updatedAt: string;
}

/** The response to loading the caller's Tactics Forger progress. */
export interface GetTacticsForgerProgressResponse {
    /** The saved state, or null when the caller has never saved. */
    progress: Record<string, unknown> | null;
    /** The saved version, or 0 when the caller has never saved. */
    version: number;
    /** When the progress was last saved, as an ISO timestamp. */
    updatedAt?: string;
}

/** One player on the Tactics Forger leaderboard. */
export interface TacticsForgerLeaderboardRow extends TacticsForgerSummary {
    /** The player's username. */
    username: string;
    /** The player's display name. */
    displayName: string;
    /** The player's current Dojo cohort, if any. */
    cohort?: string;
    /** When the player last saved, as an ISO timestamp. */
    updatedAt: string;
}

/** The response to loading the Tactics Forger leaderboard. */
export interface GetTacticsForgerLeaderboardResponse {
    /** Every player who has saved Tactics Forger progress. */
    players: TacticsForgerLeaderboardRow[];
}
