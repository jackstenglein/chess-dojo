import { describe, expect, it } from 'vitest';
import { getNearestMaiaRating } from './maiaRating';

describe('getNearestMaiaRating', () => {
    it('defaults to 1500 when no performance rating is available', () => {
        expect(getNearestMaiaRating()).toBe(1500);
    });

    it('returns the nearest supported Maia rating', () => {
        expect(getNearestMaiaRating(1549)).toBe(1500);
        expect(getNearestMaiaRating(1551)).toBe(1600);
        expect(getNearestMaiaRating(580)).toBe(600);
        expect(getNearestMaiaRating(2630)).toBe(2600);
    });
});
