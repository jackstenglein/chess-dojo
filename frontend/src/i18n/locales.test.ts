import { describe, expect, it } from 'vitest';
import { stripLocalePrefixFromUrl } from './locales';

describe('stripLocalePrefixFromUrl', () => {
    it('removes a non-default locale prefix', () => {
        expect(stripLocalePrefixFromUrl('https://www.chessdojo.club/de/games/1500-1600/abc')).toBe(
            'https://www.chessdojo.club/games/1500-1600/abc',
        );
        expect(stripLocalePrefixFromUrl('https://www.chessdojo.club/pseudo/prices')).toBe(
            'https://www.chessdojo.club/prices',
        );
    });

    it('leaves a bare URL unchanged', () => {
        expect(stripLocalePrefixFromUrl('https://www.chessdojo.club/games/1500-1600/abc')).toBe(
            'https://www.chessdojo.club/games/1500-1600/abc',
        );
    });

    it('keeps the query string and fragment', () => {
        expect(
            stripLocalePrefixFromUrl('https://www.chessdojo.club/de/games/x?fen=abc#comment'),
        ).toBe('https://www.chessdojo.club/games/x?fen=abc#comment');
    });

    it('collapses to / when the path is only a locale', () => {
        expect(stripLocalePrefixFromUrl('https://www.chessdojo.club/de')).toBe(
            'https://www.chessdojo.club/',
        );
    });

    it('does not strip a path segment that starts with a locale code', () => {
        // '/design' begins with 'de' but is not the de locale.
        expect(stripLocalePrefixFromUrl('https://www.chessdojo.club/design')).toBe(
            'https://www.chessdojo.club/design',
        );
    });
});
