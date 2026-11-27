import { describe, expect, it } from 'vitest';
import {
    computeAccountStats,
    getAccountKind,
    hasStartedStarterPlan,
    StatsUser,
    toSnapshot,
    weekStart,
} from './stats';

const now = new Date('2026-11-26T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

describe('getAccountKind', () => {
    it('classifies accounts', () => {
        expect(getAccountKind({ username: 'a' })).toBe('free');
        expect(getAccountKind({ username: 'a', subscriptionStatus: 'NOT_SUBSCRIBED' })).toBe(
            'free',
        );
        expect(getAccountKind({ username: 'a', subscriptionStatus: 'SUBSCRIBED' })).toBe('paying');
        expect(
            getAccountKind({
                username: 'a',
                subscriptionStatus: 'SUBSCRIBED',
                paymentInfo: { customerId: 'OVERRIDE' },
            }),
        ).toBe('complimentary');
        expect(getAccountKind({ username: 'a', subscriptionStatus: 'CANCELED' })).toBe('churned');
    });
});

describe('hasStartedStarterPlan', () => {
    it('detects a started starter plan', () => {
        expect(hasStartedStarterPlan(undefined)).toBe(false);
        expect(hasStartedStarterPlan({ SomeTutorial: true })).toBe(false);
        expect(hasStartedStarterPlan({ 'starter:t:5:1': false })).toBe(false);
        expect(hasStartedStarterPlan({ 'starter:t:5:1': true })).toBe(true);
        expect(hasStartedStarterPlan({ StarterPlanStarted: true })).toBe(true);
        expect(hasStartedStarterPlan({ StarterPlan: true })).toBe(true);
        expect(hasStartedStarterPlan({ 'starterCredited:t': true })).toBe(false);
    });
});

describe('computeAccountStats', () => {
    const users: StatsUser[] = [
        {
            username: 'free-new',
            dojoCohort: 'NO_COHORT',
            createdAt: '2026-11-02T00:00:00Z',
            updatedAt: daysAgo(0.5),
        },
        {
            username: 'free-starter',
            dojoCohort: '1000-1100',
            createdAt: '2026-11-10T00:00:00Z',
            updatedAt: daysAgo(3),
            tutorials: { StarterPlan: true },
            customPlans: [{ id: 'p' }],
        },
        {
            username: 'paying',
            dojoCohort: '1000-1100',
            createdAt: '2026-10-05T00:00:00Z',
            updatedAt: daysAgo(20),
            subscriptionStatus: 'SUBSCRIBED',
            // Marked a starter task done on Wednesday 18 Nov 2026.
            tutorials: { [`starter:task-1:30:${Date.UTC(2026, 10, 18, 9)}`]: true },
        },
        {
            username: 'churned',
            dojoCohort: '1500-1600',
            createdAt: '2026-10-20T00:00:00Z',
            updatedAt: daysAgo(90),
            subscriptionStatus: 'CANCELED',
        },
        { username: 'no-dates' },
    ];
    const stats = computeAccountStats(users, ['1000-1100', '1500-1600'], now);

    it('counts totals and activity', () => {
        expect(stats.totals).toEqual({
            accounts: 5,
            free: 3,
            paying: 1,
            churned: 1,
            complimentary: 0,
            notOnboarded: 2,
            active1: 1,
            active7: 2,
            active30: 3,
            freeActive30: 2,
            paidActive30: 1,
            complimentaryActive30: 0,
        });
    });

    it('groups signups by month, oldest first', () => {
        expect(stats.months).toEqual([
            {
                month: '2026-10',
                signups: 2,
                free: 0,
                paying: 1,
                churned: 1,
                complimentary: 0,
                onboarded: 2,
                active30: 1,
                starterStarted: 1,
                starterFinished: 0,
            },
            {
                month: '2026-11',
                signups: 2,
                free: 2,
                paying: 0,
                churned: 0,
                complimentary: 0,
                onboarded: 1,
                active30: 2,
                starterStarted: 1,
                starterFinished: 1,
            },
        ]);
    });

    it('groups signups by week, starting Monday', () => {
        const row = (week: string, counts: Record<string, number>) => ({
            week,
            signups: 1,
            free: 0,
            paying: 0,
            churned: 0,
            complimentary: 0,
            onboarded: 0,
            active30: 0,
            starterStarted: 0,
            starterFinished: 0,
            ...counts,
        });
        expect(stats.weeks).toEqual([
            row('2026-10-05', { paying: 1, onboarded: 1, active30: 1, starterStarted: 1 }),
            row('2026-10-19', { churned: 1, onboarded: 1 }),
            row('2026-11-02', { free: 1, active30: 1 }),
            row('2026-11-09', {
                free: 1,
                onboarded: 1,
                active30: 1,
                starterStarted: 1,
                starterFinished: 1,
            }),
        ]);
    });

    it('counts members doing starter tasks each week', () => {
        expect(stats.starterWeeks).toEqual([{ week: '2026-11-16', free: 0, paying: 1 }]);
    });

    it('counts cohorts and free plan use', () => {
        expect(stats.cohorts).toEqual([
            { cohort: '1000-1100', free: 1, paid: 1, active30: 2 },
            { cohort: '1500-1600', free: 0, paid: 1, active30: 0 },
        ]);
        expect(stats.freePlan).toEqual({ freeOnboarded: 1, starterFinished: 1, customPlan: 1 });
    });

    it('compares free and paying members', () => {
        expect(stats.members).toEqual({
            free: {
                accounts: 3,
                onboarded: 1,
                active1: 1,
                active7: 2,
                active30: 2,
                starterStarted: 1,
                starterFinished: 1,
                customPlan: 1,
            },
            paying: {
                accounts: 1,
                onboarded: 1,
                active1: 0,
                active7: 0,
                active30: 1,
                starterStarted: 1,
                starterFinished: 0,
                customPlan: 0,
            },
        });
    });

    it('makes a daily snapshot', () => {
        expect(toSnapshot(stats, now)).toEqual({
            date: '2026-11-26',
            accounts: 5,
            free: 3,
            paying: 1,
            paid: 2,
            active7: 2,
            active30: 3,
            freeActive30: 2,
            payingActive30: 1,
            starterStarted: 2,
            starterFinished: 1,
        });
    });
});

describe('weekStart', () => {
    it('returns the Monday of the week in UTC', () => {
        expect(weekStart(Date.parse('2026-11-23T00:00:00Z'))).toBe('2026-11-23');
        expect(weekStart(Date.parse('2026-11-29T23:59:00Z'))).toBe('2026-11-23');
        expect(weekStart(Date.parse('2026-01-01T12:00:00Z'))).toBe('2025-12-29');
    });
});
