import { PuzzlebaseTaxonomy, siblingBuckets } from './api';

/** The tags on a puzzle. */
export interface PuzzleTags {
    buckets: string[];
    themes: string[];
}

/**
 * Returns every bucket the given theme is listed under, in taxonomy order. A theme can be listed
 * under several buckets: Attack on the king can be a tactic or part of an endgame.
 */
export function bucketsOfTheme(taxonomy: PuzzlebaseTaxonomy, theme: string): string[] {
    return Object.entries(taxonomy.buckets)
        .filter(([, themes]) => themes.includes(theme))
        .map(([bucket]) => bucket);
}

/** Returns the first bucket the given theme is listed under, if it is in the taxonomy. */
export function bucketOfTheme(taxonomy: PuzzlebaseTaxonomy, theme: string): string | undefined {
    return bucketsOfTheme(taxonomy, theme)[0];
}

/** Finds a theme by name, ignoring case, and returns it as the taxonomy spells it. */
export function canonicalTheme(taxonomy: PuzzlebaseTaxonomy, name: string): string | undefined {
    const wanted = name.trim().toLowerCase();
    return Object.values(taxonomy.buckets)
        .flat()
        .find((theme) => theme.toLowerCase() === wanted);
}

/**
 * Adds a bucket tag. A puzzle has one bucket per group (Tactics or Strategy; Opening, Middlegame
 * or Endgame), so this replaces the bucket's siblings. With the taxonomy, the themes that were only
 * there because of a replaced bucket go with it.
 */
export function addBucket(
    tags: PuzzleTags,
    bucket: string,
    taxonomy?: PuzzlebaseTaxonomy,
): PuzzleTags {
    if (tags.buckets.includes(bucket)) {
        return tags;
    }
    let result = tags;
    for (const sibling of siblingBuckets(bucket)) {
        if (!result.buckets.includes(sibling)) continue;
        result = taxonomy
            ? removeBucket(taxonomy, result, sibling)
            : { ...result, buckets: result.buckets.filter((b) => b !== sibling) };
    }
    return { ...result, buckets: [...result.buckets, bucket] };
}

/**
 * Adds a theme tag, and a bucket for it. The bucket is the one it was picked from, if that is
 * given. Otherwise it is the theme's first bucket, unless the puzzle already has a bucket the
 * theme is listed under, in which case no bucket is added.
 * @param inBucket The bucket the theme was picked under, when it is listed under several.
 */
export function addTheme(
    taxonomy: PuzzlebaseTaxonomy,
    tags: PuzzleTags,
    theme: string,
    inBucket?: string,
): PuzzleTags {
    const buckets = bucketsOfTheme(taxonomy, theme);
    if (buckets.length === 0) {
        return tags;
    }
    const covered = buckets.some((bucket) => tags.buckets.includes(bucket));
    // A picked bucket is a deliberate choice, so it replaces its group's bucket. A bucket brought
    // along by the theme is only added if the puzzle has none from that group yet.
    const bringable = buckets.find(
        (bucket) => !siblingBuckets(bucket).some((sibling) => tags.buckets.includes(sibling)),
    );
    const withBucket =
        inBucket !== undefined && buckets.includes(inBucket)
            ? addBucket(tags, inBucket, taxonomy)
            : covered || bringable === undefined
              ? tags
              : addBucket(tags, bringable, taxonomy);
    if (withBucket.themes.includes(theme)) {
        return withBucket;
    }
    return { ...withBucket, themes: [...withBucket.themes, theme] };
}

/** Removes a theme tag. Its bucket stays, since buckets can be removed independently. */
export function removeTheme(tags: PuzzleTags, theme: string): PuzzleTags {
    return { ...tags, themes: tags.themes.filter((t) => t !== theme) };
}

/**
 * Removes a bucket tag and the themes that were only there because of it, so no theme is left
 * without a bucket. A theme the puzzle's other buckets also list stays.
 */
export function removeBucket(
    taxonomy: PuzzlebaseTaxonomy,
    tags: PuzzleTags,
    bucket: string,
): PuzzleTags {
    const buckets = tags.buckets.filter((b) => b !== bucket);
    return {
        buckets,
        themes: tags.themes.filter(
            (theme) =>
                !bucketsOfTheme(taxonomy, theme).includes(bucket) ||
                bucketsOfTheme(taxonomy, theme).some((b) => buckets.includes(b)),
        ),
    };
}
