import { describe, expect, it } from 'vitest';
import { COHORT, makeTask } from './__fixtures__/tasks';
import { taskDisplayName } from './taskDisplayName';

describe('taskDisplayName', () => {
    it('drops the suggested time from the daily name', () => {
        const task = makeTask({ dailyName: 'Solve Polgar M2s - {{time}}' });
        expect(taskDisplayName({ task, cohort: COHORT })).toBe('Solve Polgar M2s');
    });

    it('fills in the count for the cohort', () => {
        const task = makeTask({ name: 'Play {{count}} Classical Games', counts: { [COHORT]: 40 } });
        expect(taskDisplayName({ task, cohort: COHORT })).toBe('Play 40 Classical Games');
    });

    it('uses the name when there is no daily name', () => {
        expect(taskDisplayName({ task: makeTask(), cohort: COHORT })).toBe('Solve Puzzles');
    });
});
