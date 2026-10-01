import { z } from 'zod';
import { Puzzle } from '../api';

/** The result of a single puzzle rush attempt, from the user's perspective. */
export const puzzleRushResultSchema = z.union([z.literal('win'), z.literal('loss')]);

/** The result of a single puzzle rush attempt, from the user's perspective. */
export type PuzzleRushResult = z.infer<typeof puzzleRushResultSchema>;

/** The reason a puzzle rush run ended. */
export const puzzleRushEndReasonSchema = z.union([
    z.literal('time'),
    z.literal('strikes'),
    z.literal('aborted'),
]);

/** The reason a puzzle rush run ended. */
export type PuzzleRushEndReason = z.infer<typeof puzzleRushEndReasonSchema>;

/** Verifies the type of a request to get the next puzzle in a puzzle rush run. */
export const getPuzzleRushPuzzleSchema = z.object({
    /** The rating to search around. Puzzles are sampled from a band centered on this rating. */
    rating: z.number(),
    /** The ids of puzzles already used in the run. These are excluded from the result. */
    excludeIds: z.string().array(),
});

/** A request to get the next puzzle in a puzzle rush run. */
export type GetPuzzleRushPuzzleRequest = z.infer<typeof getPuzzleRushPuzzleSchema>;

/** A puzzle served during a puzzle rush run. */
export type PuzzleRushPuzzle = Pick<Puzzle, 'id' | 'fen' | 'moves' | 'rating' | 'themes'>;

/** The response to a request to get the next puzzle in a puzzle rush run. */
export interface GetPuzzleRushPuzzleResponse {
    /** The next puzzle to play. */
    puzzle: PuzzleRushPuzzle;
}

/** A single puzzle attempt within a puzzle rush run. */
export const puzzleRushAttemptSchema = z.object({
    /** The id of the puzzle. */
    puzzleId: z.string(),
    /** The FEN of the starting position of the puzzle (before the opponent's setup move). */
    fen: z.string(),
    /** The moves of the puzzle solution, starting with the opponent's setup move. */
    moves: z.string().array().min(1),
    /** The rating of the puzzle. */
    puzzleRating: z.number(),
    /** The search rating in effect when the puzzle was served. */
    searchRating: z.number(),
    /** The result of the attempt. */
    result: puzzleRushResultSchema,
    /** The time the user spent on the puzzle, in seconds. */
    timeSpentSeconds: z.number(),
    /**
     * The user's final PGN on the puzzle. Only included on a loss, since a win
     * has the same PGN as the solution.
     */
    pgn: z.string().optional(),
});

/** A single puzzle attempt within a puzzle rush run. */
export type PuzzleRushAttempt = z.infer<typeof puzzleRushAttemptSchema>;

/** Verifies the type of a request to submit a puzzle rush run. */
export const submitPuzzleRushSessionSchema = z.object({
    /** The attempts made during the run, in order. */
    attempts: z.array(puzzleRushAttemptSchema),
    /** The total time of the run in seconds. */
    totalTimeSeconds: z.number(),
    /** The reason the run ended. */
    endReason: puzzleRushEndReasonSchema,
    /**
     * Optional client-generated timestamp. Allows the client to link to the review
     * page immediately after submitting.
     */
    createdAt: z.iso.datetime().optional(),
});

/** A request to submit a puzzle rush run. */
export type SubmitPuzzleRushSessionRequest = z.infer<typeof submitPuzzleRushSessionSchema>;

/** Server-computed statistics for a puzzle rush run. */
export interface PuzzleRushStats {
    /** The number of puzzles solved correctly. */
    correctCount: number;
    /** The total number of puzzles attempted. */
    totalCount: number;
    /** The percentage of puzzles solved correctly, rounded to the nearest integer (0-100). */
    percentage: number;
    /** The performance rating for the run. Undefined if no puzzles were attempted. */
    performanceRating?: number;
    /** The highest search rating reached during the run. */
    peakRating: number;
}

/** A puzzle rush run, as stored in DynamoDB. */
export interface PuzzleRushSession extends SubmitPuzzleRushSessionRequest, PuzzleRushStats {
    /** The username of the user who completed the run. */
    username: string;
    /** The ISO 8601 timestamp when the run was created. */
    createdAt: string;
}

/** The response to a request to submit a puzzle rush run. */
export interface SubmitPuzzleRushSessionResponse {
    /** The saved run. */
    session: PuzzleRushSession;
}

/** Verifies the type of a request to get a single puzzle rush run. */
export const getPuzzleRushSessionSchema = z.object({
    /** The createdAt timestamp of the run. */
    createdAt: z.string(),
});

/** A request to get a single puzzle rush run. */
export type GetPuzzleRushSessionRequest = z.infer<typeof getPuzzleRushSessionSchema>;

/** The response to a request to get a single puzzle rush run. */
export interface GetPuzzleRushSessionResponse {
    /** The requested run. */
    session: PuzzleRushSession;
}

/** Verifies the type of a request to list puzzle rush runs. */
export const listPuzzleRushSessionsSchema = z.object({
    /** The exclusive start key to use for pagination. */
    startKey: z.string().optional(),
});

/** A request to list puzzle rush runs. */
export type ListPuzzleRushSessionsRequest = z.infer<typeof listPuzzleRushSessionsSchema>;

/** The response to a request to list puzzle rush runs. */
export interface ListPuzzleRushSessionsResponse {
    /** The runs, most recent first. */
    sessions: PuzzleRushSession[];
    /** The last evaluated key to use for pagination. */
    lastEvaluatedKey?: string;
}
