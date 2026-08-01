import { Event } from '@/database/event';
import { EventRecurrence } from '@jackstenglein/react-scheduler/types';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { toRRuleDate } from './displayDate';

export type RecurrenceEditScope = 'this' | 'all';

/**
 * Builds the ProcessedEvent.recurring value for a stored event, preserving
 * EXDATE/RDATE entries when the rrule string is an RRuleSet.
 */
export function getProcessedRecurrence(event: Event): EventRecurrence | undefined {
    if (!event.rrule) {
        return undefined;
    }

    const dtstart = toRRuleDate(new Date(event.startTime));
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

    const set = toRRuleSet(event.rrule, new Date(event.startTime));
    set.exdate(toRRuleDate(originalOccurrenceStart));
    set.rdate(toRRuleDate(newStart));
    return set.toString();
}

/**
 * Rebuilds the recurrence rule for an all-occurrences time change.
 * Drops any prior EXDATE/RDATE exceptions.
 */
export function moveAllOccurrences(rrule: string, newStart: Date): string {
    const parsed = rrulestr(rrule, { forceset: true });
    const baseRule = parsed instanceof RRuleSet ? parsed.rrules()[0] : parsed;
    if (!baseRule) {
        return '';
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
        originalStart.getTime() !== newStart.getTime() ||
        originalEnd.getTime() !== newEnd.getTime()
    );
}
