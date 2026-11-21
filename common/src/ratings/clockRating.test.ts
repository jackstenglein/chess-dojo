import { assert, describe, test } from 'vitest';
import {
    ClockDatum,
    calculateTimeRating,
    getPerfectLineSeconds,
    getTimeRatingMaxMove,
} from './clockRating';

const twoTimeControls = [{ seconds: 5400, moves: 40 }, { seconds: 1800 }];

describe('getPerfectLineSeconds', () => {
    test('preserves the original single-control curve', () => {
        assert.equal(getPerfectLineSeconds([{ seconds: 5400 }], 5), 5400);
        assert.equal(getPerfectLineSeconds([{ seconds: 5400 }], 40), 381);
        assert.equal(getPerfectLineSeconds([{ seconds: 5400 }], 50), 120);
        assert.throws(() => getPerfectLineSeconds([{ seconds: 5400 }], 51));
    });

    test('preserves the original curve before the second control', () => {
        assert.equal(getPerfectLineSeconds(twoTimeControls, 39), 435);
    });

    test('starts a fresh 50-move curve with remaining and added time', () => {
        assert.equal(getPerfectLineSeconds(twoTimeControls, 40), 2181);
        assert.equal(getPerfectLineSeconds(twoTimeControls, 50), 1439);
        assert.equal(getPerfectLineSeconds(twoTimeControls, 65), 635);
        assert.equal(getPerfectLineSeconds(twoTimeControls, 90), 120);
        assert.throws(() => getPerfectLineSeconds(twoTimeControls, 91));
    });

    test('uses cumulative move counts for later controls', () => {
        const timeControls = [
            { seconds: 5400, moves: 40 },
            { seconds: 1800, moves: 20 },
            { seconds: 900 },
        ];
        assert.equal(getPerfectLineSeconds(timeControls, 60), 1762);
        assert.equal(getPerfectLineSeconds(timeControls, 110), 120);
        assert.throws(() => getPerfectLineSeconds(timeControls, 111));
    });

    test('does not grow the old curve when the next control starts after move 50', () => {
        const timeControls = [{ seconds: 5400, moves: 60 }, { seconds: 1800 }];
        assert.equal(getPerfectLineSeconds(timeControls, 55), 120);
        assert.equal(getPerfectLineSeconds(timeControls, 60), 1920);
        assert.equal(getPerfectLineSeconds(timeControls, 110), 120);
    });

    test('does not activate later controls without a preceding move count', () => {
        const timeControls = [{ seconds: 5400 }, { seconds: 1800 }];
        assert.equal(getPerfectLineSeconds(timeControls, 50), 120);
        assert.throws(() => getPerfectLineSeconds(timeControls, 51));
    });
});

describe('getTimeRatingMaxMove', () => {
    test('keeps the single-control cutoff and extends later controls', () => {
        assert.equal(getTimeRatingMaxMove([{ seconds: 5400 }]), 50);
        assert.equal(getTimeRatingMaxMove([{ seconds: 5400, moves: 40 }]), 50);
        assert.equal(getTimeRatingMaxMove(twoTimeControls), 90);
        assert.equal(
            getTimeRatingMaxMove([
                { seconds: 5400, moves: 40 },
                { seconds: 1800, moves: 20 },
                { seconds: 900 },
            ]),
            110,
        );
        assert.equal(getTimeRatingMaxMove([{ seconds: 5400 }, { seconds: 1800 }]), 50);
    });
});

