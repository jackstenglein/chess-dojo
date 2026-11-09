import { describe, expect, it } from 'vitest';
import { getNextLectureDate } from './LiveClassesTab';

describe('getNextLectureDate', () => {
    const duringClassWeek = new Date('2026-11-09T17:52:00.000Z');

    it('returns the weekly occurrence on the UTC day of now', () => {
        const next = getNextLectureDate(
            'DTSTART:20261102T130000Z\nRRULE:FREQ=WEEKLY',
            duringClassWeek,
        );
        expect(next?.toISOString()).toBe('2026-11-09T13:00:00.000Z');
    });

    it('accepts an RDATE list that crashes RRule.fromString', () => {
        const next = getNextLectureDate(
            'RDATE:20261109T130000Z,20261116T130000Z,20261123T130000Z',
            duringClassWeek,
        );
        expect(next?.toISOString()).toBe('2026-11-09T13:00:00.000Z');
    });

    it('uses a moved RDATE instead of an excluded occurrence', () => {
        const next = getNextLectureDate(
            [
                'DTSTART:20261102T130000Z',
                'RRULE:FREQ=WEEKLY',
                'EXDATE:20261109T130000Z',
                'RDATE:20261109T150000Z',
            ].join('\n'),
            duringClassWeek,
        );
        expect(next?.toISOString()).toBe('2026-11-09T15:00:00.000Z');
    });

    it('advances to the following RDATE after that UTC day', () => {
        const next = getNextLectureDate(
            'RDATE:20261109T130000Z,20261116T130000Z,20261123T130000Z',
            new Date('2026-11-10T12:00:00.000Z'),
        );
        expect(next?.toISOString()).toBe('2026-11-16T13:00:00.000Z');
    });
});
