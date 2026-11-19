import { useLocalStorage } from 'usehooks-ts';

/**
 * The colors the multicolor progress passes through, by percent of the goal: Dojo
 * orange at the start, yellow halfway, and bright green once the goal is met.
 */
const COLOR_STOPS: { at: number; rgb: [number, number, number] }[] = [
    { at: 0, rgb: [0xf7, 0x94, 0x1f] },
    { at: 50, rgb: [0xf5, 0xd3, 0x3f] },
    { at: 100, rgb: [0x4c, 0xe0, 0x6a] },
];

/** The bright green of a met goal in the multicolor bar. */
export const MULTICOLOR_DONE = '#4ce06a';

/** The single colors a viewer can pick for the Today and This Week bars. */
export const SINGLE_BAR_COLORS = {
    teal: '#4db6ac',
    blue: '#64b5f6',
    purple: '#9575cd',
    pink: '#ff69b4',
    orange: '#f7941f',
    green: '#4ce06a',
} as const;

/** The viewer's choice of bar color: the multicolor blend or one single color. */
export type BarColor = 'multicolor' | keyof typeof SINGLE_BAR_COLORS;

/** The bar color choices, in the order the menu shows them. */
export const BAR_COLORS: BarColor[] = [
    'multicolor',
    ...(Object.keys(SINGLE_BAR_COLORS) as (keyof typeof SINGLE_BAR_COLORS)[]),
];

/** A CSS gradient previewing the multicolor blend, for its swatch. */
export const MULTICOLOR_SWATCH = `linear-gradient(135deg, #f7941f, #f5d33f, ${MULTICOLOR_DONE})`;

/**
 * Returns the viewer's bar color choice and its setter. The choice is saved in the
 * browser, like which sections are shown. Multicolor is the default.
 */
export function useBarColor() {
    return useLocalStorage<BarColor>('training-plan-bar-color', 'multicolor');
}

/**
 * Returns the multicolor progress color for the given percent of the goal,
 * blending from orange through yellow to bright green.
 * @param percent The percent of the goal done (clamped to 0-100).
 */
export function getProgressColor(percent: number): string {
    const p = Math.max(0, Math.min(100, percent));
    const upper = COLOR_STOPS.findIndex((stop) => stop.at >= p);
    const to = COLOR_STOPS[Math.max(upper, 0)];
    const from = COLOR_STOPS[Math.max(upper - 1, 0)];
    const t = to.at === from.at ? 0 : (p - from.at) / (to.at - from.at);
    const [r, g, b] = from.rgb.map((c, i) => Math.round(c + (to.rgb[i] - c) * t));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Returns the color of a progress bar at the given percent for the viewer's choice.
 * @param percent The percent of the goal done.
 * @param choice The viewer's bar color choice. Unknown values fall back to multicolor.
 */
export function getBarColor(percent: number, choice: BarColor): string {
    if (choice !== 'multicolor' && choice in SINGLE_BAR_COLORS) {
        return SINGLE_BAR_COLORS[choice];
    }
    return getProgressColor(percent);
}

/**
 * Returns the color for something done, from the viewer's bar color: bright green
 * for multicolor, or their single color.
 */
export function useDoneColor(): string {
    const [barColor] = useBarColor();
    return getBarColor(100, barColor);
}
