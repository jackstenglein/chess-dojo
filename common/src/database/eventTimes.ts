/* eslint-disable @typescript-eslint/no-deprecated */

/**
 * Parses the DTSTART value from an RRULE string.
 * Supports `DTSTART:YYYYMMDDTHHMMSSZ` and `DTSTART;...:YYYYMMDDTHHMMSS`.
 */
export function getRRuleDtStart(rrule: string): Date | undefined {
    const match = /DTSTART(?:;[^\n:]*)?:([0-9]{8}T[0-9]{6}Z?)/.exec(rrule);
    if (!match?.[1]) {
        return undefined;
    }

    const raw = match[1];
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6)) - 1;
    const day = Number(raw.slice(6, 8));
    const hour = Number(raw.slice(9, 11));
    const minute = Number(raw.slice(11, 13));
    const second = Number(raw.slice(13, 15));

    // rrule.js serializes dtstart in UTC form; treat Z and floating the same way.
    return new Date(Date.UTC(year, month, day, hour, minute, second));
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
