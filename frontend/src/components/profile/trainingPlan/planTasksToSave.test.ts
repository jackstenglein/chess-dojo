import { WeeklyPlan } from '@/database/user';
import { describe, expect, it } from 'vitest';
import { makeTask } from './__fixtures__/tasks';
import { planTasksToSave } from './planTasksToSave';
import { SuggestedTask } from './suggestedTasks';

// Week of Sun Nov 15 - Sat Nov 21 2026, viewed on Thursday Nov 19.
const endDate = new Date(2026, 10, 22).toISOString();
const now = new Date(2026, 10, 19, 9, 30);

const suggest = (id: string, minutes: number): SuggestedTask => ({
    task: makeTask({ id }),
    goalMinutes: minutes,
});

function plan(tasks: WeeklyPlan['tasks'], end = endDate): WeeklyPlan {
    return { endDate: end, tasks, progressUpdatedAt: '', nextGame: '' };
}

describe('planTasksToSave', () => {
    const saved = plan([
        [],
        [{ id: 'mon', minutes: 30 }],
        [{ id: 'tue', minutes: 30 }],
        [{ id: 'wed', minutes: 30 }],
        [{ id: 'old-thu', minutes: 30 }],
        [{ id: 'old-fri', minutes: 30 }],
        [],
    ]);

    it('keeps past days exactly as saved, even if they were not worked out again', () => {
        const computed: SuggestedTask[][] = [
            [],
            [],
            [],
            [],
            [suggest('thu', 60)],
            [suggest('fri', 30)],
            [suggest('sat', 30)],
        ];
        expect(planTasksToSave(saved, computed, endDate, now)).toEqual([
            [],
            [{ id: 'mon', minutes: 30 }],
            [{ id: 'tue', minutes: 30 }],
            [{ id: 'wed', minutes: 30 }],
            [{ id: 'thu', minutes: 60 }],
            [{ id: 'fri', minutes: 30 }],
            [{ id: 'sat', minutes: 30 }],
        ]);
    });

    it('saves the new suggestions for every day in a new week', () => {
        const lastWeek = plan(saved.tasks, new Date(2026, 10, 15).toISOString());
        const computed = new Array(7).fill(0).map((_, i) => [suggest(`day-${i}`, 30)]);
        expect(planTasksToSave(lastWeek, computed, endDate, now).map((d) => d[0].id)).toEqual(
            computed.map((d) => d[0].task.id),
        );
    });

    it("keeps a task skipped from today in today's plan, so restoring it brings it back", () => {
        const withSkip = {
            ...plan([
                [],
                [],
                [],
                [],
                [
                    { id: 'skipped', minutes: 30 },
                    { id: 'thu', minutes: 30 },
                ],
                [],
                [],
            ]),
            skippedTasks: ['skipped'],
        };
        const computed: SuggestedTask[][] = [[], [], [], [], [suggest('thu', 60)], [], []];
        expect(planTasksToSave(withSkip, computed, endDate, now)[4]).toEqual([
            { id: 'thu', minutes: 60 },
            { id: 'skipped', minutes: 30 },
        ]);
    });
});
