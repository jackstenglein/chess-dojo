import { Theme } from '@mui/material';

/**
 * Styles a category colour for text and icons: as is in dark mode, and darker in
 * light mode, where the bright category colours are hard to read on white.
 * @param theme The MUI theme.
 * @param color The category colour.
 */
export function categoryTextColor(theme: Theme, color: string | undefined) {
    if (!color) {
        return {};
    }
    // Theme colour names like 'primary.main' already follow the mode.
    if (!color.startsWith('#')) {
        return { color };
    }
    return {
        color,
        ...theme.applyStyles('light', { color: `color-mix(in srgb, ${color} 62%, black)` }),
    };
}
