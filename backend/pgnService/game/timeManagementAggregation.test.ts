'use strict';

import {
    calculateDrawEloAdjustment,
    MIN_GAMES_FOR_ELO,
    updateTimeManagementAggregate,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import { calculateTimeRating, ClockDatum } from '@jackstenglein/chess-dojo-common/src/ratings/clockRating';
import { assert, test } from 'vitest';

// --- clockRating.ts tests (Layer 1: pure calculation) ---

test('calculateTimeRating returns undefined for too few moves', () => {
    const timeControls = [{ seconds: 5400 }];
    const dataset: ClockDatum[] = [
        { seconds: 5400 },
        { seconds: 5380 },
        { seconds: 5360 },
    ];
    const result = calculateTimeRating(timeControls, dataset);
    assert.isUndefined(result, 'should return undefined for < 5 moves');
});

test('calculateTimeRating returns undefined for short time control', () => {
    const timeControls = [{ seconds: 300 }]; // 5 min blitz
    const dataset: ClockDatum[] = Array.from({ length: 20 }, (_, i) => ({
        seconds: 300 - i * 10,
    }));
    const result = calculateTimeRating(timeControls, dataset);
    assert.isUndefined(result, 'should return undefined for time control < 30 min');
});

test('calculateTimeRating returns rating between 0 and 3000', () => {
    const timeControls = [{ seconds: 5400 }]; // 90 min
    // Simulate steady clock usage over 25 moves
    const dataset: ClockDatum[] = Array.from({ length: 26 }, (_, i) => ({
        seconds: 5400 - i * 180,
    }));
    const result = calculateTimeRating(timeControls, dataset);

    assert.isDefined(result);
    assert.isAtLeast(result!.rating, 0);
    assert.isAtMost(result!.rating, 3000);
});

// --- updateTimeManagementAggregate tests (Layer 1: incremental aggregation) ---

test('updateTimeManagementAggregate returns first game rating for undefined aggregate', () => {
    const result = updateTimeManagementAggregate(undefined, 2000);

    assert.equal(result.currentRating, 2000);
    assert.equal(result.numGames, 1);
});

test('updateTimeManagementAggregate computes running average for < 10 games', () => {
    let agg = updateTimeManagementAggregate(undefined, 2000);
    agg = updateTimeManagementAggregate(agg, 2100);
    agg = updateTimeManagementAggregate(agg, 1900);

    assert.equal(agg.numGames, 3);
    assert.equal(agg.currentRating, Math.round((2000 + 2100 + 1900) / 3));
});

test('updateTimeManagementAggregate is provisional for < 10 games', () => {
    let agg = updateTimeManagementAggregate(undefined, 2000);
    for (let i = 1; i < MIN_GAMES_FOR_ELO - 1; i++) {
        agg = updateTimeManagementAggregate(agg, 2000);
    }

    assert.equal(agg.numGames, MIN_GAMES_FOR_ELO - 1);
    assert.isBelow(agg.numGames, MIN_GAMES_FOR_ELO);
});

test('updateTimeManagementAggregate switches to Elo at game 10', () => {
    let agg = updateTimeManagementAggregate(undefined, 2000);
    for (let i = 1; i < MIN_GAMES_FOR_ELO; i++) {
        agg = updateTimeManagementAggregate(agg, 2000);
    }
    assert.equal(agg.numGames, MIN_GAMES_FOR_ELO);
    assert.equal(agg.currentRating, 2000);

    // Game 11 at 2500 should use Elo draw adjustment, not average
    const afterElo = updateTimeManagementAggregate(agg, 2500);
    assert.equal(afterElo.numGames, MIN_GAMES_FOR_ELO + 1);
    assert.isAbove(afterElo.currentRating, 2000, 'Elo should increase toward 2500');
    assert.isBelow(afterElo.currentRating, 2500, 'Elo should not reach 2500 in one game');
});

test('updateTimeManagementAggregate Elo moves rating toward game ratings over multiple games', () => {
    // Build up 10 games at 2000
    let agg = updateTimeManagementAggregate(undefined, 2000);
    for (let i = 1; i < MIN_GAMES_FOR_ELO; i++) {
        agg = updateTimeManagementAggregate(agg, 2000);
    }

    // Then 5 games at 2500
    for (let i = 0; i < 5; i++) {
        agg = updateTimeManagementAggregate(agg, 2500);
    }

    assert.equal(agg.numGames, 15);
    assert.isAbove(agg.currentRating, 2000, 'rating should increase toward higher game ratings');
    assert.isBelow(agg.currentRating, 2500, 'rating should not exceed game ratings after few adjustments');
});

// --- calculateDrawEloAdjustment tests ---
// Hand-computed with K=32, draw score=0.5, expected=1/(1+10^((opponent-player)/400))

test('calculateDrawEloAdjustment returns exact value for 200-point gap upward', () => {
    // expected = 1/(1+10^(200/400)) ≈ 0.2403
    // 2000 + 32*(0.5 - 0.2403) = 2008.31 → 2008
    assert.equal(calculateDrawEloAdjustment(2000, 2200), 2008);
});

test('calculateDrawEloAdjustment returns exact value for 200-point gap downward', () => {
    // expected = 1/(1+10^(-200/400)) ≈ 0.7597
    // 2000 + 32*(0.5 - 0.7597) = 1991.69 → 1992
    assert.equal(calculateDrawEloAdjustment(2000, 1800), 1992);
});

test('calculateDrawEloAdjustment returns same rating for equal ratings', () => {
    // expected = 0.5, 2000 + 32*(0.5 - 0.5) = 2000
    assert.equal(calculateDrawEloAdjustment(2000, 2000), 2000);
});

test('calculateDrawEloAdjustment returns exact value for 500-point gap upward', () => {
    // expected = 1/(1+10^(500/400)) ≈ 0.0535
    // 1500 + 32*(0.5 - 0.0535) = 1514.29 → 1514
    assert.equal(calculateDrawEloAdjustment(1500, 2000), 1514);
});

test('calculateDrawEloAdjustment returns exact value for 500-point gap downward', () => {
    // expected = 1/(1+10^(-500/400)) ≈ 0.9465
    // 2000 + 32*(0.5 - 0.9465) = 1985.71 → 1986
    assert.equal(calculateDrawEloAdjustment(2000, 1500), 1986);
});
