import { describe, expect, it } from 'vitest';
import { dojoCohorts, ratingToCohort } from '../database/cohort';
import { RatingSystem } from '../database/ratingSystem';
import { getNormalizedRating, oldRatingBoundaries, ratingBoundaries } from './ratings';

describe('ratingBoundaries', () => {
    it('has an entry for every cohort except 2400+', () => {
        for (const cohort of dojoCohorts.slice(0, -1)) {
            expect(ratingBoundaries[cohort]).toBeDefined();
        }
    });
});

describe('oldRatingBoundaries', () => {
    it('differs from current boundaries for DWZ', () => {
        expect(oldRatingBoundaries['1000-1100'][RatingSystem.Dwz]).not.toBe(
            ratingBoundaries['1000-1100'][RatingSystem.Dwz],
        );
    });
});

describe('ratingToCohort', () => {
    it('uses the 2026 boundaries', () => {
        expect(ratingToCohort(1000, RatingSystem.Chesscom)).toBe('700-800');
        expect(ratingToCohort(499, RatingSystem.Chesscom)).toBe('0-300');
        expect(ratingToCohort(2551, RatingSystem.Chesscom)).toBe('2400+');
    });

    it('returns undefined for custom rating systems', () => {
        expect(ratingToCohort(1000, RatingSystem.Custom)).toBeUndefined();
    });
});

describe('getNormalizedRating', () => {
    it('produces different normalized ratings under old vs new boundaries', () => {
        const oldNormalized = getNormalizedRating(1000, RatingSystem.Dwz, oldRatingBoundaries);
        const newNormalized = getNormalizedRating(1000, RatingSystem.Dwz);
        expect(oldNormalized).not.toBe(newNormalized);
    });
});
