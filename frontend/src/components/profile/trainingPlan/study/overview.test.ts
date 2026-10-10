import { SubscriptionStatus } from '@/database/user';
import { describe, expect, it } from 'vitest';
import { buildOverview } from './overview';
import {
    cohortBook,
    courses,
    folderTask,
    member,
    memberAt1000,
    memberEntries,
    najdorfTask,
    polgarPartBook,
    polgarTask,
    requirements,
    user,
} from './overviewFixtures';

const books = new Map([['study-1500-1600', cohortBook]]);

describe('buildOverview', () => {
    it('describes a member in 1500-1600 with progress and two custom studies', () => {
        const model = buildOverview({
            user: member,
            requirements,
            courses,
            entries: memberEntries,
            books,
        });

        expect(model.cohortStudies).toHaveLength(1);
        expect(model.cohortStudies[0]).toMatchObject({
            cohort: '1500-1600',
            done: 5,
            total: 22,
            minutes: 220,
            lastEntry: { id: 'e1' },
            next: { name: 'Game 6' },
        });

        expect(model.studies.map((s) => s.task.id)).toEqual(['folder-task', 'najdorf-task']);
        expect(model.studies[0]).toMatchObject({ done: 3, total: 12, lastEntry: { id: 'e2' } });
        expect(model.studies[1]).toMatchObject({ done: 0, total: 31 });
        expect(model.studies[1].lastEntry).toBeUndefined();

        expect(model.courses.map((c) => [c.course.id, c.inCohort])).toEqual([
            ['french', true],
            ['caro', true],
            ['e4', false],
        ]);

        expect(model.cohortStudies[0]).toMatchObject({ browse: false, unit: 'games' });
        expect(model.cohortStudies[0].nextPosition).toBeUndefined();

        expect(model.cohorts).toHaveLength(22);
        expect(model.cohorts[0]).toBe('300-400');
        expect(model.cohorts).toContain('1500-1600');
        expect(model.cohorts[21]).toBe('2400+');
    });

    it('starts a new member on the first game with nothing else', () => {
        const model = buildOverview({
            user: user({ dojoCohort: '1800-1900' }),
            requirements,
            courses,
            entries: [],
            books: new Map([['study-1800-1900', cohortBook]]),
        });
        expect(model.cohortStudies[0]).toMatchObject({
            done: 0,
            minutes: 0,
            next: { name: 'Game 1' },
        });
        expect(model.cohortStudies[0].lastEntry).toBeUndefined();
        expect(model.studies).toEqual([]);
        expect(model.courses.map((c) => [c.course.id, c.inCohort])).toEqual([
            ['najdorf', false],
            ['french', false],
            ['caro', false],
            ['e4', true],
        ]);
    });

    it('leaves out a custom study whose counts do not name the member cohort', () => {
        const foreign = { ...folderTask, id: 'foreign', counts: { '2000-2100': 12 } };
        const model = buildOverview({
            user: user({ customTasks: [foreign, najdorfTask] }),
            requirements,
            courses,
            entries: [],
        });
        expect(model.studies.map((s) => s.task.id)).toEqual(['najdorf-task']);
    });

    it('leaves the next game unknown until the course is loaded', () => {
        const model = buildOverview({
            user: member,
            requirements,
            courses,
            entries: memberEntries,
        });
        expect(model.cohortStudies[0].next).toBeUndefined();
    });

    it('gives a member in 0-300 no cohort study and all 22 cells', () => {
        const model = buildOverview({
            user: user({ dojoCohort: '0-300' }),
            requirements,
            courses,
            entries: [],
        });
        expect(model.cohortStudies).toEqual([]);
        expect(model.cohorts).toHaveLength(22);
    });

    it('offers a free member no course', () => {
        const model = buildOverview({
            user: user({ subscriptionStatus: SubscriptionStatus.NotSubscribed }),
            requirements,
            courses,
            entries: [],
        });
        expect(model.courses).toEqual([]);
    });
});

describe('buildOverview: a workbook and the cohort switch', () => {
    const input = {
        user: memberAt1000,
        requirements: [...requirements, polgarTask],
        courses,
        entries: [],
    };

    it('counts a workbook from its start, in its unit, and names the next position', () => {
        const model = buildOverview({ ...input, books: new Map([['polgar', polgarPartBook]]) });
        const polgar = model.cohortStudies.find((s) => s.task.id === 'polgar');
        expect(polgar).toMatchObject({
            cohort: '1000-1100',
            name: 'Solve Polgar M2s through Problem 650',
            done: 114,
            total: 344,
            unit: 'exercises',
            nextPosition: 421,
            browse: false,
        });
        // The study page picks a workbook's item from the whole book and its mapping.
        expect(polgar?.next).toBeUndefined();
    });

    it('starts a workbook at its first position when the count is below the start', () => {
        const below = user({
            dojoCohort: '1000-1100',
            progress: {
                polgar: {
                    requirementId: 'polgar',
                    counts: { ALL_COHORTS: 2 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
        });
        const model = buildOverview({ ...input, user: below });
        const polgar = model.cohortStudies.find((s) => s.task.id === 'polgar');
        expect(polgar).toMatchObject({ done: 0, nextPosition: 307 });
        expect(polgar?.courseName).toBeUndefined();
    });

    it('clamps done to the cohort target', () => {
        const ahead = user({
            dojoCohort: '1000-1100',
            progress: {
                polgar: {
                    requirementId: 'polgar',
                    counts: { ALL_COHORTS: 800 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
        });
        const model = buildOverview({ ...input, user: ahead });
        const polgar = model.cohortStudies.find((s) => s.task.id === 'polgar');
        expect(polgar).toMatchObject({ done: 344, total: 344 });
        expect(polgar?.nextPosition).toBeUndefined();
    });

    it('shows another cohort with its own target, browsing', () => {
        const model = buildOverview({ ...input, viewCohort: '1500-1600' });
        expect(model.cohortStudies.map((s) => s.task.id)).toEqual(['study-1500-1600', 'polgar']);
        expect(model.cohortStudies[1]).toMatchObject({
            cohort: '1500-1600',
            done: 114,
            total: 1244,
            browse: true,
        });
        expect(model.cohortStudies[0]).toMatchObject({
            cohort: '1500-1600',
            done: 0,
            browse: true,
        });
    });

    it('has no next position once the target is reached', () => {
        const done = user({
            dojoCohort: '1000-1100',
            progress: {
                polgar: {
                    requirementId: 'polgar',
                    counts: { ALL_COHORTS: 650 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
        });
        const model = buildOverview({ ...input, user: done });
        const polgar = model.cohortStudies.find((s) => s.task.id === 'polgar');
        expect(polgar).toMatchObject({ done: 344, total: 344 });
        expect(polgar?.nextPosition).toBeUndefined();
    });
});
