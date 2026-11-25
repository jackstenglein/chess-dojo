import { TimelineEntry } from '@/database/timeline';
import { describe, expect, it } from 'vitest';
import { isNegativeEntry } from './NewsfeedItem';

const entry = (previousCount: number, newCount: number, minutesSpent: number) =>
    ({ previousCount, newCount, minutesSpent }) as TimelineEntry;

describe('isNegativeEntry', () => {
    it.each([
        ['a task marked not done', entry(1, 0, 0), true],
        ['a lower count', entry(10, 8, 0), true],
        ['time removed', entry(5, 5, -15), true],
        ['progress made', entry(5, 10, 0), false],
        ['time logged', entry(5, 5, 30), false],
        ['a lower count with time logged', entry(10, 8, 30), false],
        ['more progress but time removed', entry(5, 10, -15), false],
    ])('%s', (_, e, negative) => {
        expect(isNegativeEntry(e)).toBe(negative);
    });
});
