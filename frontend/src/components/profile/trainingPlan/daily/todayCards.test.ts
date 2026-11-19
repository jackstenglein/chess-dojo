import { TimelineEntry } from '@/database/timeline';
import { describe, expect, it } from 'vitest';
import { makeTask } from '../__fixtures__/tasks';
import { SCHEDULE_CLASSICAL_GAME_TASK, SuggestedTask } from '../suggestedTasks';
import { getTodayCards } from './todayCards';

const startDate = '2026-11-18T00:00:00.000Z';
const endDate = '2026-11-19T00:00:00.000Z';

const polgar = makeTask({ id: 'polgar' });
const games = makeTask({ id: 'games' });
const guide = makeTask({ id: 'guide' });
const logged = makeTask({ id: 'logged' });

function suggest(task: SuggestedTask['task'], goalMinutes: number): SuggestedTask {
    return { task, goalMinutes };
}

function logEntry(requirementId: string, minutesSpent: number): TimelineEntry {
    return {
        requirementId,
        minutesSpent,
        date: '2026-11-18T12:00:00.000Z',
        createdAt: '2026-11-18T12:00:00.000Z',
    } as TimelineEntry;
}

function ids(cards: ReturnType<typeof getTodayCards>) {
    return cards.map((c) => c.suggestion.task.id);
}

describe('getTodayCards', () => {
    const base = {
        extraTasks: [],
        pinnedTaskIds: new Set<string>(),
        timeline: [],
        startDate,
        endDate,
    };

    it('lists tasks to do before tasks done, keeping the planned order', () => {
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(polgar, 30), suggest(games, 30), suggest(guide, 30)],
            timeline: [logEntry('polgar', 30)],
        });
        expect(ids(cards)).toEqual(['games', 'guide', 'polgar']);
        expect(cards.map((c) => c.done)).toEqual([false, false, true]);
    });

    it('leaves out skipped tasks, even pinned or logged ones', () => {
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(polgar, 30), suggest(guide, 0)],
            extraTasks: [logged],
            pinnedTaskIds: new Set(['guide']),
            skippedTaskIds: ['guide', 'logged'],
            timeline: [logEntry('logged', 0)],
        });
        expect(ids(cards)).toEqual(['polgar']);
    });

    it('keeps pinned tasks with no planned time, and drops other unplanned ones', () => {
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(guide, 0), suggest(games, 0)],
            pinnedTaskIds: new Set(['guide']),
        });
        expect(ids(cards)).toEqual(['guide']);
        expect(cards[0].done).toBe(false);
    });

    it('marks the schedule-a-game card done once a game is scheduled', () => {
        const future = new Date(Date.now() + 86400000).toISOString();
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(SCHEDULE_CLASSICAL_GAME_TASK, 0), suggest(polgar, 30)],
            gameSchedule: [{ date: future, count: 1 }],
        });
        expect(ids(cards)).toEqual(['polgar', SCHEDULE_CLASSICAL_GAME_TASK.id]);
    });
});
