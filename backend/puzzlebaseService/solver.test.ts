import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/ratingSystem';
import { describe, expect, it } from 'vitest';
import { solverSnapshot } from './solver';

describe('solverSnapshot', () => {
    it('keeps every rating that is set, and the main one on the Dojo scale', () => {
        const snapshot = solverSnapshot({
            displayName: 'Kostya',
            dojoCohort: '1500-1600',
            ratingSystem: RatingSystem.Chesscom,
            ratings: {
                [RatingSystem.Chesscom]: { currentRating: 1550 },
                [RatingSystem.Lichess]: { currentRating: 1800 },
                [RatingSystem.Fide]: { currentRating: 0 },
            },
        });

        expect(snapshot).toMatchObject({
            displayName: 'Kostya',
            cohort: '1500-1600',
            ratingSystem: RatingSystem.Chesscom,
            ratings: { [RatingSystem.Chesscom]: 1550, [RatingSystem.Lichess]: 1800 },
        });
        expect(snapshot.normalizedRating).toBeGreaterThan(0);
    });

    it('has no normalized rating when the main rating is not set', () => {
        const snapshot = solverSnapshot({
            ratingSystem: RatingSystem.Fide,
            ratings: { [RatingSystem.Lichess]: { currentRating: 1800 } },
        });
        expect(snapshot.normalizedRating).toBeUndefined();
        expect(snapshot.ratings).toEqual({ [RatingSystem.Lichess]: 1800 });
    });

    it('copes with an empty profile', () => {
        expect(solverSnapshot({})).toEqual({
            displayName: undefined,
            cohort: undefined,
            ratingSystem: undefined,
            normalizedRating: undefined,
            ratings: {},
        });
    });
});
