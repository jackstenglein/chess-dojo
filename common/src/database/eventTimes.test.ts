import { describe, expect, it } from 'vitest';
import { getEventDurationMs, getEventEnd, getEventStart, getRRuleDtStart } from './eventTimes';

describe('eventTimes', () => {
    it('parses DTSTART from an rrule string', () => {
        const dtstart = getRRuleDtStart('DTSTART:20260801T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4');
        expect(dtstart?.toISOString()).toBe('2026-08-01T15:00:00.000Z');
    });

    it('prefers legacy startTime when set', () => {
        const start = getEventStart({
            startTime: '2026-08-01T10:00:00.000Z',
            rrule: 'DTSTART:20260801T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4',
        });
        expect(start.toISOString()).toBe('2026-08-01T10:00:00.000Z');
    });

    it('uses rrule DTSTART when startTime is omitted', () => {
        const start = getEventStart({
            rrule: 'DTSTART:20260801T150000Z\nRRULE:FREQ=WEEKLY;COUNT=4',
            durationMs: 3600000,
        });
        expect(start.toISOString()).toBe('2026-08-01T15:00:00.000Z');
    });

    it('uses durationMs when endTime is omitted', () => {
        expect(
            getEventDurationMs({
                rrule: 'DTSTART:20260801T150000Z',
                durationMs: 3600000,
            }),
        ).toBe(3600000);
        expect(
            getEventEnd({
                rrule: 'DTSTART:20260801T150000Z',
                durationMs: 3600000,
            }).toISOString(),
        ).toBe('2026-08-01T16:00:00.000Z');
    });

    it('uses legacy end - start when both are set', () => {
        expect(
            getEventDurationMs({
                startTime: '2026-08-01T15:00:00.000Z',
                endTime: '2026-08-01T17:00:00.000Z',
            }),
        ).toBe(7200000);
    });
});
