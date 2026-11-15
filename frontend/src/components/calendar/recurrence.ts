import { Event, getEventDurationMs, getEventStart } from '@/database/event';
import {
    getRRuleDtStart,
    getRRuleTimeZone,
} from '@jackstenglein/chess-dojo-common/src/database/eventTimes';
import { EventRecurrence } from '@jackstenglein/react-scheduler/types';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { toRRuleDate } from './displayDate';
import { floatingInZone, instantToFloating, occurrenceToInstant } from './eventTimeZone';

export type RecurrenceEditScope = 'this' | 'all';

/**
 * True when the event's rrule includes an RRULE option.
 */
export function isRecurringEvent(event: Event): boolean {
    return Boolean(event.rrule?.includes('RRULE:'));
}

/**
 * Parses a stored event rrule, including EXDATE and RDATE lines.
 * `RRule.fromString` and `RRule.parseString` reject those lines.
 */
export function parseStoredRRule(rrule: string): RRuleSet {
    const parsed = rrulestr(rrule, { forceset: true });
    if (parsed instanceof RRuleSet) {
        return parsed;
    }

    const set = new RRuleSet();
    set.rrule(parsed);
    return set;
}

/**
 * Builds the ProcessedEvent.recurring value for a stored event, preserving
 * EXDATE/RDATE entries when the rrule string is an RRuleSet.
 * Returns undefined for non-repeating events (DTSTART-only).
 */
export function getProcessedRecurrence(event: Event): EventRecurrence | undefined {
    if (!isRecurringEvent(event) || !event.rrule) {
        return undefined;
    }

    // TZID rules already repeat a wall-clock time across daylight saving.
    // Rewriting DTSTART from one absolute instant would pin every occurrence
    // to the offset of that single date.
    if (getRRuleTimeZone(event.rrule)) {
        return parseStoredRRule(event.rrule);
    }

    // Prefer legacy startTime when set; otherwise use rrule DTSTART.
    const seriesStart = getEventStart(event);
    const dtstart = toRRuleDate(seriesStart);
    const parsed = rrulestr(event.rrule, { forceset: true });

    if (!(parsed instanceof RRuleSet)) {
        return new RRule({ ...parsed.origOptions, dtstart });
    }

    const set = new RRuleSet();
    for (const rule of parsed.rrules()) {
        set.rrule(new RRule({ ...rule.origOptions, dtstart }));
    }
    for (const date of parsed.exdates()) {
        set.exdate(date);
    }
    for (const date of parsed.rdates()) {
        set.rdate(date);
    }
    return set;
}

/**
 * Returns an RRuleSet for the event's recurrence, creating one if needed.
 */
function toRRuleSet(rrule: string, seriesStart: Date): RRuleSet {
    const parsed = rrulestr(rrule, { forceset: true });
    if (parsed instanceof RRuleSet) {
        return parsed;
    }

    const set = new RRuleSet();
    set.rrule(
        new RRule({
            ...parsed.origOptions,
            dtstart: parsed.origOptions.dtstart ?? toRRuleDate(seriesStart),
        }),
    );
    return set;
}

/**
 * Updates a recurring event's rrule so only one occurrence moves to a new start time.
 * Uses EXDATE for the original occurrence and RDATE for the new time.
 */
export function moveSingleOccurrence(
    event: Event,
    originalOccurrenceStart: Date,
    newStart: Date,
): string {
    if (!event.rrule) {
        throw new Error('moveSingleOccurrence requires an event with an rrule');
    }

    const set = toRRuleSet(event.rrule, getEventStart(event));
    const timeZone = getRRuleTimeZone(event.rrule);
    if (timeZone) {
        set.exdate(floatingInZone(originalOccurrenceStart, timeZone));
        set.rdate(floatingInZone(newStart, timeZone));
    } else {
        set.exdate(toRRuleDate(originalOccurrenceStart));
        set.rdate(toRRuleDate(newStart));
    }
    return set.toString();
}

/**
 * Rebuilds the recurrence rule for an all-occurrences time change.
 * Drops any prior EXDATE/RDATE exceptions. Always includes DTSTART.
 */
export function moveAllOccurrences(rrule: string, newStart: Date): string {
    const timeZone = getRRuleTimeZone(rrule);
    const dtstart = timeZone ? floatingInZone(newStart, timeZone) : newStart;
    if (!rrule.trim()) {
        return RRule.optionsToString({ dtstart });
    }

    const parsed = rrulestr(rrule, { forceset: true });
    const baseRule = parsed instanceof RRuleSet ? parsed.rrules()[0] : parsed;
    if (!baseRule) {
        return RRule.optionsToString({ dtstart, tzid: timeZone });
    }

    return RRule.optionsToString({
        ...baseRule.origOptions,
        dtstart,
        tzid: timeZone ?? baseRule.origOptions.tzid,
    });
}

/**
 * Occurrences of a stored rule between two absolute instants.
 * TZID rules are queried in rrule's floating form and returned as real instants,
 * so each occurrence keeps the series wall time across daylight saving.
 */
export function expandStoredBetween(
    rrule: string,
    start: Date,
    end: Date,
    inc: boolean,
    iterator?: (date: Date, i: number) => boolean,
): Date[] {
    const rule = parseStoredRRule(rrule);
    const zoned = Boolean(getRRuleTimeZone(rrule));
    const dates = rule.between(
        zoned ? instantToFloating(start) : start,
        zoned ? instantToFloating(end) : end,
        inc,
        iterator,
    );
    return zoned ? dates.map(occurrenceToInstant) : dates;
}

/**
 * True when the editor/drag times differ from the occurrence that was opened.
 */
export function haveTimesChanged(
    originalStart: Date,
    originalEnd: Date,
    newStart: Date,
    newEnd: Date,
): boolean {
    return (
        originalStart.getTime() !== newStart.getTime() || originalEnd.getTime() !== newEnd.getTime()
    );
}

/**
 * Returns series start/end Dates for calendar display.
 */
export function getSeriesTimes(event: Event): { start: Date; end: Date } {
    const start = getEventStart(event);
    const end = new Date(start.getTime() + getEventDurationMs(event));
    return { start, end };
}

export { getRRuleDtStart };
