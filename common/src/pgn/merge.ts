import { z } from 'zod';

const pgnMergeType = z.enum([
    /** The merged PGN's move data is merged with existing move data. */
    'MERGE',
    /** The merged PGN's move data is discarded. */
    'DISCARD',
    /** The merged PGN's move data overwrites existing move data. */
    'OVERWRITE',
]);

export type PgnMergeType = z.infer<typeof pgnMergeType>;

export const PgnMergeTypes = pgnMergeType.enum;

/** Verifies a request to merge a PGN into a game. */
export const PgnMergeSchema = z.object({
    /** The cohort of the game to merge the PGN into. */
    cohort: z.string(),

    /** The id of the game to merge the PGN into. */
    id: z.string(),

    /** The PGN to merge into the game. */
    pgn: z.string(),

    /** How to handle the comments from the merged PGN. Defaults to MERGE. */
    commentMergeType: pgnMergeType
        .optional()
        .transform((val) => val || PgnMergeTypes.MERGE),

    /** How to handle the NAGs from the merged PGN. Defaults to MERGE. */
    nagMergeType: pgnMergeType.optional().transform((val) => val || PgnMergeTypes.MERGE),

    /** How to handle the drawables from the merged PGN. Defaults to MERGE. */
    drawableMergeType: pgnMergeType
        .optional()
        .transform((val) => val || PgnMergeTypes.MERGE),

    /** Whether to cite the original game in a comment at the end of the added line. */
    citeSource: z.boolean().optional(),

    /** The cohort of the source game the PGN comes from. */
    sourceCohort: z.string().optional(),

    /** The id of the source game the PGN comes from. */
    sourceId: z.string().optional(),
});

/** A request to merge a PGN into a game. */
export type PgnMergeRequest = z.infer<typeof PgnMergeSchema>;

/** Identifies a game by its cohort and id. */
const gameKeySchema = z.object({
    /** The cohort of the game. */
    cohort: z.string(),

    /** The id of the game. */
    id: z.string(),
});

/** Verifies a request to merge multiple games into a single new game. */
export const MergeMultipleSchema = z.object({
    /** The games to merge. Must contain at least 2 games with unique cohort/id pairs. */
    games: z
        .array(gameKeySchema)
        .min(2)
        // Cap at 20 to limit Lambda execution time (recursive PGN merge is CPU-bound)
        // while still covering realistic use cases like merging a full tournament.
        .max(20)
        .refine(
            (games) => {
                const keys = new Set<string>();
                for (const g of games) {
                    const key = `${g.cohort}/${g.id}`;
                    if (keys.has(key)) return false;
                    keys.add(key);
                }
                return true;
            },
            { message: 'games array must not contain duplicate cohort/id pairs' },
        ),

    /** Which game's headers to use for the merged game. Must be one of the games in the list. */
    headerSource: gameKeySchema,

    /** How to handle the comments from the merged games. Defaults to MERGE. */
    commentMergeType: pgnMergeType.default(PgnMergeTypes.MERGE),

    /** How to handle the NAGs from the merged games. Defaults to MERGE. */
    nagMergeType: pgnMergeType.default(PgnMergeTypes.MERGE),

    /** How to handle the drawables from the merged games. Defaults to MERGE. */
    drawableMergeType: pgnMergeType.default(PgnMergeTypes.MERGE),

    /** Whether to cite each source game in a comment at the end of its main line. Defaults to false. */
    citeSource: z.boolean().optional(),
});

/** A request to merge multiple games into a single new game. */
export type MergeMultipleRequest = z.infer<typeof MergeMultipleSchema>;
