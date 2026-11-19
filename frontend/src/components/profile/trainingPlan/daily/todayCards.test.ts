import { RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { describe, expect, it } from 'vitest';
import { COHORT, makeTask } from '../__fixtures__/tasks';
import { SCHEDULE_CLASSICAL_GAME_TASK, SuggestedTask } from '../suggestedTasks';
import { getTodayCards, isCheckOffTask, isGuideTask } from './todayCards';

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
        user: { dojoCohort: COHORT, progress: {} },
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

    it('counts a finished task as done even with no time logged', () => {
        const checkbox = makeTask({ id: 'checkbox', counts: { [COHORT]: 1 } });
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(checkbox, 0), suggest(polgar, 30)],
            pinnedTaskIds: new Set(['checkbox']),
            user: {
                dojoCohort: COHORT,
                progress: {
                    checkbox: {
                        requirementId: 'checkbox',
                        counts: { ALL_COHORTS: 1 },
                        minutesSpent: {},
                        updatedAt: '2026-11-18T12:00:00.000Z',
                    },
                },
            },
        });
        expect(ids(cards)).toEqual(['polgar', 'checkbox']);
        expect(cards[1].done).toBe(true);
        expect(cards[1].planned).toBe(false);
    });

    it('lists every task to do before any done, planned ones first, and logged time does not finish unplanned ones', () => {
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(polgar, 30), suggest(games, 30)],
            extraTasks: [logged],
            timeline: [logEntry('logged', 15), logEntry('games', 30)],
        });
        expect(ids(cards)).toEqual(['polgar', 'logged', 'games']);
        expect(cards.map((c) => [c.planned, c.done])).toEqual([
            [true, false],
            [false, false],
            [true, true],
        ]);
    });

    it('shows only pinned and logged tasks when suggestions are hidden', () => {
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(polgar, 30), suggest(games, 30)],
            extraTasks: [logged],
            pinnedTaskIds: new Set(['games']),
            timeline: [logEntry('logged', 15)],
            showSuggestions: false,
        });
        expect(ids(cards)).toEqual(['games', 'logged']);
    });

    it('counts Welcome tasks as done only once checked off, not by time logged', () => {
        const intro = makeTask({
            id: 'intro',
            category: RequirementCategory.Welcome,
            counts: { [COHORT]: 1 },
        });
        const discord = makeTask({
            id: 'discord',
            category: RequirementCategory.Welcome,
            counts: { [COHORT]: 1 },
        });
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(intro, 10), suggest(discord, 5)],
            timeline: [logEntry('intro', 30)],
            user: {
                dojoCohort: COHORT,
                progress: {
                    discord: {
                        requirementId: 'discord',
                        counts: { ALL_COHORTS: 1 },
                        minutesSpent: {},
                        updatedAt: '2026-11-18T12:00:00.000Z',
                    },
                },
            },
        });
        expect(cards.map((c) => [c.suggestion.task.id, c.done])).toEqual([
            ['intro', false],
            ['discord', true],
        ]);
    });

    it('puts the unplanned task with more time logged after the one with less', () => {
        const more = makeTask({ id: 'more' });
        const less = makeTask({ id: 'less' });
        const cards = getTodayCards({
            ...base,
            suggestions: [suggest(polgar, 30)],
            extraTasks: [more, less],
            timeline: [logEntry('more', 90), logEntry('less', 30)],
        });
        expect(ids(cards)).toEqual(['polgar', 'less', 'more']);
    });
});

describe('isCheckOffTask', () => {
    it('is true for Welcome tasks and single checkboxes only', () => {
        expect(isCheckOffTask(makeTask({ category: RequirementCategory.Welcome }), COHORT)).toBe(
            true,
        );
        expect(
            isCheckOffTask(
                makeTask({
                    scoreboardDisplay: ScoreboardDisplay.Checkbox,
                    counts: { [COHORT]: 1 },
                }),
                COHORT,
            ),
        ).toBe(true);
        expect(
            isCheckOffTask(
                makeTask({
                    scoreboardDisplay: ScoreboardDisplay.Checkbox,
                    counts: { [COHORT]: 3 },
                }),
                COHORT,
            ),
        ).toBe(false);
        expect(isCheckOffTask(makeTask({}), COHORT)).toBe(false);
    });
});

describe('isGuideTask', () => {
    it('spots guides to read by their name', () => {
        expect(isGuideTask(makeTask({ name: 'Read Tactics Guide' }), COHORT)).toBe(true);
        expect(isGuideTask(makeTask({ name: 'Read How to Find a Training Partner' }), COHORT)).toBe(
            true,
        );
        expect(isGuideTask(makeTask({ name: 'Read Evaluate like a GM' }), COHORT)).toBe(false);
        expect(isCheckOffTask(makeTask({ name: 'Read Tactics Guide' }), COHORT)).toBe(true);
    });
});
