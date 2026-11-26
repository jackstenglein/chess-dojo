import { z } from 'zod';

/**
 * Game 1 of the 2026 World Championship match starts on Tuesday, November 24,
 * 2026 at 15:00 in Geneva (CET, UTC+1). Predictions lock at this moment, on the
 * page and in the lead service.
 *
 * Checked November 13, 2026 against the FIDE ticket site (tickets.fide.com,
 * "Round 1, Tuesday 24 November, 15:00"), the FIDE match regulations
 * (Art. 4.6.1) and worldchess.com. The regulations let FIDE move the schedule,
 * so check again a few days before the match.
 */
export const WC_LOCK_AT_UTC = '2026-11-24T14:00:00Z';

/** Classical games in the match. */
export const WC_GAMES = 14;

/** The classical scores a visitor can pick. A match that goes to tiebreaks is 7-7. */
export const WC_DECISIVE_SCORES = ['7.5-6.5', '7.5-5.5', '7.5-4.5', '7.5-3.5+'] as const;
export const WC_TIED_SCORE = '7-7' as const;

export const WC_MAX_GAME_1_MOVES = 200;
export const WC_MAX_DISPLAY_NAME = 30;

export const WcPlayerId = z.enum(['gukesh', 'sindarov']);

export type WcPlayerId = z.infer<typeof WcPlayerId>;

/** The fields of a prediction, without the rules that tie them together. */
export const wcPicksShape = z.object({
    /** The match winner. */
    winner: WcPlayerId,
    /** Whether the match goes to tiebreaks. */
    tiebreaks: z.boolean(),
    /** The classical score. Always "7-7" when the pick is tiebreaks. */
    score: z.enum([...WC_DECISIVE_SCORES, WC_TIED_SCORE]),
    /** Classical games that end with a winner. */
    decisiveGames: z.number().int().min(0).max(WC_GAMES),
    /** The first classical game with a winner. */
    firstDecisiveGame: z.union([z.literal('none'), z.number().int().min(1).max(WC_GAMES)]),
    /** Tie-breaker: moves in Game 1. */
    game1Moves: z.number().int().min(1).max(WC_MAX_GAME_1_MOVES),
});

/** Verifies the picks of a World Championship prediction. */
export const wcPicksSchema = wcPicksShape.refine(
    (picks) => picks.tiebreaks === (picks.score === WC_TIED_SCORE),
    { path: ['score'], message: 'The score does not match the tiebreak pick.' },
);

/** The picks of a World Championship prediction. */
export type WcPicks = z.infer<typeof wcPicksSchema>;
