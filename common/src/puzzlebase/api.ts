import { z } from 'zod';

/** The top-level buckets every theme belongs to. */
export const PUZZLEBASE_BUCKETS = [
    'Tactics',
    'Strategy',
    'Opening',
    'Middlegame',
    'Endgame',
] as const;

/** A puzzlebase bucket. */
export type PuzzlebaseBucket = (typeof PUZZLEBASE_BUCKETS)[number];

/**
 * The bucket groups. A puzzle has exactly one bucket from each group: it is either a tactic or a
 * strategy puzzle, and it is either an opening, middlegame or endgame puzzle.
 */
export const PUZZLEBASE_BUCKET_GROUPS: readonly (readonly string[])[] = [
    ['Tactics', 'Strategy'],
    ['Opening', 'Middlegame', 'Endgame'],
];

/** Returns the buckets that share a group with the given one, not including it. */
export function siblingBuckets(bucket: string): string[] {
    const group = PUZZLEBASE_BUCKET_GROUPS.find((g) => g.includes(bucket));
    return group ? group.filter((b) => b !== bucket) : [];
}

/** Returns the groups the buckets have no member of: what a puzzle still needs to be tagged with. */
export function missingBucketGroups(buckets: string[]): (readonly string[])[] {
    return PUZZLEBASE_BUCKET_GROUPS.filter((group) => !group.some((b) => buckets.includes(b)));
}

/**
 * The themes seeded into the taxonomy, grouped by bucket. A theme belongs to exactly one bucket.
 * Puzzle Contributors can add more themes to any bucket at runtime.
 */
export const DEFAULT_PUZZLEBASE_THEMES: Record<PuzzlebaseBucket, string[]> = {
    Tactics: [
        'Pin',
        'Fork',
        'Skewer',
        'Discovered attack',
        'Double check',
        'Deflection',
        'Attraction',
        'Interference',
        'Overloading',
        'Removing the defender',
        'Clearance',
        'Zwischenzug',
        'Trapped piece',
        'X-ray',
        'Sacrifice',
        'Back rank mate',
        'Smothered mate',
        'Mating net',
    ],
    Strategy: [
        'Weak squares',
        'Outpost',
        'Bad bishop',
        'Prophylaxis',
        'Piece activity',
        'Pawn structure',
        'Open file',
        'Space advantage',
        'Exchange sacrifice',
    ],
    Opening: ['Development', 'Opening trap', 'Center control', 'Gambit', 'Castling'],
    Middlegame: [
        'Attack on the king',
        'Pawn storm',
        'Minority attack',
        'Piece coordination',
        'Queenside majority',
        'Simplification',
    ],
    Endgame: [
        'Passed pawn',
        'Opposition',
        'Lucena',
        'Philidor',
        'Rook endgame',
        'Bishop endgame',
        'Knight endgame',
        'Pawn endgame',
        'Queen endgame',
        'Zugzwang',
        'Stalemate trick',
        'Fortress',
        'Attack on the king',
    ],
};

/** Verifies a puzzle result string (from White's perspective). */
export const PuzzleResultSchema = z.enum(['1-0', '0-1', '1/2-1/2', '*']);
export type PuzzleResult = z.infer<typeof PuzzleResultSchema>;

/** Verifies the shape of a puzzle in the puzzlebase. */
export const PuzzlebasePuzzleSchema = z.object({
    /** The zero-padded sequential id of the puzzle, e.g. 001. */
    id: z.string(),
    /** The starting position of the puzzle. The side to move is the solver. */
    fen: z.string(),
    /** The solution as PGN movetext from the FEN. The first main-line move is the answer. */
    solutionPgn: z.string(),
    /** The username of the annotator (the person who submitted the puzzle). */
    annotator: z.string(),
    /** The display name of the annotator. */
    annotatorDisplayName: z.string(),
    /** The source/composer of the puzzle: a person, book, study, etc. */
    composer: z.string().optional(),
    /** A link to the source of the puzzle. */
    composerUrl: z.string().optional(),
    /** The rating level of the puzzle. */
    rating: z.number(),
    /**
     * How long a quick solver takes to find the whole solution, in ms. It comes from beta data and
     * sets the speed factor of the score. Without it, time is not counted for the puzzle.
     */
    referenceMs: z.number().int().positive().optional(),

    /** The buckets the puzzle is tagged with. Always includes the bucket of every theme. */
    buckets: z.string().array(),
    /** The themes the puzzle is tagged with. */
    themes: z.string().array(),

    /** The name of the player with the white pieces in the source game. */
    white: z.string().optional(),
    /** The name of the player with the black pieces in the source game. */
    black: z.string().optional(),
    /** The result of the source game. */
    result: PuzzleResultSchema.optional(),
    /** The tournament or event of the source game. */
    event: z.string().optional(),
    /** The location of the source game. */
    site: z.string().optional(),
    /** The year of the source game. */
    year: z.number().int().optional(),

    /** A link to the Lichess study the puzzle was imported from, if any. */
    lichessStudyUrl: z.string().optional(),

    /**
     * Thumbs up and thumbs down from members who played the puzzle. They are kept apart from the
     * puzzle itself and added when it is read by a Puzzle Contributor, so they are never saved with
     * an edit.
     */
    upvotes: z.number().int().min(0).optional(),
    downvotes: z.number().int().min(0).optional(),
    /** The member's own vote on the puzzle, 1 or -1. Only in the puzzles sent to train on. */
    myVote: z.union([z.literal(1), z.literal(-1)]).optional(),

    /** The time the puzzle was created, in ISO 8601. */
    createdAt: z.string(),
    /** The time the puzzle was last updated, in ISO 8601. */
    updatedAt: z.string(),
});

