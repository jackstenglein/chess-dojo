import { getRRuleTimeZone } from '@jackstenglein/chess-dojo-common/src/database/eventTimes';
import { DateTime } from 'luxon';
import { datetime, Options, RRule } from 'rrule';

/**
 * Zone the event editor is entering times in.
 * A profile override such as `Etc/GMT-1` is a fixed offset. Browser default
 * uses the IANA zone, which observes daylight saving.
 */
export function schedulingTimeZone(timezoneOverride?: string): string {
    if (timezoneOverride && timezoneOverride !== 'DEFAULT') {
        return timezoneOverride;
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Zone that owns an event's wall-clock time. Existing zoned rules keep their
 * TZID so opening the editor in another region does not re-anchor the series.
 */
export function eventZoneForSave(
    timezoneOverride: string | undefined,
    existingRrule?: string,
): string {
    return (
        (existingRrule && getRRuleTimeZone(existingRrule)) || schedulingTimeZone(timezoneOverride)
    );
}

export function floatingWallDate(wall: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second?: number;
}): Date {
    return datetime(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second ?? 0);
}

/**
 * Wall-clock parts of an absolute instant in `timeZone`.
 */
export function instantWallTime(
    instant: Date,
    timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(instant);
    const map: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    }

    let hour = Number(map.hour);
    if (hour === 24) {
        hour = 0;
    }

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour,
        minute: Number(map.minute),
        second: Number(map.second),
    };
}

/**
 * rrule floating date (UTC components hold the wall time) for `instant` in `timeZone`.
 * EXDATE/RDATE and DTSTART on a zoned rule must be stored this way.
 */
export function floatingInZone(instant: Date, timeZone: string): Date {
    return floatingWallDate(instantWallTime(instant, timeZone));
}

/**
 * rrule with a TZID returns floating dates whose UTC components are the viewer's
 * wall time. This turns one of those results into the real instant.
 */
export function occurrenceToInstant(floating: Date): Date {
    return new Date(
        floating.getUTCFullYear(),
        floating.getUTCMonth(),
        floating.getUTCDate(),
        floating.getUTCHours(),
        floating.getUTCMinutes(),
        floating.getUTCSeconds(),
    );
}

/**
 * Floating date for an absolute instant, using this machine's local wall time.
 * Bounds passed to a TZID rule must be in that floating form.
 */
export function instantToFloating(instant: Date): Date {
    return floatingWallDate({
        year: instant.getFullYear(),
        month: instant.getMonth() + 1,
        day: instant.getDate(),
        hour: instant.getHours(),
        minute: instant.getMinutes(),
        second: instant.getSeconds(),
    });
}

function zonedWall(dt: DateTime, zone: string): DateTime {
    return DateTime.fromObject(
        {
            year: dt.year,
            month: dt.month,
            day: dt.day,
            hour: dt.hour,
            minute: dt.minute,
            second: Math.floor(dt.second),
            millisecond: dt.millisecond,
        },
        { zone },
    );
}

/**
 * Elapsed time between two picker values, interpreted in `zone`.
 */
export function zonedDurationMs(start: DateTime, end: DateTime, zone: string): number {
    const startZ = zonedWall(start, zone);
    const endZ = zonedWall(end, zone);
    if (!startZ.isValid || !endZ.isValid) {
        return end.toMillis() - start.toMillis();
    }
    return endZ.toMillis() - startZ.toMillis();
}

/**
 * Builds an rrule whose DTSTART is a wall-clock time in `eventZone`.
 * Picker values are read in `editorZone` (the zone named on the form).
 */
export function buildZonedRRule(args: {
    start: DateTime;
    until?: DateTime | null;
    editorZone: string;
    eventZone: string;
    options?: Partial<Options>;
}): string {
    const startWall = zonedWall(args.start, args.editorZone).setZone(args.eventZone);
    const ruleOptions: Partial<Options> = {
        ...args.options,
        dtstart: floatingWallDate(startWall),
        tzid: args.eventZone,
    };
    if (args.until) {
        ruleOptions.until = floatingWallDate(
            zonedWall(args.until, args.editorZone).setZone(args.eventZone),
        );
    }
    return RRule.optionsToString(ruleOptions);
}
