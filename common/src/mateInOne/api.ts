import { z } from 'zod';

/** A single puzzle attempt within a mate-in-one drill session. */
const mateInOneAttemptSchema = z.object({
    /** The Lichess puzzle ID. */
    puzzleId: z.string(),
    /** The FEN after the setup move (the position the user must solve). */
    fen: z.string(),
    /** The correct mating move in SAN notation. */
    correctMove: z.string(),
    /** The move the user entered. */
    userMove: z.string(),
    /** Whether the user's answer was correct. */
    isCorrect: z.boolean(),
    /** Time in milliseconds the user took to answer. */
    responseTimeMs: z.number(),
});

/** Verifies the type of a request to submit a mate-in-one session. */
export const submitMateInOneSessionSchema = z.object({
    /** The total number of puzzles in the session. */
    totalPuzzles: z.number(),
    /** The number of correct answers. */
    correctCount: z.number(),
    /** The average response time in milliseconds. */
    avgResponseTimeMs: z.number(),
    /** The total time for the session in seconds. */
    totalTimeSeconds: z.number(),
    /** The individual puzzle attempts. */
    attempts: z.array(mateInOneAttemptSchema),
    /** Optional client-generated timestamp to allow updating the same session record. */
    createdAt: z.iso.datetime().optional(),
});

/** A request to submit a mate-in-one drill session. */
export type SubmitMateInOneSessionRequest = z.infer<typeof submitMateInOneSessionSchema>;

/** A single puzzle attempt within a mate-in-one session. */
export type MateInOneAttempt = z.infer<typeof mateInOneAttemptSchema>;

/** The result of a mate-in-one drill session, as stored in DynamoDB. */
export interface MateInOneSessionResult extends SubmitMateInOneSessionRequest {
    /** The username of the user who completed the session. */
    username: string;
    /** The ISO 8601 timestamp when the session was created. */
    createdAt: string;
    /** The server-computed rating for this block, present only on full 10-puzzle blocks. */
    rating?: number;
}

/** A mate-in-one puzzle from the Lichess database. */
export interface MateInOnePuzzle {
    /** The Lichess puzzle ID. */
    id: string;
    /** The FEN before the setup move. */
    fen: string;
    /** The move sequence: moves[0] is the setup move, moves[1] is the mating move. */
    moves: string[];
}

/** Response from fetching a mate-in-one puzzle. */
export interface GetMateInOnePuzzleResponse {
    /** The puzzle to solve. */
    puzzle: MateInOnePuzzle;
}

/** Response from submitting a mate-in-one session. */
export interface SubmitMateInOneSessionResponse {
    /**
     * The server-computed rating for this 10-puzzle block. Omitted on partial-block
     * (aborted) submissions where attempts.length < 10.
     */
    rating?: number;
}
