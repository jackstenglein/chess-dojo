import { assert, test } from 'vitest';
import {
    updateTimeManagementRating,
    MIN_GAMES_FOR_ELO,
    applyGameRatingToTimeManagementRating,
} from './timeManagement';

// --- applyGameRatingToTimeManagementRating tests ---

test('applyGameRatingToTimeManagementRating returns first game rating for undefined aggregate', () => {
    const result = applyGameRatingToTimeManagementRating(undefined, 2000);

    assert.equal(result.currentRating, 2000);
    assert.equal(result.numGames, 1);
});

test('applyGameRatingToTimeManagementRating computes running average for < 10 games', () => {
    let agg = applyGameRatingToTimeManagementRating(undefined, 2000);
    agg = applyGameRatingToTimeManagementRating(agg, 2100);
    agg = applyGameRatingToTimeManagementRating(agg, 1900);

    assert.equal(agg.numGames, 3);
    assert.equal(agg.currentRating, Math.round((2000 + 2100 + 1900) / 3));
});

test('applyGameRatingToTimeManagementRating is provisional for < 10 games', () => {
    let agg = applyGameRatingToTimeManagementRating(undefined, 2000);
    for (let i = 1; i < MIN_GAMES_FOR_ELO - 1; i++) {
        agg = applyGameRatingToTimeManagementRating(agg, 2000);
    }

    assert.equal(agg.numGames, MIN_GAMES_FOR_ELO - 1);
});

test('applyGameRatingToTimeManagementRating switches to Elo at game 10', () => {
    let agg = applyGameRatingToTimeManagementRating(undefined, 2000);
    for (let i = 1; i < MIN_GAMES_FOR_ELO; i++) {
        agg = applyGameRatingToTimeManagementRating(agg, 2000);
    }
    assert.equal(agg.numGames, MIN_GAMES_FOR_ELO);
    assert.equal(agg.currentRating, 2000);

    // Game 11 at 2500 should use Elo draw adjustment, not average
    // expected = 1/(1+10^((2500-2000)/400)) ≈ 0.0535
    // 2000 + 32*(0.5 - 0.0535) = 2014.29 → 2014
    const afterElo = applyGameRatingToTimeManagementRating(agg, 2500);
    assert.equal(afterElo.numGames, MIN_GAMES_FOR_ELO + 1);
    assert.equal(afterElo.currentRating, 2014);
});

test('applyGameRatingToTimeManagementRating Elo moves rating toward game ratings over multiple games', () => {
    // Build up 10 games at 2000
    let agg = applyGameRatingToTimeManagementRating(undefined, 2000);
    for (let i = 1; i < MIN_GAMES_FOR_ELO; i++) {
        agg = applyGameRatingToTimeManagementRating(agg, 2000);
    }

    // Then 5 games at 2500: 2000 → 2014 → 2028 → 2042 → 2056 → 2070
    for (let i = 0; i < 5; i++) {
        agg = applyGameRatingToTimeManagementRating(agg, 2500);
    }

    assert.equal(agg.numGames, 15);
    assert.equal(agg.currentRating, 2070);
});

// --- updateTimeManagementRating tests ---
// Hand-computed with K=32, draw score=0.5, expected=1/(1+10^((opponent-player)/400))

test('updateTimeManagementRating returns exact value for 200-point gap upward', () => {
    // expected = 1/(1+10^(200/400)) ≈ 0.2403
    // 2000 + 32*(0.5 - 0.2403) = 2008.31 → 2008
    assert.equal(updateTimeManagementRating(2000, 2200), 2008);
});

test('updateTimeManagementRating returns exact value for 200-point gap downward', () => {
    // expected = 1/(1+10^(-200/400)) ≈ 0.7597
    // 2000 + 32*(0.5 - 0.7597) = 1991.69 → 1992
    assert.equal(updateTimeManagementRating(2000, 1800), 1992);
});

test('updateTimeManagementRating returns same rating for equal ratings', () => {
    // expected = 0.5, 2000 + 32*(0.5 - 0.5) = 2000
    assert.equal(updateTimeManagementRating(2000, 2000), 2000);
});

test('updateTimeManagementRating returns exact value for 500-point gap upward', () => {
    // expected = 1/(1+10^(500/400)) ≈ 0.0535
    // 1500 + 32*(0.5 - 0.0535) = 1514.29 → 1514
    assert.equal(updateTimeManagementRating(1500, 2000), 1514);
});

test('updateTimeManagementRating returns exact value for 500-point gap downward', () => {
    // expected = 1/(1+10^(-500/400)) ≈ 0.9465
    // 2000 + 32*(0.5 - 0.9465) = 1985.71 → 1986
    assert.equal(updateTimeManagementRating(2000, 1500), 1986);
});