describe('calculateTimeRating', () => {
    const idealTwoControlClock: ClockDatum[] = Array.from({ length: 91 }, (_, move) => {
        const initialCoefficient = (5400 - 120) / 45 ** 2;
        const secondStartSeconds = initialCoefficient * 10 ** 2 + 120 + 1800;
        return {
            seconds: Math.round(
                move < 5
                    ? 5400
                    : move < 40
                      ? initialCoefficient * (50 - move) ** 2 + 120
                      : ((secondStartSeconds - 120) / 50 ** 2) * (90 - move) ** 2 + 120,
            ),
        };
    });

    test('gives the ideal two-control clock the maximum rating', () => {
        assert.deepEqual(calculateTimeRating(twoTimeControls, idealTwoControlClock), {
            rating: 3000,
            area: 0,
        });
    });

    test('includes clock deviations after move 50 in the rating', () => {
        const changedClock = idealTwoControlClock.map((datum, move) => ({
            seconds: datum.seconds + (move >= 60 ? 600 : 0),
        }));
        const ideal = calculateTimeRating(twoTimeControls, idealTwoControlClock);
        const changed = calculateTimeRating(twoTimeControls, changedClock);
        assert.isDefined(ideal);
        assert.isDefined(changed);
        assert.isBelow(changed.rating, ideal.rating);
        assert.isAbove(changed.area, 0);
    });

    test.each([
        { name: 'single control', timeControls: [{ seconds: 5400 }], maxMove: 50 },
        { name: 'second control', timeControls: twoTimeControls, maxMove: 90 },
    ])('includes the final plotted move for $name', ({ timeControls, maxMove }) => {
        const idealClock = Array.from({ length: maxMove + 1 }, (_, move) => ({
            seconds: move < 5 ? 5400 : getPerfectLineSeconds(timeControls, move),
        }));
        const changedClock = idealClock.map((datum, move) => ({
            seconds: datum.seconds + (move === maxMove ? 600 : 0),
        }));
        const ideal = calculateTimeRating(timeControls, idealClock);
        const changed = calculateTimeRating(timeControls, changedClock);
        assert.isDefined(ideal);
        assert.isDefined(changed);
        assert.isBelow(changed.rating, ideal.rating);
        assert.equal(changed.area, 300);
        assert.deepEqual(
            calculateTimeRating(timeControls, [...changedClock, { seconds: 99999 }]),
            changed,
        );
    });

    test('includes the last played move when the game ends before the cutoff', () => {
        const idealClock = idealTwoControlClock.slice(0, 26);
        const changedClock = idealClock.map((datum, move) => ({
            seconds: datum.seconds + (move === 25 ? 600 : 0),
        }));
        const ideal = calculateTimeRating(twoTimeControls, idealClock);
        const changed = calculateTimeRating(twoTimeControls, changedClock);
        assert.isDefined(ideal);
        assert.isDefined(changed);
        assert.isBelow(changed.rating, ideal.rating);
        assert.equal(changed.area, 300);
    });

    test('includes added time in the zero-rating baseline', () => {
        const unusedClock = Array.from({ length: 91 }, (_, move) => ({
            seconds: 5400 + (move >= 40 ? 1800 : 0),
        }));
        assert.equal(calculateTimeRating(twoTimeControls, unusedClock)?.rating, 0);
    });

    test('returns undefined for too few moves', () => {
        const timeControls = [{ seconds: 5400 }];
        const dataset: ClockDatum[] = [{ seconds: 5400 }, { seconds: 5380 }, { seconds: 5360 }];
        const result = calculateTimeRating(timeControls, dataset);
        assert.isUndefined(result, 'should return undefined for < 5 moves');
    });

    test('returns undefined for exactly MIN_MOVES moves', () => {
        const timeControls = [{ seconds: 5400 }];
        const dataset: ClockDatum[] = [
            { seconds: 5400 },
            { seconds: 5380 },
            { seconds: 5360 },
            { seconds: 5340 },
            { seconds: 5320 },
        ];
        const result = calculateTimeRating(timeControls, dataset);
        assert.isUndefined(result, 'should return undefined for exactly 5 moves');
    });

    test('returns undefined for short time control', () => {
        const timeControls = [{ seconds: 300 }]; // 5 min blitz
        const dataset: ClockDatum[] = Array.from({ length: 20 }, (_, i) => ({
            seconds: 300 - i * 10,
        }));
        const result = calculateTimeRating(timeControls, dataset);
        assert.isUndefined(result, 'should return undefined for time control < 30 min');
    });

    test('returns exact rating for steady 90-min game', () => {
        const timeControls = [{ seconds: 5400 }]; // 90 min
        // Simulate steady clock usage over 25 moves
        const dataset: ClockDatum[] = Array.from({ length: 26 }, (_, i) => ({
            seconds: 5400 - i * 180,
        }));
        const result = calculateTimeRating(timeControls, dataset);

        assert.isDefined(result);
        // Steady 180s/move usage over 25 moves with 90-min time control → rating 1947, area -14029
        assert.equal(result?.rating, 1947);
        assert.equal(result?.area, -14029);
    });
});
