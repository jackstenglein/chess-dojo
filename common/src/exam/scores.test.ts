import { SimpleLinearRegression } from 'ml-regression-simple-linear';
import { describe, expect, it } from 'vitest';
import { predictExamRating } from './scores';

describe('predictExamRating', () => {
    it('returns raw regression predictions when they are positive', () => {
        const regression = new SimpleLinearRegression([10, 20, 30], [1000, 1500, 2000]);

        expect(predictExamRating(regression, 20)).toBe(1500);
    });

    it('caps negative regression predictions at 0', () => {
        const regression = new SimpleLinearRegression([10, 20, 30], [1000, 1500, 2000]);

        expect(regression.predict(-20)).toBeLessThan(0);
        expect(predictExamRating(regression, -20)).toBe(0);
    });
});