/** A puzzle in the puzzlebase. */
export type PuzzlebasePuzzle = z.infer<typeof PuzzlebasePuzzleSchema>;

/** The editable metadata shared by create and update requests. */
const puzzleMetadataShape = {
    composer: z.string().trim().max(200).optional(),
    composerUrl: z.url().optional(),
    rating: z.number().int().min(0).max(3500),
    themes: z.string().array().max(30).default([]),
    buckets: z
        .string()
        .array()
        .max(PUZZLEBASE_BUCKETS.length + 10)
        .default([]),
    white: z.string().trim().max(100).optional(),
    black: z.string().trim().max(100).optional(),
    result: PuzzleResultSchema.optional(),
    event: z.string().trim().max(200).optional(),
    site: z.string().trim().max(200).optional(),
    year: z.number().int().min(1400).max(2200).optional(),
};

/** Verifies a request to create a single puzzle from a PGN. */
export const CreatePuzzleRequestSchema = z.object({
    /** A PGN for a single puzzle. Must have a [FEN] header; full games are rejected. */
    pgn: z.string().min(1),
    ...puzzleMetadataShape,
});
export type CreatePuzzleRequest = z.infer<typeof CreatePuzzleRequestSchema>;

/** Verifies a request to import every chapter of a public Lichess study as its own puzzle. */
export const ImportLichessStudyRequestSchema = z.object({
    /** The URL or id of the Lichess study. */
    study: z.string().min(1),
    /** Default rating applied to every imported puzzle. */
    rating: z.number().int().min(0).max(3500),
});
export type ImportLichessStudyRequest = z.infer<typeof ImportLichessStudyRequestSchema>;

/**
 * Verifies a request to update a puzzle. Only the fields that are present are changed. Sending
 * `solutionPgn` replaces the puzzle's position and solution: the position is read from its [FEN]
 * header and every move must be legal from it.
 */
export const UpdatePuzzleRequestSchema = z.object({
    id: z.string(),
    solutionPgn: z.string().min(1).optional(),
    rating: puzzleMetadataShape.rating.optional(),
    composer: puzzleMetadataShape.composer,
    composerUrl: puzzleMetadataShape.composerUrl,
    themes: z.string().array().max(30).optional(),
    buckets: z
        .string()
        .array()
        .max(PUZZLEBASE_BUCKETS.length + 10)
        .optional(),
    white: puzzleMetadataShape.white,
    black: puzzleMetadataShape.black,
    result: puzzleMetadataShape.result,
    event: puzzleMetadataShape.event,
    site: puzzleMetadataShape.site,
    year: puzzleMetadataShape.year,
});
export type UpdatePuzzleRequest = z.infer<typeof UpdatePuzzleRequestSchema>;

/** Verifies a request to add a new theme to a bucket. */
export const CreateThemeRequestSchema = z.object({
    bucket: z.string(),
    theme: z.string().trim().min(2).max(40),
});
export type CreateThemeRequest = z.infer<typeof CreateThemeRequestSchema>;

/** Verifies a request to delete a theme from a bucket. For puzzle admins. */
export const DeleteThemeRequestSchema = z.object({
    bucket: z.string(),
    theme: z.string().trim().min(1).max(40),
});
export type DeleteThemeRequest = z.infer<typeof DeleteThemeRequestSchema>;

/** What deleting a theme did. */
export interface DeleteThemeResponse {
    taxonomy: PuzzlebaseTaxonomy;
    /** How many puzzles lost the theme. */
    puzzlesChanged: number;
}

/** The kinds of action puzzle admins take that are written to the admin log. */
export type AdminActionType =
    | 'DELETE_THEME'
    | 'APPROVE_CONTRIBUTOR'
    | 'DENY_CONTRIBUTOR'
    | 'REVOKE_CONTRIBUTOR'
    | 'ADD_CONTRIBUTOR';

/** One entry of the admin log: something a puzzle admin did. */
export interface AdminAction {
    /** When it happened, ISO 8601. */
    at: string;
    username: string;
    displayName: string;
    type: AdminActionType;
    /** A sentence saying what happened, e.g. 'Deleted the theme "Pin" from Tactics (12 puzzles)'. */
    summary: string;
}

