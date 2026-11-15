import { describe, expect, it } from 'vitest';
import { makeEntry, makeTask } from '../__fixtures__/tasks';
import { SCHEDULE_CLASSICAL_GAME_TASK } from '../suggestedTasks';
import { getTodaySummary } from './todaySummary';

const startDate = new Date(2026, 8, 24).toISOString();
const endDate = new Date(2026, 8, 25).toISOString();
const during = new Date(2026, 8, 24, 10).toISOString();
const yesterday = new Date(2026, 8, 23, 10).toISOString();

const polgar = makeTask({ id: 'polgar' });
const sparring = makeTask({ id: 'sparring' });
const suggestions = [
    { task: SCHEDULE_CLASSICAL_GAME_TASK, goalMinutes: 0 },
    { task: polgar, goalMinutes: 30 },
    { task: sparring, goalMinutes: 30 },
];

describe('getTodaySummary', () => {
    it('counts the schedule-a-game card as one of the tasks', () => {
        expect(getTodaySummary({ suggestions, timeline: [], startDate, endDate })).toEqual({
            taskCount: 3,
            doneCount: 0,
        });
    });

    it('counts a task as done once its time goal is met today', () => {
        const timeline = [makeEntry('polgar', during, 20), makeEntry('polgar', during, 10)];
        expect(getTodaySummary({ suggestions, timeline, startDate, endDate }).doneCount).toBe(1);
    });

    it('does not count time from another day', () => {
        const timeline = [makeEntry('polgar', yesterday, 30)];
        expect(getTodaySummary({ suggestions, timeline, startDate, endDate }).doneCount).toBe(0);
    });

    it('counts the schedule card as done once a game is on the calendar', () => {
        const gameSchedule = [{ date: new Date(2099, 0, 1).toISOString(), count: 1 }];
        expect(
            getTodaySummary({ suggestions, timeline: [], startDate, endDate, gameSchedule })
                .doneCount,
        ).toBe(1);
    });
});
