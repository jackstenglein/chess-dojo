import { z } from 'zod';

/**
 * The code a visitor gets after their three runs on the /rush page, and what it
 * takes off. The page shows it and the lead service emails it, so it lives here.
 * It is a Stripe promotion code: change it here when the sale behind it ends.
 */
export const RUSH_COUPON = {
    code: 'WCC2026',
    percentOff: 25,
} as const;

/** The result a visitor sends with their email when they ask for the code. */
export const rushResultSchema = z.object({
    /** Puzzles solved in the visitor's best run. */
    bestScore: z.number().int().min(0).max(500),
    /** Puzzles solved in each finished run, oldest first. */
    scores: z.array(z.number().int().min(0).max(500)).max(10).optional(),
});

export type RushResult = z.infer<typeof rushResultSchema>;
