import {
    CreatePuzzleRequest,
    DEFAULT_PUZZLEBASE_THEMES,
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
    resolveBuckets,
    UpdatePuzzleRequest,
} from './api';
import { ParsedPuzzlePgn, parsePuzzlePgn } from './parse';
import { describeUnknownTag, resolveTagNames } from './pgnTags';
import { canonicalTheme } from './tags';

/** Returns a copy of the built-in taxonomy: the buckets and themes puzzles start with. */
export function defaultTaxonomy(): PuzzlebaseTaxonomy {
    return {
        buckets: Object.fromEntries(
            Object.entries(DEFAULT_PUZZLEBASE_THEMES).map(([bucket, themes]) => [
                bucket,
                [...themes],
            ]),
        ),
    };
}

/** Cleans up a user-entered theme name: trims, collapses whitespace, and capitalizes it. */
export function normalizeThemeName(theme: string): string {
    const cleaned = theme.trim().replace(/\s+/g, ' ');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Adds a theme to a bucket. A theme can be listed under several buckets, and it is the same theme
 * under each: the puzzles tagged with it show up whichever bucket it was picked from. If another
 * bucket already has a theme with this name, ignoring case, it is listed here too, spelled as it
 * is there.
 * @throws Error with a user-facing message if the bucket is unknown or already has the theme.
 */
export function addThemeToTaxonomy(
    taxonomy: PuzzlebaseTaxonomy,
    bucket: string,
    theme: string,
): PuzzlebaseTaxonomy {
    if (!(bucket in taxonomy.buckets)) {
        throw new Error(`Unknown bucket: ${bucket}`);
    }

    const typed = normalizeThemeName(theme);
    if (typed.length < 2) {
        throw new Error('A theme name needs at least 2 characters.');
    }

    const name = canonicalTheme(taxonomy, typed) ?? typed;
    if (taxonomy.buckets[bucket].some((t) => t.toLowerCase() === name.toLowerCase())) {
        throw new Error(`"${name}" is already in ${bucket}.`);
    }

    return {
        buckets: { ...taxonomy.buckets, [bucket]: [...taxonomy.buckets[bucket], name] },
    };
}

/**
 * Removes a theme from a bucket.
 * @returns The new taxonomy, and whether the theme is gone from every bucket: if so, puzzles
 * should lose it too.
 * @throws Error with a user-facing message if the bucket or theme is not there.
 */
export function removeThemeFromTaxonomy(
    taxonomy: PuzzlebaseTaxonomy,
    bucket: string,
    theme: string,
): { taxonomy: PuzzlebaseTaxonomy; theme: string; goneEverywhere: boolean } {
    if (!(bucket in taxonomy.buckets)) {
        throw new Error(`Unknown bucket: ${bucket}`);
    }
    const name = taxonomy.buckets[bucket].find((t) => t.toLowerCase() === theme.toLowerCase());
    if (!name) {
        throw new Error(`"${theme}" is not in ${bucket}.`);
    }
    const buckets = {
        ...taxonomy.buckets,
        [bucket]: taxonomy.buckets[bucket].filter((t) => t !== name),
    };
    const goneEverywhere = !Object.values(buckets).some((themes) => themes.includes(name));
    return { taxonomy: { buckets }, theme: name, goneEverywhere };
}

/**
 * Validates a puzzle's tags against the taxonomy and returns them cleaned up: no duplicates, and
 * every theme's bucket included.
 * @throws Error with a user-facing message if a bucket or theme is not in the taxonomy.
 */
export function validateTags(
    taxonomy: PuzzlebaseTaxonomy,
    buckets: string[],
    themes: string[],
): { buckets: string[]; themes: string[] } {
    const uniqueBuckets = [...new Set(buckets)];
    const uniqueThemes = [...new Set(themes)];

    const unknownBucket = uniqueBuckets.find((b) => !(b in taxonomy.buckets));
    if (unknownBucket) {
        throw new Error(`Unknown bucket: ${unknownBucket}`);
    }

    const known = new Set(Object.values(taxonomy.buckets).flat());
    const unknownTheme = uniqueThemes.find((t) => !known.has(t));
    if (unknownTheme) {
        throw new Error(`Unknown theme: ${unknownTheme}. Add it to a bucket first.`);
    }

    return {
        buckets: resolveBuckets(taxonomy, uniqueBuckets, uniqueThemes),
        themes: uniqueThemes,
    };
}

/** What a PGN adds to a puzzle beyond its position and moves: tags and a rating. */
export interface PgnContribution {
    buckets: string[];
    themes: string[];
    /** The rating the PGN asks for, if any. */
    rating?: number;
    /** Things in the PGN that were ignored, in words a person can act on. */
    warnings: string[];
}

/**
 * Turns the tags and rating a parsed PGN asks for into real buckets and themes. Names that are not
 * real themes are left off and reported in `warnings`, so one typo does not stop a puzzle (or a
 * whole study) from being added.
 */
export function contributionFromPgn(
    taxonomy: PuzzlebaseTaxonomy,
    parsed: Pick<ParsedPuzzlePgn, 'tagNames' | 'rating' | 'problems'>,
): PgnContribution {
    const resolved = resolveTagNames(taxonomy, parsed.tagNames);
    return {
        buckets: resolved.buckets,
        themes: resolved.themes,
        rating: parsed.rating,
        warnings: [...parsed.problems, ...resolved.unknown.map(describeUnknownTag)],
    };
}

/** The details of who is creating a puzzle, and when. */
export interface PuzzleAuthor {
    id: string;
    annotator: string;
    annotatorDisplayName: string;
    now: string;
}

/**
 * Builds a new puzzle from a parsed PGN. Anything in `metadata` overrides what the PGN's
 * headers said (players, result, event, site and year).
 * @throws Error with a user-facing message if the tags are not in the taxonomy.
 */
export function buildPuzzle(
    author: PuzzleAuthor,
    parsed: ParsedPuzzlePgn,
    metadata: Partial<Omit<CreatePuzzleRequest, 'pgn'>> & { rating: number },
    taxonomy: PuzzlebaseTaxonomy,
    lichessStudyUrl?: string,
): PuzzlebasePuzzle {
    const tags = validateTags(taxonomy, metadata.buckets ?? [], metadata.themes ?? []);

    return {
        id: author.id,
        fen: parsed.fen,
        solutionPgn: parsed.solutionPgn,
        annotator: author.annotator,
        annotatorDisplayName: author.annotatorDisplayName,
        composer: metadata.composer,
        composerUrl: metadata.composerUrl,
        rating: metadata.rating,
        ...tags,
        white: metadata.white ?? parsed.white,
        black: metadata.black ?? parsed.black,
        result: metadata.result ?? parsed.result,
        event: metadata.event ?? parsed.event,
        site: metadata.site ?? parsed.site,
        year: metadata.year ?? parsed.year,
        lichessStudyUrl,
        createdAt: author.now,
        updatedAt: author.now,
    };
}

/**
 * Applies an update to a puzzle and returns the result. Only the fields present in the update
 * change. If a new solution is included, its position and moves are validated again.
 * @throws Error with a user-facing message if the solution or the tags are invalid.
 */
export function applyPuzzleUpdate(
    puzzle: PuzzlebasePuzzle,
    update: UpdatePuzzleRequest,
    taxonomy: PuzzlebaseTaxonomy,
    now: string,
): PuzzlebasePuzzle {
    const updated: PuzzlebasePuzzle = { ...puzzle, updatedAt: now };

    if (update.solutionPgn !== undefined) {
        const parsed = parsePuzzlePgn(update.solutionPgn);
        updated.fen = parsed.fen;
        updated.solutionPgn = parsed.solutionPgn;
    }

    if (update.buckets !== undefined || update.themes !== undefined) {
        Object.assign(
            updated,
            validateTags(
                taxonomy,
                update.buckets ?? puzzle.buckets,
                update.themes ?? puzzle.themes,
            ),
        );
    }

    const fields = [
        'rating',
        'composer',
        'composerUrl',
        'white',
        'black',
        'result',
        'event',
        'site',
        'year',
    ] as const;
    for (const field of fields) {
        if (update[field] !== undefined) {
            Object.assign(updated, { [field]: update[field] });
        }
    }

    return updated;
}
