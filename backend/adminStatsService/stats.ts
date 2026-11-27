import {
    AdminStatsCohort,
    AdminStatsFreePlan,
    AdminStatsMemberGroup,
    AdminStatsMembers,
    AdminStatsMonth,
    AdminStatsSnapshot,
    AdminStatsTotals,
} from '@jackstenglein/chess-dojo-common/src/adminStats/api';

/** The user fields the stats need; everything else is left out of the query. */
export interface StatsUser {
    username: string;
    dojoCohort?: string;
    createdAt?: string;
    updatedAt?: string;
    subscriptionStatus?: string;
    paymentInfo?: { customerId?: string };
    tutorials?: Record<string, boolean>;
    customPlans?: unknown[];
}

/** The attributes to read for a StatsUser. customPlans is checked by size, not loaded whole. */
export const STATS_USER_ATTRIBUTES = [
    'username',
    'dojoCohort',
    'createdAt',
    'updatedAt',
    'subscriptionStatus',
    'paymentInfo.customerId',
    'tutorials',
    'customPlans[0].id',
] as const;

export const NO_COHORT = 'NO_COHORT';

/** The tutorials key set when a member finishes (or skips) the Dojo Starter Plan. */
const STARTER_PLAN_FINISHED_KEY = 'StarterPlan';
/** The tutorials key set when an existing member chooses to start the Dojo Starter Plan. */
const STARTER_PLAN_STARTED_KEY = 'StarterPlanStarted';
/** The prefix of the tutorials keys recording a starter task marked done. */
const STARTER_TASK_PREFIX = 'starter:';

/** Returns whether the member began the Dojo Starter Plan. */
export function hasStartedStarterPlan(tutorials: Record<string, boolean> | undefined): boolean {
    if (!tutorials) return false;
    if (tutorials[STARTER_PLAN_FINISHED_KEY] || tutorials[STARTER_PLAN_STARTED_KEY]) return true;
    return Object.entries(tutorials).some(
        ([key, value]) => value && key.startsWith(STARTER_TASK_PREFIX),
    );
}

const emptyGroup = (): AdminStatsMemberGroup => ({
    accounts: 0,
    onboarded: 0,
    active1: 0,
    active7: 0,
    active30: 0,
    starterStarted: 0,
    starterFinished: 0,
    customPlan: 0,
});

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccountKind = 'free' | 'paying' | 'churned' | 'complimentary';

/**
 * Returns what an account is now: complimentary access from an admin, a paid
 * subscription, a canceled one, or free.
 */
export function getAccountKind(user: StatsUser): AccountKind {
    if (user.subscriptionStatus === 'SUBSCRIBED') {
        return user.paymentInfo?.customerId === 'OVERRIDE' ? 'complimentary' : 'paying';
    }
    if (user.subscriptionStatus === 'CANCELED') {
        return 'churned';
    }
    return 'free';
}

/** The stats computed from every account. */
export interface AccountStats {
    totals: AdminStatsTotals;
    months: AdminStatsMonth[];
    cohorts: AdminStatsCohort[];
    freePlan: AdminStatsFreePlan;
    members: AdminStatsMembers;
}

/**
 * Counts accounts by signup month, cohort and kind, and how many were active
 * (their user record was last updated) within the last 1, 7 and 30 days.
 * @param users Every account.
 * @param cohorts The cohorts to list, in order.
 * @param now The current time.
 */
export function computeAccountStats(
    users: Iterable<StatsUser>,
    cohorts: readonly string[],
    now: Date,
): AccountStats {
    const totals: AdminStatsTotals = {
        accounts: 0,
        free: 0,
        paying: 0,
        churned: 0,
        complimentary: 0,
        notOnboarded: 0,
        active1: 0,
        active7: 0,
        active30: 0,
        freeActive30: 0,
        paidActive30: 0,
        complimentaryActive30: 0,
    };
    const months = new Map<string, AdminStatsMonth>();
    const cohortStats = new Map<string, AdminStatsCohort>(
        cohorts.map((cohort) => [cohort, { cohort, free: 0, paid: 0, active30: 0 }]),
    );
    const freePlan: AdminStatsFreePlan = { freeOnboarded: 0, starterFinished: 0, customPlan: 0 };
    const members: AdminStatsMembers = { free: emptyGroup(), paying: emptyGroup() };

    for (const user of users) {
        const kind = getAccountKind(user);
        const onboarded = !!user.dojoCohort && user.dojoCohort !== NO_COHORT;
        const daysSinceActive = daysSince(user.updatedAt, now);
        const active30 = daysSinceActive < 30;

        totals.accounts++;
        totals[kind]++;
        if (!onboarded) totals.notOnboarded++;
        if (daysSinceActive < 1) totals.active1++;
        if (daysSinceActive < 7) totals.active7++;
        if (active30) {
            totals.active30++;
            if (kind === 'free') totals.freeActive30++;
            if (kind === 'paying' || kind === 'churned') totals.paidActive30++;
            if (kind === 'complimentary') totals.complimentaryActive30++;
        }

        const month = user.createdAt?.slice(0, 7);
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            let row = months.get(month);
            if (!row) {
                row = {
                    month,
                    signups: 0,
                    free: 0,
                    paying: 0,
                    churned: 0,
                    complimentary: 0,
                    onboarded: 0,
                    active30: 0,
                };
                months.set(month, row);
            }
            row.signups++;
            row[kind]++;
            if (onboarded) row.onboarded++;
            if (active30) row.active30++;
        }

        const cohortRow = user.dojoCohort ? cohortStats.get(user.dojoCohort) : undefined;
        if (cohortRow) {
            if (kind === 'free') cohortRow.free++;
            if (kind === 'paying' || kind === 'churned') cohortRow.paid++;
            if (active30) cohortRow.active30++;
        }

        const group = kind === 'free' || kind === 'paying' ? members[kind] : undefined;
        if (group) {
            group.accounts++;
            if (onboarded) group.onboarded++;
            if (daysSinceActive < 1) group.active1++;
            if (daysSinceActive < 7) group.active7++;
            if (active30) group.active30++;
            if (hasStartedStarterPlan(user.tutorials)) group.starterStarted++;
            if (user.tutorials?.[STARTER_PLAN_FINISHED_KEY]) group.starterFinished++;
            if (user.customPlans?.length) group.customPlan++;
        }

        if (kind === 'free' && onboarded) {
            freePlan.freeOnboarded++;
            if (user.tutorials?.[STARTER_PLAN_FINISHED_KEY]) freePlan.starterFinished++;
            if (user.customPlans?.length) freePlan.customPlan++;
        }
    }

    return {
        totals,
        months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
        cohorts: [...cohortStats.values()],
        freePlan,
        members,
    };
}

/** Returns the days from an ISO date to now, or Infinity for a missing or invalid date. */
function daysSince(date: string | undefined, now: Date): number {
    const time = date ? Date.parse(date) : NaN;
    return Number.isNaN(time) ? Infinity : (now.getTime() - time) / DAY_MS;
}

/** Returns the snapshot saved for a day from its totals. */
export function toSnapshot(totals: AdminStatsTotals, now: Date): AdminStatsSnapshot {
    return {
        date: now.toISOString().slice(0, 10),
        accounts: totals.accounts,
        free: totals.free,
        paying: totals.paying,
        paid: totals.paying + totals.churned,
        active7: totals.active7,
        active30: totals.active30,
    };
}
