export const CoordinateSizeKey = 'coordinateSize';

export enum CoordinateSize {
    Standard = 'STANDARD',
    Large = 'LARGE',
}

export const PgnTextFontSizeKey = 'pgnTextFontSize';

export enum PgnTextFontSize {
    Small = 'SMALL',
    Standard = 'STANDARD',
    Large = 'LARGE',
    ExtraLarge = 'EXTRA_LARGE',
}

const pgnTextFontScales: Record<PgnTextFontSize, number> = {
    [PgnTextFontSize.Small]: 0.875,
    [PgnTextFontSize.Standard]: 1,
    [PgnTextFontSize.Large]: 1.125,
    [PgnTextFontSize.ExtraLarge]: 1.25,
};

interface PgnTextFontSx {
    '--pgn-text-font-scale': number;
}

/**
 * Returns a CSS var that scales every font size in the PGN text, to be spread
 * into the sx prop of the PGN text container.
 * @param size The font size setting to get the CSS var for.
 */
export function getPgnTextFontSx(size: PgnTextFontSize): PgnTextFontSx {
    return { '--pgn-text-font-scale': pgnTextFontScales[size] };
}

/**
 * Scales the given rem length with the viewer's PGN text font size setting.
 * Outside the PGN text container the var is unset, so the length is unscaled.
 * @param rem The unscaled length in rem.
 */
export function scalePgnRem(rem: number): string {
    return `calc(${rem}rem * var(--pgn-text-font-scale, 1))`;
}
