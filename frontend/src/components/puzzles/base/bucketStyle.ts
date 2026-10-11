import { RequirementCategory } from '@/database/requirement';
import { CategoryColors } from '@/style/ThemeProvider';
import { alpha, darken, Theme } from '@mui/material/styles';

/**
 * Accent colors for each puzzlebase bucket. They come from the Dojo's requirement category
 * colors so the puzzlebase matches the rest of the site. The Dojo's "Middlegames + Strategy"
 * category is already used by Middlegame, so Strategy takes another Dojo accent color
 * (Games + Analysis) to stay distinguishable.
 */
const BUCKET_COLORS: Record<string, string> = {
    Tactics: CategoryColors[RequirementCategory.Tactics],
    Strategy: CategoryColors[RequirementCategory.Games],
    Opening: CategoryColors[RequirementCategory.Opening],
    Middlegame: CategoryColors[RequirementCategory.Middlegames],
    Endgame: CategoryColors[RequirementCategory.Endgame],
};

const FALLBACK_COLOR = '#90a4ae';

/**
 * The outline of every theme tag: plain white in dark mode (and the matching near-black in light
 * mode), whatever the theme's bucket.
 */
export const themeOutline = (theme: Theme) => alpha(theme.palette.text.primary, 0.7);

/** Shared look for the small, square-cornered tag chips. */
export const tagChipSx = { height: 22, borderRadius: 1, fontSize: '0.75rem' } as const;

/** Returns the accent color for the given bucket. */
export function bucketColor(bucket: string): string {
    return BUCKET_COLORS[bucket] ?? FALLBACK_COLOR;
}

/**
 * Returns a deeper version of the bucket's color, dark enough to carry white text. The site's own
 * category colors are light (Tactics is a bright green), which suits stripes and tints but not a
 * solid chip.
 */
export function bucketColorDeep(bucket: string): string {
    return darken(bucketColor(bucket), 0.45);
}

/** Returns a CSS gradient made of the given buckets' colors, for card stripes. */
export function bucketGradient(buckets: string[]): string {
    if (buckets.length === 0) {
        return `linear-gradient(90deg, ${FALLBACK_COLOR}, ${FALLBACK_COLOR})`;
    }
    if (buckets.length === 1) {
        const color = bucketColor(buckets[0]);
        return `linear-gradient(90deg, ${color}, ${color})`;
    }
    return `linear-gradient(90deg, ${buckets.map(bucketColor).join(', ')})`;
}
