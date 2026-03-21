import { z } from 'zod';

/** A single question within a square color drill session. */
const squareColorQuestionSchema = z.object({
    /** The square that was shown (e.g. "g7"). */
    square: z.string(),
    /** The correct answer for the square. */
    correctAnswer: z.union([z.literal('white'), z.literal('black')]),
    /** The answer the user gave. */
    userAnswer: z.union([z.literal('white'), z.literal('black')]),
    /** Time in milliseconds the user took to answer. */
    responseTimeMs: z.number(),
});

/** Verifies the type of a request to submit a square color session. */
export const submitSquareColorSessionSchema = z.object({
    /** The total number of questions in the session. */
    totalQuestions: z.number(),
    /** The number of correct answers. */
    correctCount: z.number(),
    /** The average response time in milliseconds. */
    avgResponseTimeMs: z.number(),
    /** The best streak of consecutive correct answers. */
    bestStreak: z.number(),
    /** The total time for the session in seconds. */
    totalTimeSeconds: z.number(),
    /** The individual questions and answers. */
    questions: z.array(squareColorQuestionSchema),
});

/** A request to submit a square color drill session. */
export type SubmitSquareColorSessionRequest = z.infer<typeof submitSquareColorSessionSchema>;

/** A single question result within a square color session. */
export type SquareColorQuestion = z.infer<typeof squareColorQuestionSchema>;

/** The result of a square color drill session, as stored in DynamoDB. */
export interface SquareColorSessionResult extends SubmitSquareColorSessionRequest {
    /** The username of the user who completed the session. */
    username: string;
    /** The ISO 8601 timestamp when the session was created. */
    createdAt: string;
}
