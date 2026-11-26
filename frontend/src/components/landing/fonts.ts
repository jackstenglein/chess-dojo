import { Anton, Barlow, Barlow_Condensed } from 'next/font/google';

export const anton = Anton({
    subsets: ['latin'],
    weight: '400',
    display: 'swap',
});

export const barlowCondensed = Barlow_Condensed({
    weight: ['300', '400', '500', '600'],
    display: 'swap',
    subsets: ['latin'],
});

export const barlow = Barlow({
    weight: '400',
    display: 'swap',
    subsets: ['latin'],
});

/** Section titles sit below the hero display size. */
export const sectionTitleSx = {
    fontSize: { xs: '2rem', md: '2.5rem' },
    lineHeight: 1.2,
    fontWeight: 500,
    letterSpacing: 0,
} as const;

/** Uppercase eyebrows: 3% tracking instead of 8–11%. */
export const eyebrowSx = {
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.3,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
} as const;
