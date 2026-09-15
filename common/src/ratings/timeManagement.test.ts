import { assert, describe, test } from 'vitest';
import { MIN_GAMES_FOR_ELO, newTimeManagementRating } from './timeManagement';

describe('newTimeManagementRating', () => {
    test('returns first game rating for undefined aggregate', () => {
        const result = newTimeManagementRating(undefined, 2000);

        assert.equal(result.currentRating, 2000);
        assert.equal(result.numGames, 1);
    });

    test('returns first game rating for empty aggregate', () => {
        const result = newTimeManagementRating({ currentRating: 0, numGames: 0 }, 2000);

        assert.equal(result.currentRating, 2000);
        assert.equal(result.numGames, 1);
    });

    test('stores first game signed area', () => {
        const result = newTimeManagementRating(undefined, 2000, 125);

        assert.equal(result.currentRating, 2000);
        assert.equal(result.numGames, 1);
        assert.equal(result.area, 125);
    });

    test('computes running average for < 10 games', () => {
        let agg = newTimeManagementRating(undefined, 2000);
        agg = newTimeManagementRating(agg, 2100);
        agg = newTimeManagementRating(agg, 1900);

        assert.equal(agg.numGames, 3);
        assert.equal(agg.currentRating, Math.round((2000 + 2100 + 1900) / 3));
    });

    test('computes running average signed area', () => {
        let agg = newTimeManagementRating(undefined, 2000, 100);
        agg = newTimeManagementRating(agg, 2100, -40);
        agg = newTimeManagementRating(agg, 1900, 30);

        assert.equal(agg.numGames, 3);
        assert.equal(agg.currentRating, Math.round((2000 + 2100 + 1900) / 3));
        assert.closeTo(agg.area ?? 0, 30, 0.000001);
    });

    test('treats missing legacy area as neutral', () => {
        const result = newTimeManagementRating({ currentRating: 2000, numGames: 1 }, 2200);

        assert.equal(result.numGames, 2);
        assert.equal(result.currentRating, 2100);
        assert.equal(result.area, 0);
    });

    test('is provisional for < 10 games', () => {
        let agg = newTimeManagementRating(undefined, 2000);
        for (let i = 1; i < MIN_GAMES_FOR_ELO - 1; i++) {
            agg = newTimeManagementRating(agg, 2000);
        }

        assert.equal(agg.numGames, MIN_GAMES_FOR_ELO - 1);
    });

    test('switches to Elo at game 10', () => {
        // Game 11 at 2500 should use Elo draw adjustment, not average
        // expected = 1/(1+10^((2500-2000)/400)) ≈ 0.0535
        // 2000 + 32*(0.5 - 0.0535) = 2014.29 → 2014
        const afterElo = newTimeManagementRating({ currentRating: 2000, numGames: 10 }, 2500);
        assert.equal(afterElo.numGames, MIN_GAMES_FOR_ELO + 1);
        assert.equal(afterElo.currentRating, 2014);
    });

    test('Elo moves rating toward game ratings over multiple games', () => {
        let agg = { currentRating: 2000, numGames: 10 };
        // Add 5 games at 2500: 2000 → 2014 → 2028 → 2042 → 2056 → 2070
        for (let i = 0; i < 5; i++) {
            agg = newTimeManagementRating(agg, 2500);
        }

        assert.equal(agg.numGames, 15);
        assert.equal(agg.currentRating, 2070);
    });

    test('Elo adjustment for 200-point gap upward', () => {
        // expected = 1/(1+10^(200/400)) ≈ 0.2403
        // 2000 + 32*(0.5 - 0.2403) = 2008.31 → 2008
        const result = newTimeManagementRating({ currentRating: 2000, numGames: 10 }, 2200);
        assert.equal(result.currentRating, 2008);
    });

    test('Elo adjustment for 200-point gap downward', () => {
        // expected = 1/(1+10^(-200/400)) ≈ 0.7597
        // 2000 + 32*(0.5 - 0.7597) = 1991.69 → 1992
        const result = newTimeManagementRating({ currentRating: 2000, numGames: 10 }, 1800);
        assert.equal(result.currentRating, 1992);
    });

    test('Elo adjustment for equal ratings', () => {
        // expected = 0.5, 2000 + 32*(0.5 - 0.5) = 2000
        const result = newTimeManagementRating({ currentRating: 2000, numGames: 10 }, 2000);
        assert.equal(result.currentRating, 2000);
    });

    test('Elo adjustment for 500-point gap upward', () => {
        // expected = 1/(1+10^(500/400)) ≈ 0.0535
        // 1500 + 32*(0.5 - 0.0535) = 1514.29 → 1514
        const result = newTimeManagementRating({ currentRating: 1500, numGames: 10 }, 2000);
        assert.equal(result.currentRating, 1514);
    });

    test('Elo adjustment for 500-point gap downward', () => {
        // expected = 1/(1+10^(-500/400)) ≈ 0.9465
        // 2000 + 32*(0.5 - 0.9465) = 1985.71 → 1986
        const result = newTimeManagementRating({ currentRating: 2000, numGames: 10 }, 1500);
        assert.equal(result.currentRating, 1986);
    });
});
