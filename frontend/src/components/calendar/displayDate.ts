import { TimeFormat } from '@/database/user';
import { datetime } from 'rrule';

const timezoneOffsets: Record<string, number> = {
    'Etc/GMT+12': 720,
    'Etc/GMT+11': 660,
    'Etc/GMT+10': 600,
    'Etc/GMT+9': 540,
    'Etc/GMT+8': 480,
    'Etc/GMT+7': 420,
    'Etc/GMT+6': 360,
    'Etc/GMT+5': 300,
    'Etc/GMT+4': 240,
    'Etc/GMT+3': 180,
    'Etc/GMT+2': 120,
    'Etc/GMT+1': 60,
    'Etc/GMT+0': 0,
    'Etc/GMT-1': -60,
    'Etc/GMT-2': -120,
    'Etc/GMT-3': -180,
    'Etc/GMT-4': -240,
    'Etc/GMT-5': -300,
    'Etc/GMT-6': -360,
    'Etc/GMT-7': -420,
    'Etc/GMT-8': -480,
    'Etc/GMT-9': -540,
    'Etc/GMT-10': -600,
    'Etc/GMT-11': -660,
    'Etc/GMT-12': -720,
    'Etc/GMT-13': -780,
    'Etc/GMT-14': -840,
};

export function getTimeZonedDate(
    date: Date,
    timezone?: string,
    direction: 'forward' | 'backward' = 'backward',
) {
    if (!timezone || !timezoneOffsets[timezone]) {
        return date;
    }

    const desiredOffset = timezoneOffsets[timezone];
    const localOffset = date.getTimezoneOffset();
    const diff = localOffset - desiredOffset;

    const result =
        direction === 'forward'
            ? new Date(date.getTime() - diff * 60000)
            : new Date(date.getTime() + diff * 60000);

    return result;
}

/**
 * The default options used when formatting dates. The month is written out
 * so that dates are unambiguous regardless of the user's locale (Ex: 05/03/2025
 * could be read as either March 5 or May 3).
 */
export const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
};

export function toDojoDateString(
    date: Date,
    timezone: string | undefined,
    timezoneDirection: 'forward' | 'backward' = 'backward',
    options: Intl.DateTimeFormatOptions = DEFAULT_DATE_FORMAT_OPTIONS,
): string {
    date = getTimeZonedDate(date, timezone, timezoneDirection);
    return date.toLocaleDateString(undefined, options);
}

export function toDojoTimeString(
    date: Date,
    timezone: string | undefined,
    timeFormat: TimeFormat | undefined,
    timezoneDirection: 'forward' | 'backward' = 'backward',
    options?: Intl.DateTimeFormatOptions,
): string {
    date = getTimeZonedDate(date, timezone, timezoneDirection);
    timeFormat = timeFormat || TimeFormat.TwelveHour;
    return date.toLocaleTimeString(undefined, {
        hour12: timeFormat === TimeFormat.TwelveHour,
        hour: 'numeric',
        minute: 'numeric',
        ...options,
    });
}

/**
 * Converts the given date to an RRule date. See https://github.com/aldabil21/react-scheduler/pull/404.
 * @param date The date to convert.
 * @returns An RRule date which can be passed to the react-scheduler library.
 */
export function toRRuleDate(date: Date) {
    return datetime(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
    );
}
