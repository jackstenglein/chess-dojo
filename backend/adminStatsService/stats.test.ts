import { describe, expect, it } from 'vitest';
import { computeAccountStats, getAccountKind, StatsUser, toSnapshot } from './stats';

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
            },
        ]);
    });

    it('counts cohorts and free plan use', () => {
        expect(stats.cohorts).toEqual([
            { cohort: '1000-1100', free: 1, paid: 1, active30: 2 },
            { cohort: '1500-1600', free: 0, paid: 1, active30: 0 },
        ]);
        expect(stats.freePlan).toEqual({ freeOnboarded: 1, starterFinished: 1, customPlan: 1 });
    });

    it('makes a daily snapshot', () => {
        expect(toSnapshot(stats.totals, now)).toEqual({
            date: '2026-11-26',
            accounts: 5,
            free: 3,
            paying: 1,
            paid: 2,
            active7: 2,
            active30: 3,
        });
    });
});
