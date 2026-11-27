import {
    AdminStatsCohort,
    AdminStatsFreePlan,
    AdminStatsMemberGroup,
    AdminStatsMembers,
    AdminStatsMonth,
    AdminStatsSnapshot,
    AdminStatsStarterWeek,
    AdminStatsTotals,
    AdminStatsWeek,
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

/** Returns the days (as ms timestamps) the member marked Starter Plan tasks done. */
function starterTaskTimes(tutorials: Record<string, boolean> | undefined): number[] {
    const times: number[] = [];
    for (const [key, value] of Object.entries(tutorials ?? {})) {
        if (!value || !key.startsWith(STARTER_TASK_PREFIX)) continue;
        const time = Number(key.split(':')[3]);
        if (Number.isFinite(time) && time > 0) times.push(time);
    }
    return times;
}

/** Returns the Monday (UTC) starting the week of the given time, as YYYY-MM-DD. */
export function weekStart(time: number): string {
    const date = new Date(time);
    const day = (date.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day))
        .toISOString()
        .slice(0, 10);
}

type SignupCounts = Omit<AdminStatsMonth, 'month'>;

const emptySignupCounts = (): Required<SignupCounts> => ({
    signups: 0,
    free: 0,
    paying: 0,
    churned: 0,
    complimentary: 0,
    onboarded: 0,
    active30: 0,
    starterStarted: 0,
    starterFinished: 0,
});

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
    weeks: AdminStatsWeek[];
    starterWeeks: AdminStatsStarterWeek[];
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
    const months = new Map<string, Required<SignupCounts>>();
    const weeks = new Map<string, Required<SignupCounts>>();
    const starterWeeks = new Map<string, AdminStatsStarterWeek>();
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

        const started = hasStartedStarterPlan(user.tutorials);
        const finished = !!user.tutorials?.[STARTER_PLAN_FINISHED_KEY];
        const created = user.createdAt ? Date.parse(user.createdAt) : NaN;
        if (!Number.isNaN(created)) {
            const keys: [Map<string, Required<SignupCounts>>, string][] = [
                [months, new Date(created).toISOString().slice(0, 7)],
                [weeks, weekStart(created)],
            ];
            for (const [periods, key] of keys) {
                let row = periods.get(key);
                if (!row) {
                    row = emptySignupCounts();
                    periods.set(key, row);
                }
                row.signups++;
                row[kind]++;
                if (onboarded) row.onboarded++;
                if (active30) row.active30++;
                if (started) row.starterStarted++;
                if (finished) row.starterFinished++;
            }
        }

        const cohortRow = user.dojoCohort ? cohortStats.get(user.dojoCohort) : undefined;
        if (cohortRow) {
            if (kind === 'free') cohortRow.free++;
            if (kind === 'paying' || kind === 'churned') cohortRow.paid++;
            if (active30) cohortRow.active30++;
        }

        if (kind === 'free' || kind === 'paying') {
            const group = members[kind];
            group.accounts++;
            if (onboarded) group.onboarded++;
            if (daysSinceActive < 1) group.active1++;
            if (daysSinceActive < 7) group.active7++;
            if (active30) group.active30++;
            if (started) group.starterStarted++;
            if (finished) group.starterFinished++;
            if (user.customPlans?.length) group.customPlan++;

            for (const week of new Set(starterTaskTimes(user.tutorials).map(weekStart))) {
                let row = starterWeeks.get(week);
                if (!row) {
                    row = { week, free: 0, paying: 0 };
                    starterWeeks.set(week, row);
                }
                row[kind]++;
            }
        }

        if (kind === 'free' && onboarded) {
            freePlan.freeOnboarded++;
            if (finished) freePlan.starterFinished++;
            if (user.customPlans?.length) freePlan.customPlan++;
        }
    }

    return {
        totals,
        months: [...months.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, row]) => ({ month, ...row })),
        weeks: [...weeks.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, row]) => ({ week, ...row })),
        starterWeeks: [...starterWeeks.values()].sort((a, b) => a.week.localeCompare(b.week)),
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

/** Returns the snapshot saved for a day from its stats. */
export function toSnapshot(
    { totals, members }: Pick<AccountStats, 'totals' | 'members'>,
    now: Date,
): AdminStatsSnapshot {
    return {
        date: now.toISOString().slice(0, 10),
        accounts: totals.accounts,
        free: totals.free,
        paying: totals.paying,
        paid: totals.paying + totals.churned,
        active7: totals.active7,
        active30: totals.active30,
        freeActive30: totals.freeActive30,
        payingActive30: members.paying.active30,
        starterStarted: members.free.starterStarted + members.paying.starterStarted,
        starterFinished: members.free.starterFinished + members.paying.starterFinished,
    };
}
