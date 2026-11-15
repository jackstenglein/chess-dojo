import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import { describe, expect, it } from 'vitest';
import { buildZonedRRule } from './eventTimeZone';

describe('buildZonedRRule', () => {
    it('stores the picker time as a wall time in the event zone', () => {
        const rrule = buildZonedRRule({
            start: DateTime.fromObject({ year: 2026, month: 3, day: 23, hour: 18, minute: 0 }),
            editorZone: 'Europe/Berlin',
            eventZone: 'Europe/Berlin',
            options: { freq: RRule.WEEKLY },
        });

        expect(rrule).toContain('DTSTART;TZID=Europe/Berlin:20260323T180000');
        expect(rrule).toContain('RRULE:FREQ=WEEKLY');
    });

    it('keeps an existing zone when the editor is in another region', () => {
        const rrule = buildZonedRRule({
            start: DateTime.fromObject({ year: 2026, month: 3, day: 23, hour: 12, minute: 0 }),
            editorZone: 'America/Chicago',
            eventZone: 'Europe/Berlin',
            options: { freq: RRule.WEEKLY },
        });

        // 12:00 CDT on 23 Mar 2026 is 18:00 CET.
        expect(rrule).toContain('DTSTART;TZID=Europe/Berlin:20260323T180000');
    });
});
