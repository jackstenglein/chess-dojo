import { z } from 'zod';
import { User } from '../database/user';

/** Verifies the type of a request to get the next puzzle. */
export const nextPuzzleRequestSchema = z.object({
    /** The results of the previous puzzle the user just played, if applicable. */
    previousPuzzle: z
        .object({
            /** The id of the puzzle. */
            id: z.string(),
            /** The result of the puzzle, from the player's perspective. */
            result: z.union([z.literal('win'), z.literal('draw'), z.literal('loss')]),
            /** The time spent on the puzzle. */
            timeSpentSeconds: z.number(),
            /**
             * The user's final PGN on the puzzle. This is only included if the user lost the puzzle,
             * as a win or draw would be the same PGN as the solution.
             */
            pgn: z.string().optional(),
            /** Whether the puzzle was rated or not. */
            rated: z.boolean(),
        })
        .optional(),
    /** The themes that the next puzzle must be in. The puzzle must match any of the themes. */
    themes: z.string().array().min(1).optional(),
    /** The rough rating level of the next puzzle, relative to the user's rating. */
    relativeRating: z.array(z.number()).length(2).optional(),
    /**
     * If included, the next puzzle will be fetched by this ID. The themes and relativeRating
     * parameters will be ignored.
     */
    nextId: z.string().optional(),
});

/** A request to get the next puzzle. */
export type NextPuzzleRequest = z.infer<typeof nextPuzzleRequestSchema>;

export interface Puzzle {
    /** The ID of the puzzle. */
    _id: string;
    /** The ID of the puzzle. */
    id: string;
    /** The FEN of the starting position of the puzzle. */
    fen: string;
    /** The moves to play in the puzzle, starting with the opponent's first move. */
    moves: string[];
    /** The current rating of the puzzle. */
    rating: number;
    /** The rating deviation of the puzzle. */
    ratingDeviation: number;
    /** The volatility of the puzzle. */
    volatility: number;
    /** The number of times the puzzle has been played. */
    plays: number;
    /** The number of times the puzzle has been successfully completed. */
    successfulPlays: number;
    /** The themes of the puzzle. */
    themes: string[];
    /**
     * Uniform random key in [0, 1) used for efficient random selection.
     * Present on puzzles uploaded for Dojo Rush (non-mate corpus).
     */
    random?: number;
}

/** The response to get the next puzzle. */
export interface NextPuzzleResponse {
    /** The next puzzle to play. */
    puzzle: Puzzle;
    /** The updated user. */
    user: Pick<User, 'puzzles' | 'ratingSystem' | 'ratings'>;
}

export interface PuzzleHistory {
    /** The username of the user that took the puzzle. */
    username: string;
    /** The time the user took the puzzle, in ISO 8601. */
    createdAt: string;
    /** The id of the puzzle that the user took. */
    id: string;
    /** The FEN of the puzzle. */
    fen: string;
    /** The rating of the puzzle, at the time the user took it. */
    puzzleRating: number;
    /** The result of the puzzle, from the user's perspective. */
    result: 'win' | 'draw' | 'loss';
    /** The amount of time the user spent on the puzzle. */
    timeSpentSeconds: number;
    /**
     * The user's final PGN on the puzzle. This is only included if the user lost the puzzle,
     * as a win or draw would be the same PGN as the solution. */
    pgn?: string;
    /** Whether the puzzle was rated or not. */
    rated: boolean;
    /** The user's rating after taking the puzzle. */
    rating: number;
    /** The rating change from taking the puzzle. */
    ratingChange: number;
}

/** Verifies the type of a request to get puzzle history. */
export const getPuzzleHistorySchema = z.object({
    /** The username to fetch puzzle history for. If not included, defaults to the calling user. */
    username: z.string().optional(),
    /** The exclusive start key to use for pagination. */
    startKey: z.string().optional(),
});

/** A request to get puzzle history. */
export type GetPuzzleHistoryRequest = z.infer<typeof getPuzzleHistorySchema>;

export interface GetPuzzleHistoryResponse {
    /** The history for the requested user. */
    history: PuzzleHistory[];
    /** The last evaluated key to use for pagination. */
    lastEvaluatedKey?: string;
}
