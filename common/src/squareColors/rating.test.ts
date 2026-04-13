import { describe, expect, it } from 'vitest';
import {
    SQUARE_COLOR_RATING_CONFIG,
    MIN_QUESTIONS_FOR_RATING,
    computeSquareColorRating,
} from './rating';

const { maxRating, fastMs, slowMs } = SQUARE_COLOR_RATING_CONFIG;

describe('SQUARE_COLOR_RATING_CONFIG', () => {
    it('has the expected constant values', () => {
        expect(SQUARE_COLOR_RATING_CONFIG.accuracyWeight).toBe(0.65);
        expect(SQUARE_COLOR_RATING_CONFIG.timeWeight).toBe(0.35);
        expect(SQUARE_COLOR_RATING_CONFIG.maxRating).toBe(1500);
        expect(SQUARE_COLOR_RATING_CONFIG.fastMs).toBe(500);
        expect(SQUARE_COLOR_RATING_CONFIG.slowMs).toBe(10000);
    });
});

describe('MIN_QUESTIONS_FOR_RATING', () => {
    it('equals 20', () => {
        expect(MIN_QUESTIONS_FOR_RATING).toBe(20);
    });
});

describe('computeSquareColorRating', () => {
    it('returns the maximum rating (1500) for perfect accuracy and fastest response time', () => {
        // accuracy=100, time=fastMs => accuracyScore=1, timeScore=1 => 1500 * 1.0 = 1500
        expect(computeSquareColorRating(100, fastMs)).toBe(maxRating);
    });

    it('returns the maximum rating when response time is faster than fastMs', () => {
        // Time below fastMs is clamped to a timeScore of 1
        expect(computeSquareColorRating(100, 0)).toBe(maxRating);
    });

    it('returns 0 for zero accuracy and slowest (or slower) response time', () => {
        // accuracy=0, time=slowMs => accuracyScore=0, timeScore=0 => 0
        expect(computeSquareColorRating(0, slowMs)).toBe(0);
    });

    it('returns 0 when response time exceeds slowMs and accuracy is zero', () => {
        // Time beyond slowMs is clamped to a timeScore of 0
        expect(computeSquareColorRating(0, slowMs + 1000)).toBe(0);
    });

    it('returns correct rating for mid-range accuracy and time', () => {
        // accuracy=50 => accuracyScore=0.5
        // time=2750ms (midpoint of 500–5000) => timeScore=0.5
        // rating = round(1500 * (0.65 * 0.5 + 0.35 * 0.5)) = round(1500 * 0.5) = 750
        const midTime = (fastMs + slowMs) / 2;
        expect(computeSquareColorRating(50, midTime)).toBe(750);
    });

    it('weights accuracy more heavily than time', () => {
        // Perfect accuracy, worst time vs worst accuracy, perfect time
        const highAccuracyRating = computeSquareColorRating(100, slowMs);
        const highTimeRating = computeSquareColorRating(0, fastMs);
        expect(highAccuracyRating).toBeGreaterThan(highTimeRating);
    });

    it('returns an integer rating', () => {
        const rating = computeSquareColorRating(73, 1800);
        expect(Number.isInteger(rating)).toBe(true);
    });

    it('clamps accuracy above 100 to a maximum score of 1500', () => {
        // accuracy > 100 is clamped to accuracyScore=1
        expect(computeSquareColorRating(150, fastMs)).toBe(maxRating);
    });

    it('clamps negative accuracy to a minimum contribution of 0', () => {
        // accuracy < 0 is clamped to accuracyScore=0
        // time=fastMs => timeScore=1 => rating = round(1500 * 0.35) = 525
        expect(computeSquareColorRating(-10, fastMs)).toBe(Math.round(maxRating * 0.35));
    });

    it('returns only the accuracy component when time equals slowMs', () => {
        // timeScore=0 => rating = round(1500 * 0.65 * (accuracy/100))
        expect(computeSquareColorRating(100, slowMs)).toBe(Math.round(maxRating * 0.65));
    });

    it('returns only the time component when accuracy is zero and time equals fastMs', () => {
        // accuracyScore=0, timeScore=1 => rating = round(1500 * 0.35) = 525
        expect(computeSquareColorRating(0, fastMs)).toBe(Math.round(maxRating * 0.35));
    });
});
