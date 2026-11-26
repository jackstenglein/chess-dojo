import { AdminStatsMonth } from '@jackstenglein/chess-dojo-common/src/adminStats/api';

/** Accounts from a signup month that ever paid: paying now or canceled since. */
export function convertedCount(month: AdminStatsMonth): number {
    return month.paying + month.churned;
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

/**
 * Returns the last count months up to and including the current one, filling
 * months without signups with zeros, oldest first. A count of 0 returns every
 * month from the first signup.
 */
export function lastMonths(months: AdminStatsMonth[], count: number, now: Date): AdminStatsMonth[] {
    const byMonth = new Map(months.map((m) => [m.month, m]));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let start: Date;
    if (count > 0) {
        start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - count + 1, 1));
    } else if (months.length > 0) {
        const [year, m] = months[0].month.split('-').map(Number);
        start = new Date(Date.UTC(year, m - 1, 1));
    } else {
        start = end;
    }

    const result: AdminStatsMonth[] = [];
    for (
        let d = start;
        d <= end;
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    ) {
        const month = d.toISOString().slice(0, 7);
        result.push(
            byMonth.get(month) ?? {
                month,
                signups: 0,
                free: 0,
                paying: 0,
                churned: 0,
                complimentary: 0,
                onboarded: 0,
                active30: 0,
            },
        );
    }
    return result;
}
