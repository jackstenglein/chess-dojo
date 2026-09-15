import { Event, getEventDurationMs, getEventStart } from '@/database/event';
import { getRRuleDtStart } from '@jackstenglein/chess-dojo-common/src/database/eventTimes';
import { EventRecurrence } from '@jackstenglein/react-scheduler/types';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { toRRuleDate } from './displayDate';

export type RecurrenceEditScope = 'this' | 'all';

/**
 * True when the event's rrule includes an RRULE option.
 */
export function isRecurringEvent(event: Event): boolean {
    return Boolean(event.rrule?.includes('RRULE:'));
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
    set.exdate(toRRuleDate(originalOccurrenceStart));
    set.rdate(toRRuleDate(newStart));
    return set.toString();
}

/**
 * Rebuilds the recurrence rule for an all-occurrences time change.
 * Drops any prior EXDATE/RDATE exceptions. Always includes DTSTART.
 */
export function moveAllOccurrences(rrule: string, newStart: Date): string {
    if (!rrule.trim()) {
        return RRule.optionsToString({ dtstart: newStart });
    }

    const parsed = rrulestr(rrule, { forceset: true });
    const baseRule = parsed instanceof RRuleSet ? parsed.rrules()[0] : parsed;
    if (!baseRule) {
        return RRule.optionsToString({ dtstart: newStart });
    }

    return RRule.optionsToString({
        ...baseRule.origOptions,
        dtstart: newStart,
    });
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