/** The taxonomy of buckets and their themes. */
export interface PuzzlebaseTaxonomy {
    /** Maps each bucket to its themes. */
    buckets: Record<string, string[]>;
}

/** Verifies a request to apply to become a Puzzle Contributor. */
export const ApplyToContributeRequestSchema = z.object({
    /** Why the user wants to contribute puzzles. */
    message: z.string().trim().max(1000).optional(),
});
export type ApplyToContributeRequest = z.infer<typeof ApplyToContributeRequestSchema>;

/** The approval status of a Puzzle Contributor. */
export const ContributorStatusSchema = z.enum(['PENDING', 'APPROVED', 'DENIED', 'REVOKED']);
export type ContributorStatus = z.infer<typeof ContributorStatusSchema>;

/** A user's standing as a Puzzle Contributor, including their leaderboard count. */
export interface PuzzlebaseContributor {
    username: string;
    displayName: string;
    status: ContributorStatus;
    /** ADMIN for Dojo admins, who are always contributors and cannot be denied or removed. */
    role?: 'ADMIN';
    /** Why the user wants to contribute puzzles. */
    message?: string;
    /** The number of puzzles this user has contributed. */
    puzzleCount: number;
    createdAt: string;
}

/**
 * Returns the buckets a puzzle should have, given its selected buckets and themes. A theme brings
 * its bucket with it unless the puzzle already has a bucket the theme is listed under. A theme
 * listed under several buckets brings the first one.
 */
export function resolveBuckets(
    taxonomy: PuzzlebaseTaxonomy,
    buckets: string[],
    themes: string[],
): string[] {
    const result = new Set<string>();
    // Explicit buckets keep one per group: the first one given.
    for (const bucket of buckets) {
        if (!siblingBuckets(bucket).some((sibling) => result.has(sibling))) {
            result.add(bucket);
        }
    }
    for (const theme of themes) {
        const listedUnder = Object.entries(taxonomy.buckets)
            .filter(([, bucketThemes]) => bucketThemes.includes(theme))
            .map(([bucket]) => bucket);
        if (listedUnder.length > 0 && !listedUnder.some((bucket) => result.has(bucket))) {
            // The theme brings its bucket only if the puzzle has none from that group yet.
            const bucket = listedUnder.find(
                (b) => !siblingBuckets(b).some((sibling) => result.has(sibling)),
            );
            if (bucket) {
                result.add(bucket);
            }
        }
    }
    return [...result];
}

/**
 * Formats a sequential puzzle number as a zero-padded id (001, 002, ... 1000).
 */
export function formatPuzzleId(n: number): string {
    return String(n).padStart(3, '0');
}

/** The tag filters applied to the puzzlebase list. */
export interface PuzzlebaseFilters {
    /** Buckets a puzzle must all have. */
    buckets: string[];
    /** Themes a puzzle must all have. */
    themes: string[];
}

/**
 * Returns true if the puzzle has every selected bucket and every selected theme.
 * An empty filter matches every puzzle.
 */
export function matchesFilters(
    puzzle: Pick<PuzzlebasePuzzle, 'buckets' | 'themes'>,
    filters: PuzzlebaseFilters,
): boolean {
    return (
        filters.buckets.every((b) => puzzle.buckets.includes(b)) &&
        filters.themes.every((t) => puzzle.themes.includes(t))
    );
}

/** A line of the puzzlebase contributor leaderboard. */
export interface LeaderboardEntry {
    username: string;
    displayName: string;
    puzzleCount: number;
}

/** The caller's ability to add puzzles. */
export interface ContributorStatusResponse {
    /** Whether the caller can add and edit puzzles: they are a Puzzle Contributor or an admin. */
    canContribute: boolean;
    /**
     * Whether the caller can train on the puzzles. Contributors and admins always can; everyone else
     * only once training is opened to all members.
     */
    canTrain: boolean;
    /** Whether the caller is a Dojo admin, and so can approve Puzzle Contributors. */
    isAdmin: boolean;
    /** The caller's contributor record, if they have applied. */
    contributor?: PuzzlebaseContributor;
}

/** Whether a user is a Puzzle Contributor, for the badge on their profile. */
export interface ContributorProfileResponse {
    isContributor: boolean;
    /** How many puzzles they have added. */
    puzzleCount: number;
}

/** The result of adding a puzzle from a PGN. */
export interface CreatePuzzleResponse {
    puzzle: PuzzlebasePuzzle;
    /** Things in the PGN that were ignored, such as a tag that is not a real theme. */
    warnings: string[];
}

/** The result of importing a Lichess study. */
export interface ImportLichessStudyResponse {
    /** The puzzles that were created, one per usable chapter. */
    puzzles: PuzzlebasePuzzle[];
    /** The chapters that could not be imported, and why. */
    skipped: { chapter: number; title?: string; reason: string }[];
    /** Things ignored in chapters that were imported, such as a tag that is not a real theme. */
    warnings: { chapter: number; title?: string; message: string }[];
}
