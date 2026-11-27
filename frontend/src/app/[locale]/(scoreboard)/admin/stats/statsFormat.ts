import {
    AdminStatsMonth,
    AdminStatsSnapshot,
    AdminStatsStarterWeek,
    AdminStatsWeek,
} from '@jackstenglein/chess-dojo-common/src/adminStats/api';

/** How the page groups signups and history. */
export type Period = 'week' | 'month';

/** The signup counts of one week or month, keyed by YYYY-MM-DD (the Monday) or YYYY-MM. */
export type SignupRow = Required<Omit<AdminStatsMonth, 'month'>> & { key: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Accounts from a signup period that ever paid: paying now or canceled since. */
export function convertedCount(row: Pick<AdminStatsMonth, 'paying' | 'churned'>): number {
    return row.paying + row.churned;
}

/** Returns part / whole as a percentage, or null when whole is 0. */
export function percent(part: number, whole: number): number | null {
    return whole > 0 ? (100 * part) / whole : null;
}

/** Formats a percentage to one decimal, or a dash for null. */
export function formatPercent(value: number | null): string {
    return value === null ? '–' : `${value.toFixed(1)}%`;
}

/** Formats YYYY-MM as e.g. "Nov 2026". */
export function formatMonth(month: string): string {
    const [year, m] = month.split('-').map(Number);
    return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/** Formats a week's Monday (YYYY-MM-DD) as e.g. "Nov 23", or "Nov 23, 2026" with the year. */
export function formatWeek(week: string, withYear = false): string {
    return new Date(`${week}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: withYear ? 'numeric' : undefined,
        timeZone: 'UTC',
    });
}

/** Formats a period key (a week's Monday or a month). */
export function formatPeriod(key: string, period: Period, withYear = false): string {
    return period === 'week' ? formatWeek(key, withYear) : formatMonth(key);
}

/** Returns the Monday (UTC) starting the week of the given date, as YYYY-MM-DD. */
export function weekOf(date: Date): string {
    const day = (date.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day))
        .toISOString()
        .slice(0, 10);
}

/**
 * Returns the keys of the last count periods up to and including the current one,
 * oldest first. A count of 0 starts from first (or the current period without it).
 */
export function periodKeys(period: Period, count: number, now: Date, first?: string): string[] {
    const keys: string[] = [];
    if (period === 'week') {
        const end = Date.parse(`${weekOf(now)}T00:00:00Z`);
        let start = end - (count - 1) * 7 * DAY_MS;
        if (count <= 0) start = first ? Date.parse(`${first}T00:00:00Z`) : end;
        for (let t = start; t <= end; t += 7 * DAY_MS) {
            keys.push(new Date(t).toISOString().slice(0, 10));
        }
        return keys;
    }

    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - count + 1, 1));
    if (count <= 0) {
        const [year, m] = (first ?? end.toISOString().slice(0, 7)).split('-').map(Number);
        start = new Date(Date.UTC(year, m - 1, 1));
    }
    for (
        let d = start;
        d <= end;
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    ) {
        keys.push(d.toISOString().slice(0, 7));
    }
    return keys;
}

const emptyRow = (key: string): SignupRow => ({
    key,
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

/**
 * Returns the signup rows of the last count weeks or months up to and including the
 * current one, filling periods without signups with zeros, oldest first. A count of 0
 * returns every period from the first signup.
 */
export function signupRows(
    { months, weeks }: { months: AdminStatsMonth[]; weeks?: AdminStatsWeek[] },
    period: Period,
    count: number,
    now: Date,
): SignupRow[] {
    const rows =
        period === 'week'
            ? (weeks ?? []).map(({ week, ...row }) => ({ ...emptyRow(week), ...row }))
            : months.map(({ month, ...row }) => ({ ...emptyRow(month), ...row }));
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return periodKeys(period, count, now, rows[0]?.key).map(
        (key) => byKey.get(key) ?? emptyRow(key),
    );
}

/** Returns the starter task weeks of the last count weeks, filling empty weeks with zeros. */
export function starterRows(
    weeks: AdminStatsStarterWeek[],
    count: number,
    now: Date,
): AdminStatsStarterWeek[] {
    const byWeek = new Map(weeks.map((w) => [w.week, w]));
    return periodKeys('week', count, now, weeks[0]?.week).map(
        (week) => byWeek.get(week) ?? { week, free: 0, paying: 0 },
    );
}

/** Returns the last snapshot of each week or month, oldest first, keyed by its period. */
export function historyByPeriod(
    history: AdminStatsSnapshot[],
    period: Period,
): (AdminStatsSnapshot & { key: string })[] {
    const byKey = new Map<string, AdminStatsSnapshot>();
    for (const snapshot of history) {
        const key =
            period === 'week'
                ? weekOf(new Date(`${snapshot.date}T00:00:00Z`))
                : snapshot.date.slice(0, 7);
        byKey.set(key, snapshot); // history is oldest first, so the last one wins
    }
    return [...byKey.entries()].map(([key, snapshot]) => ({ ...snapshot, key }));
}

/**
 * Returns the snapshot from a week before now: the latest one saved at least 7 days
 * ago, as long as it is no older than 10 days. Undefined until there is one.
 */
export function snapshotWeekAgo(
    history: AdminStatsSnapshot[],
    now: Date,
): AdminStatsSnapshot | undefined {
    const today = Date.parse(now.toISOString().slice(0, 10) + 'T00:00:00Z');
    let result: AdminStatsSnapshot | undefined;
    for (const snapshot of history) {
        const daysAgo = (today - Date.parse(`${snapshot.date}T00:00:00Z`)) / DAY_MS;
        if (daysAgo >= 7 && daysAgo <= 10) result = snapshot;
    }
    return result;
}

/** Formats a change as e.g. "+12 vs last week", or undefined without one. */
export function formatChange(now: number, before: number | undefined): string | undefined {
    if (before === undefined) return undefined;
    const change = now - before;
    return `${change > 0 ? '+' : ''}${change.toLocaleString('en-US')} vs last week`;
}
