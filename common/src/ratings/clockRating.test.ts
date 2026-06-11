import { assert, describe, test } from 'vitest';
import { ClockDatum, calculateTimeRating } from './clockRating';

describe('calculateTimeRating', () => {
    test('returns undefined for too few moves', () => {
        const timeControls = [{ seconds: 5400 }];
        const dataset: ClockDatum[] = [{ seconds: 5400 }, { seconds: 5380 }, { seconds: 5360 }];
        const result = calculateTimeRating(timeControls, dataset);
        assert.isUndefined(result, 'should return undefined for < 5 moves');
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
