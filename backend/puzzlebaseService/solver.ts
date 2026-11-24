'use strict';

import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/ratingSystem';
import { SolverSnapshot } from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { getNormalizedRating } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';

/** The parts of a member's profile that a solver snapshot reads. */
export interface SolverProfile {
    displayName?: string;
    dojoCohort?: string;
    ratingSystem?: RatingSystem;
    ratings?: Partial<Record<RatingSystem, { currentRating?: number }>>;
}

/**
 * Records who a solver was when they finished a puzzle: their cohort and every rating on their
 * profile, plus their main rating on the Dojo's common scale. Ratings of 0 (not set) are left out.
 */
export function solverSnapshot(user: SolverProfile): SolverSnapshot {
    const ratings: Record<string, number> = {};
    for (const [system, rating] of Object.entries(user.ratings ?? {})) {
        if (rating?.currentRating && rating.currentRating > 0) {
            ratings[system] = rating.currentRating;
        }
    }

    const main = user.ratingSystem ? ratings[user.ratingSystem] : undefined;
    const normalized =
        main && user.ratingSystem ? getNormalizedRating(main, user.ratingSystem) : undefined;

    return {
        displayName: user.displayName || undefined,
        cohort: user.dojoCohort || undefined,
        ratingSystem: user.ratingSystem,
        normalizedRating:
            normalized !== undefined && Number.isFinite(normalized) && normalized > 0
                ? Math.round(normalized)
                : undefined,
        ratings,
    };
}
