import { RequirementCategory } from '@/database/requirement';
import { CustomPlanBucket } from '@/database/user';
import { CategoryColors } from '@/style/ThemeProvider';

/**
 * The colors offered for buckets: the Dojo category colors first, so default
 * buckets match the Dojo plan, then a few extras.
 */
export const BUCKET_PALETTE = [
    CategoryColors[RequirementCategory.Games],
    CategoryColors[RequirementCategory.Tactics],
    CategoryColors[RequirementCategory.Opening],
    CategoryColors[RequirementCategory.Middlegames],
    CategoryColors[RequirementCategory.Endgame],
    CategoryColors[RequirementCategory.Welcome],
    '#4fc3f7',
    '#ffd54f',
    '#4db6ac',
    '#a1887f',
] as const;

/** Matches a 6-digit hex color, the only format the backend accepts. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Returns whether the given string is a 6-digit hex color. */
export function isHexColor(color: string | undefined): color is string {
    return !!color && HEX_COLOR.test(color);
}

/**
 * Returns the color to show for a bucket: its own color if set, else the color
 * of the Dojo category it stands for, else a palette color by position.
 * @param bucket The bucket.
 * @param index The bucket's position in its plan.
 */
export function getBucketColor(
    bucket: Pick<CustomPlanBucket, 'name' | 'color' | 'category'>,
    index: number,
) {
    if (isHexColor(bucket.color)) {
        return bucket.color;
    }
    const category = getBucketCategory(bucket);
    if (category) {
        return CategoryColors[category];
    }
    return BUCKET_PALETTE[index % BUCKET_PALETTE.length];
}

/**
 * Returns the first palette color not already used, or a palette color by
 * position when all are taken. Used for a newly added bucket.
 * @param used The colors of the existing buckets.
 */
export function nextBucketColor(used: string[]): string {
    const taken = new Set(used.map((c) => c.toLowerCase()));
    return (
        BUCKET_PALETTE.find((c) => !taken.has(c.toLowerCase())) ??
        BUCKET_PALETTE[used.length % BUCKET_PALETTE.length]
    );
}

/**
 * Returns the Dojo category a bucket stands for, if any: its own category, else
 * the category it is named after (older buckets copied from the Dojo plan).
 * @param bucket The bucket.
 */
export function getBucketCategory(
    bucket: Pick<CustomPlanBucket, 'name' | 'category'>,
): RequirementCategory | undefined {
    return bucket.category ?? Object.values(RequirementCategory).find((c) => c === bucket.name);
}
