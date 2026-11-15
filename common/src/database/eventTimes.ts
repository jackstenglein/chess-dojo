/* eslint-disable @typescript-eslint/no-deprecated */

const DTSTART_PATTERN = /DTSTART(?:;TZID=([^:\r\n]+))?:([0-9]{8}T[0-9]{6})(Z?)/;

interface WallTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

/**
 * IANA timezone from `DTSTART;TZID=...`, if the rule is not a fixed UTC instant.
 */
export function getRRuleTimeZone(rrule: string): string | undefined {
    const match = DTSTART_PATTERN.exec(rrule);
    const tzid = match?.[1];
    if (!tzid || tzid.toUpperCase() === 'UTC' || match?.[3] === 'Z') {
        return undefined;
    }
    return tzid;
}

/**
 * Offset of `timeZone` at `instant`, in milliseconds (positive east of UTC).
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
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
    const day = Number(map.day);
    if (hour === 24) {
        hour = 0;
    }

    const asUtc = Date.UTC(
        Number(map.year),
        Number(map.month) - 1,
        day,
        hour,
        Number(map.minute),
        Number(map.second),
    );
    return asUtc - instant.getTime();
}

/**
 * Converts a wall-clock time in `timeZone` to an absolute instant.
 * A second pass covers the offset change around a daylight-saving transition.
 */
function zonedWallTimeToUtc(wall: WallTime, timeZone: string): Date {
    const utcGuess = Date.UTC(
        wall.year,
        wall.month - 1,
        wall.day,
        wall.hour,
        wall.minute,
        wall.second,
    );
    const offsetMs = timeZoneOffsetMs(new Date(utcGuess), timeZone);
    const corrected = new Date(utcGuess - offsetMs);
    const offsetAtCorrected = timeZoneOffsetMs(corrected, timeZone);
    if (offsetAtCorrected === offsetMs) {
        return corrected;
    }
    return new Date(utcGuess - offsetAtCorrected);
}

/**
 * Parses the DTSTART value from an RRULE string.
 * `DTSTART;TZID=Zone:YYYYMMDDTHHMMSS` is a wall-clock time in that zone, so the
 * absolute instant shifts when the zone enters or leaves daylight saving.
 * `DTSTART:YYYYMMDDTHHMMSSZ` stays a fixed UTC instant (legacy rules).
 */
export function getRRuleDtStart(rrule: string): Date | undefined {
    const match = DTSTART_PATTERN.exec(rrule);
    const raw = match?.[2];
    if (!raw) {
        return undefined;
    }

    const wall: WallTime = {
        year: Number(raw.slice(0, 4)),
        month: Number(raw.slice(4, 6)),
        day: Number(raw.slice(6, 8)),
        hour: Number(raw.slice(9, 11)),
        minute: Number(raw.slice(11, 13)),
        second: Number(raw.slice(13, 15)),
    };

    const timeZone = getRRuleTimeZone(rrule);
    if (!timeZone) {
        return new Date(
            Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second),
        );
    }

    return zonedWallTimeToUtc(wall, timeZone);
}

export interface EventTimes {
    /** @deprecated Prefer rrule DTSTART. Still read when present for legacy events. */
    startTime?: string;
    /** @deprecated Prefer durationMs. Still read when present for legacy events. */
    endTime?: string;
    /** Duration of each occurrence in milliseconds. Required for new events without endTime. */
    durationMs?: number;
    /** Recurrence rule string, including DTSTART for new events. */
    rrule?: string;
}

/**
 * Returns the series start for an event.
 * Prefers legacy startTime when set; otherwise uses the rrule DTSTART.
 */
export function getEventStart(event: EventTimes): Date {
    if (event.startTime) {
        return new Date(event.startTime);
    }

    if (event.rrule) {
        const dtstart = getRRuleDtStart(event.rrule);
        if (dtstart) {
            return dtstart;
        }
    }

    throw new Error('Event has no startTime or rrule DTSTART');
}

/**
 * Returns the duration of each occurrence in milliseconds.
 * Prefers legacy endTime - startTime when both are set; otherwise durationMs.
 */
export function getEventDurationMs(event: EventTimes): number {
    if (event.startTime && event.endTime) {
        return new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    }

    if (event.durationMs != null && event.durationMs > 0) {
        return event.durationMs;
    }

    throw new Error('Event has no duration (missing endTime or durationMs)');
}

/**
 * Returns the series end for an event (start + duration).
 * Prefers legacy endTime when set.
 */
export function getEventEnd(event: EventTimes): Date {
    if (event.endTime) {
        return new Date(event.endTime);
    }

    return new Date(getEventStart(event).getTime() + getEventDurationMs(event));
}

/**
 * True when the event has enough timing information to determine start and end.
 */
export function hasEventTimes(event: EventTimes): boolean {
    try {
        getEventStart(event);
        getEventDurationMs(event);
        return true;
    } catch {
        return false;
    }
}
