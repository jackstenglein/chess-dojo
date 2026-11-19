import { describe, expect, it } from 'vitest';
import { isDailyTaskDone } from './DailyCard';

describe('isDailyTaskDone', () => {
    it('is done once the planned time is logged', () => {
        expect(isDailyTaskDone(30, 30)).toBe(true);
        expect(isDailyTaskDone(45, 30)).toBe(true);
        expect(isDailyTaskDone(10, 30)).toBe(false);
    });

    it('counts unplanned time that was logged as done', () => {
        expect(isDailyTaskDone(10, 0)).toBe(true);
    });

    it('keeps a task with nothing planned and nothing logged to do', () => {
        expect(isDailyTaskDone(0, 0)).toBe(false);
    });

    it('is done when the task itself is finished, with or without time', () => {
        expect(isDailyTaskDone(0, 0, true)).toBe(true);
        expect(isDailyTaskDone(0, 30, true)).toBe(true);
    });
});
