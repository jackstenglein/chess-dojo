import { PuzzlebaseTaxonomy } from './api';

/** The highest rating a puzzle can have. Matches the puzzlebase API schema. */
const MAX_RATING = 3500;

/** The tags and rating a PGN asks for, before they are checked against the real themes. */
export interface PgnTagInfo {
    /** The theme and bucket names written in the PGN, in the order they were written. */
    names: string[];
    /** The rating written in the PGN, if it is a valid one. */
    rating?: number;
    /** Things in the PGN that were ignored, in words a person can act on. */
    problems: string[];
}

/** Splits a list of names written with commas or semicolons, dropping blanks and duplicates. */
function splitNames(text: string): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const part of text.split(/[,;]/)) {
        const name = part.trim().replace(/^#/, '').replace(/\s+/g, ' ');
        if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            names.push(name);
        }
    }
    return names;
}

/** Parses a rating written by a person. Returns undefined unless it is a whole number 0 to 3500. */
function parseWrittenRating(text: string): number | undefined {
    const trimmed = text.trim();
    if (!/^\d+$/.test(trimmed)) {
        return undefined;
    }
    const rating = parseInt(trimmed, 10);
    return rating <= MAX_RATING ? rating : undefined;
}

/**
 * Reads the tags and rating a PGN asks for. There are two places to write them, so it works in
 * ChessBase, Lichess and anywhere else:
 *
 * - A comment before the first move: `{ tags: Fork, Sacrifice; rating: 1450 }`. Other text in the
 *   comment is ignored, so it can also hold notes. Entries are separated by `;` or new lines.
 * - PGN headers: `[Themes "Fork, Sacrifice"]` and `[Rating "1450"]`.
 *
 * If both give tags, the puzzle gets all of them. If both give a rating, the header wins.
 *
 * @param headers The value of the PGN's Themes and Rating headers, if present.
 * @param gameComment The comment before the first move, if present.
 */
export function readPgnTagInfo(
    headers: { themes?: unknown; rating?: unknown },
    gameComment?: string,
): PgnTagInfo {
    const names: string[] = [];
    const problems: string[] = [];
    let commentRating: string | undefined;

    const addNames = (text: string) => {
        for (const name of splitNames(text)) {
            if (!names.some((n) => n.toLowerCase() === name.toLowerCase())) {
                names.push(name);
            }
        }
    };

    for (const entry of (gameComment ?? '').split(/[;\n]/)) {
        const match = /^\s*(tags?|themes?|rating)\s*:\s*(.*)$/i.exec(entry);
        if (!match) {
            continue;
        }
        if (match[1].toLowerCase() === 'rating') {
            commentRating = match[2];
        } else {
            addNames(match[2]);
        }
    }

    if (typeof headers.themes === 'string') {
        addNames(headers.themes);
    }

    const writtenRating =
        typeof headers.rating === 'string' && headers.rating.trim()
            ? headers.rating
            : commentRating;
    let rating: number | undefined;
    if (writtenRating !== undefined) {
        rating = parseWrittenRating(writtenRating);
        if (rating === undefined) {
            problems.push(
                `Ignored the rating "${writtenRating.trim()}". A rating is a whole number from 0 to ${MAX_RATING}.`,
            );
        }
    }

    return { names, rating, problems };
}

/** The tags a PGN asked for, matched against the real buckets and themes. */
export interface ResolvedTagNames {
    buckets: string[];
    themes: string[];
    /** Names that are neither a bucket nor a theme, with the closest real name if there is one. */
    unknown: { name: string; suggestion?: string }[];
}

/** Other names people are likely to write for a bucket. */
const BUCKET_ALIASES: Record<string, string> = {
    tactical: 'Tactics',
    tactic: 'Tactics',
    positional: 'Strategy',
    strategic: 'Strategy',
    openings: 'Opening',
    middlegames: 'Middlegame',
    endgames: 'Endgame',
};

/** Other names people are likely to write for a theme, including ones it used to be called. */
const THEME_ALIASES: Record<string, string> = {
    decoy: 'Attraction',
};

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** How many single-letter edits it takes to turn one string into the other. */
function editDistance(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(
                previous[j] + 1,
                row[j - 1] + 1,
                previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
        }
        previous = row;
    }
    return previous[b.length];
}

/** Returns the candidate closest to `name` if it is close enough to be a likely typo. */
function closestName(name: string, candidates: string[]): string | undefined {
    const target = normalize(name);
    const allowed = Math.max(1, Math.floor(target.length / 4));
    let best: { candidate: string; distance: number } | undefined;
    for (const candidate of candidates) {
        const distance = editDistance(target, normalize(candidate));
        if (distance <= allowed && (!best || distance < best.distance)) {
            best = { candidate, distance };
        }
    }
    return best?.candidate;
}

/**
 * Matches the names written in a PGN to real themes and buckets, ignoring case, so `fork` finds
 * Fork. Names that match nothing come back as `unknown`, with a suggestion if one is close.
 */
export function resolveTagNames(taxonomy: PuzzlebaseTaxonomy, names: string[]): ResolvedTagNames {
    const buckets = new Map(Object.keys(taxonomy.buckets).map((b) => [normalize(b), b]));
    const themes = new Map(
        Object.values(taxonomy.buckets)
            .flat()
            .map((t) => [normalize(t), t]),
    );
    const everyName = [...buckets.values(), ...themes.values()];

    const result: ResolvedTagNames = { buckets: [], themes: [], unknown: [] };
    for (const name of names) {
        const key = normalize(name);
        const theme = themes.get(key) ?? themes.get(normalize(THEME_ALIASES[key] ?? ''));
        const bucket = buckets.get(key) ?? buckets.get(normalize(BUCKET_ALIASES[key] ?? ''));
        if (theme) {
            if (!result.themes.includes(theme)) result.themes.push(theme);
        } else if (bucket) {
            if (!result.buckets.includes(bucket)) result.buckets.push(bucket);
        } else {
            result.unknown.push({ name, suggestion: closestName(name, everyName) });
        }
    }
    return result;
}

/** Describes a name that was not recognized, for showing to a person. */
export function describeUnknownTag({ name, suggestion }: { name: string; suggestion?: string }) {
    return `Unknown tag "${name}"${suggestion ? `. Did you mean "${suggestion}"?` : '.'} It was left off.`;
}
