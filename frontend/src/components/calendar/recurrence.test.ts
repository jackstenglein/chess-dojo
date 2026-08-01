import { Event, EventStatus, EventType } from '@/database/event';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { describe, expect, it, vi } from 'vitest';
import {
    getProcessedRecurrence,
    haveTimesChanged,
    moveAllOccurrences,
    moveSingleOccurrence,
} from './recurrence';

vi.mock('./displayDate', () => ({
    toRRuleDate: (date: Date) =>
        new Date(
            Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
            ),
        ),
}));

function baseEvent(overrides: Partial<Event> = {}): Event {
    return {
        id: 'event-1',
        type: EventType.Dojo,
        owner: 'admin',
        ownerDisplayName: 'Admin',
        ownerCohort: '1500-1600',
        title: 'Weekly Class',
        startTime: '2026-08-01T15:00:00.000Z',
        endTime: '2026-08-01T16:00:00.000Z',
        status: EventStatus.Scheduled,
        location: 'Discord',
        description: 'Desc',
        cohorts: ['1500-1600'],
        participants: {},
        maxParticipants: 0,
        rrule: 'DTSTART:20260801T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4',
        ...overrides,
    };
}

describe('recurrence helpers', () => {
    it('haveTimesChanged detects start or end changes', () => {
        const start = new Date('2026-08-01T15:00:00.000Z');
        const end = new Date('2026-08-01T16:00:00.000Z');
        expect(haveTimesChanged(start, end, start, end)).toBe(false);
        expect(
            haveTimesChanged(start, end, new Date('2026-08-01T17:00:00.000Z'), end),
        ).toBe(true);
    });

    it('moveSingleOccurrence excludes the original day and adds the new time', () => {
        const event = baseEvent();
        const original = new Date(2026, 7, 8, 15, 0);
        const moved = new Date(2026, 7, 8, 17, 0);

        const rrule = moveSingleOccurrence(event, original, moved);
        const set = rrulestr(rrule, { forceset: true }) as RRuleSet;

        expect(set).toBeInstanceOf(RRuleSet);
        expect(set.exdates()).toHaveLength(1);
        expect(set.rdates()).toHaveLength(1);
        expect(set.rdates()[0].getUTCHours()).toBe(17);
        expect(set.exdates()[0].getUTCHours()).toBe(15);
    });

    it('moveAllOccurrences updates dtstart and drops exceptions', () => {
        const withException = moveSingleOccurrence(
            baseEvent(),
            new Date(2026, 7, 8, 15, 0),
            new Date(2026, 7, 8, 17, 0),
        );
        const moved = moveAllOccurrences(withException, new Date('2026-08-01T18:00:00.000Z'));
        const parsed = rrulestr(moved, { forceset: true }) as RRuleSet;

        expect(parsed.exdates()).toHaveLength(0);
        expect(parsed.rdates()).toHaveLength(0);
        expect(parsed.rrules()[0]?.options.dtstart?.toISOString()).toContain('18:00:00');
    });

    it('getProcessedRecurrence preserves EXDATE and RDATE', () => {
        const event = baseEvent({
            rrule: moveSingleOccurrence(
                baseEvent(),
                new Date(2026, 7, 8, 15, 0),
                new Date(2026, 7, 8, 17, 0),
            ),
        });

        const recurring = getProcessedRecurrence(event);
        expect(recurring).toBeInstanceOf(RRuleSet);
        expect((recurring as RRuleSet).exdates()).toHaveLength(1);
        expect((recurring as RRuleSet).rdates()).toHaveLength(1);
    });

    it('getProcessedRecurrence returns an RRule for simple rules', () => {
        const recurring = getProcessedRecurrence(baseEvent());
        expect(recurring).toBeInstanceOf(RRule);
    });
});
