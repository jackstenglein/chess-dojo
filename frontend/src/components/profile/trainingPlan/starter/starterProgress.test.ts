import { describe, expect, it } from 'vitest';
import {
    getStarterTasks,
    isStarterPlanFinished,
    withoutStarterTask,
    withStarterPlanFinished,
    withStarterTask,
    withStarterTaskCredited,
} from './starterProgress';

const taskId = '38f46441-7a4e-4506-8632-166bcbe78baf';
const date = new Date('2026-11-21T10:00:00.000Z');

describe('starter progress storage', () => {
    it('reads back a task marked done', () => {
        const tutorials = withStarterTask({ ScoreboardPage: true }, taskId, 45, date);

        expect(getStarterTasks(tutorials)).toEqual({
            [taskId]: { taskId, minutes: 45, completedAt: date.toISOString(), credited: false },
        });
        // Other tutorials are kept.
        expect(tutorials.ScoreboardPage).toBe(true);
    });

    it('replaces an older record of the same task', () => {
        let tutorials = withStarterTask({}, taskId, 45, date);
        tutorials = withStarterTask(tutorials, taskId, 10, date);

        expect(Object.keys(tutorials)).toHaveLength(1);
        expect(getStarterTasks(tutorials)[taskId].minutes).toBe(10);
    });

    it('rounds minutes to a whole, non-negative number', () => {
        expect(getStarterTasks(withStarterTask({}, taskId, 12.6, date))[taskId].minutes).toBe(13);
        expect(getStarterTasks(withStarterTask({}, taskId, -5, date))[taskId].minutes).toBe(0);
    });

    it('removes a task', () => {
        const tutorials = withoutStarterTask(withStarterTask({}, taskId, 45, date), taskId);
        expect(getStarterTasks(tutorials)).toEqual({});
    });

    it('marks a task credited', () => {
        const tutorials = withStarterTaskCredited(withStarterTask({}, taskId, 45, date), taskId);
        expect(getStarterTasks(tutorials)[taskId].credited).toBe(true);
    });

    it('ignores unrelated and malformed keys', () => {
        expect(
            getStarterTasks({
                ScoreboardPage: true,
                'starter:abc:notanumber:1': true,
                'starter:abc:10:notadate': true,
                [`starter:${taskId}:10:${date.getTime()}`]: false,
            }),
        ).toEqual({});
    });

    it('marks the starter plan finished', () => {
        expect(isStarterPlanFinished({})).toBe(false);
        expect(isStarterPlanFinished(withStarterPlanFinished({}))).toBe(true);
    });
});
