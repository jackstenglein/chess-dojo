import { RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import { WorkGoalSettings } from '@/database/user';
import { describe, expect, it } from 'vitest';
import { computeAdjustedMinutes, isRestDay } from './suggestedTasks';

/** Creates a rest day timeline entry for the given date. */
function restDayEntry(date: Date): TimelineEntry {
    const iso = date.toISOString();
    return {
        id: `rest-${iso}`,
        owner: 'user',
        ownerDisplayName: 'User',
        cohort: '1600-1700',
        requirementId: TimelineSpecialRequirementId.RestDay,
        requirementName: 'Rest Day',
        requirementCategory: RequirementCategory.NonDojo,
        scoreboardDisplay: ScoreboardDisplay.Hidden,
        progressBarSuffix: '',
        totalCount: 0,
        previousCount: 0,
        newCount: 0,
        dojoPoints: 0,
        totalDojoPoints: 0,
        minutesSpent: 0,
        totalMinutesSpent: 0,
        date: iso,
        createdAt: iso,
        notes: '',
        comments: null,
        reactions: null,
    };
}

/** Helper to create a local date at noon to avoid DST edge cases. */
function localDate(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day, 12, 0, 0);
}

// Week of Sun Apr 12 to Sat Apr 18, 2026
//   Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
const sun = localDate(2026, 4, 12);
const mon = localDate(2026, 4, 13);
const tue = localDate(2026, 4, 14);
const wed = localDate(2026, 4, 15);
const thu = localDate(2026, 4, 16);
const fri = localDate(2026, 4, 17);
const sat = localDate(2026, 4, 18);
const weekEnd = localDate(2026, 4, 19);

const evenGoal: WorkGoalSettings = {
    minutesPerDay: [60, 60, 60, 60, 60, 60, 60],
};

const unevenGoal: WorkGoalSettings = {
    //                Sun Mon Tue Wed Thu Fri Sat
    minutesPerDay: [0, 90, 90, 60, 60, 30, 0],
};

describe('isRestDay', () => {
    it('returns false when timeline has no rest days', () => {
        expect(isRestDay(mon, [], undefined)).toBe(false);
    });

    it('returns true when date matches a rest day entry', () => {
        const timeline = [restDayEntry(mon)];
        expect(isRestDay(mon, timeline, undefined)).toBe(true);
    });

    it('returns false when date does not match any rest day entry', () => {
        const timeline = [restDayEntry(mon)];
        expect(isRestDay(tue, timeline, undefined)).toBe(false);
    });

    it('ignores non-rest-day timeline entries', () => {
        const timeline: TimelineEntry[] = [
            { ...restDayEntry(mon), requirementId: 'GameSubmission' },
        ];
        expect(isRestDay(mon, timeline, undefined)).toBe(false);
    });
});

describe('computeAdjustedMinutes', () => {
    it('returns unchanged minutes when there are no rest days', () => {
        const result = computeAdjustedMinutes(sun, weekEnd, evenGoal, [], undefined);
        expect(result).toEqual([60, 60, 60, 60, 60, 60, 60]);
    });

    it('zeroes rest day and redistributes evenly', () => {
        // Wednesday (index 3) is a rest day, 60 min redistributed across 6 days
        const timeline = [restDayEntry(wed)];
        const result = computeAdjustedMinutes(sun, weekEnd, evenGoal, timeline, undefined);

        expect(result[3]).toBe(0);
        // 60 / 6 = 10 extra per day
        expect(result).toEqual([70, 70, 70, 0, 70, 70, 70]);
    });

    it('distributes across remaining days with multiple rest days', () => {
        // Wed (60) + Thu (60) = 120 min across 5 active days
        // 120 / 5 = 24 per day, remainder 0
        const timeline = [restDayEntry(wed), restDayEntry(thu)];
        const result = computeAdjustedMinutes(sun, weekEnd, evenGoal, timeline, undefined);

        expect(result[3]).toBe(0);
        expect(result[4]).toBe(0);
        expect(result).toEqual([84, 84, 84, 0, 0, 84, 84]);
    });

    it('handles remainder when minutes do not divide evenly', () => {
        // unevenGoal: [0, 90, 90, 60, 60, 30, 0]
        // Rest Monday (index 1): redistribute 90 across Tue(90), Wed(60), Thu(60), Fri(30)
        // 90 / 4 = 22 remainder 2
        // Tue: 90+22+1=113, Wed: 60+22+1=83, Thu: 60+22=82, Fri: 30+22=52
        const timeline = [restDayEntry(mon)];
        const result = computeAdjustedMinutes(sun, weekEnd, unevenGoal, timeline, undefined);

        expect(result[1]).toBe(0);
        expect(result).toEqual([0, 0, 113, 83, 82, 52, 0]);
    });

    it('returns all zeros when all days are rest days', () => {
        const timeline = [
            restDayEntry(sun),
            restDayEntry(mon),
            restDayEntry(tue),
            restDayEntry(wed),
            restDayEntry(thu),
            restDayEntry(fri),
            restDayEntry(sat),
        ];
        const result = computeAdjustedMinutes(sun, weekEnd, evenGoal, timeline, undefined);
        expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('does not redistribute to days with zero configured goal', () => {
        // unevenGoal: [0, 90, 90, 60, 60, 30, 0]
        // Rest Tuesday (index 2), 90 min to redistribute
        // Active days with non-zero goal: Mon(90), Wed(60), Thu(60), Fri(30)
        // 90 / 4 = 22 remainder 2
        const timeline = [restDayEntry(tue)];
        const result = computeAdjustedMinutes(sun, weekEnd, unevenGoal, timeline, undefined);

        expect(result[0]).toBe(0); // Sunday stays 0 (configured as 0)
        expect(result[2]).toBe(0); // Tuesday is rest day
        expect(result[6]).toBe(0); // Saturday stays 0 (configured as 0)
        expect(result[1]).toBe(113); // 90 + 22 + 1
        expect(result[3]).toBe(83); // 60 + 22 + 1
        expect(result[4]).toBe(82); // 60 + 22
        expect(result[5]).toBe(52); // 30 + 22
    });

    it('handles rest day that already has zero configured minutes', () => {
        // unevenGoal: [0, 90, 90, 60, 60, 30, 0]
        // Rest on Sunday (index 0) which already has 0 min — nothing to redistribute
        const timeline = [restDayEntry(sun)];
        const result = computeAdjustedMinutes(sun, weekEnd, unevenGoal, timeline, undefined);

        expect(result).toEqual([0, 90, 90, 60, 60, 30, 0]);
    });

    it('preserves total weekly minutes', () => {
        const timeline = [restDayEntry(tue), restDayEntry(thu)];
        const originalTotal = evenGoal.minutesPerDay.reduce((a, b) => a + b, 0);
        const result = computeAdjustedMinutes(sun, weekEnd, evenGoal, timeline, undefined);
        const adjustedTotal = result.reduce((a, b) => a + b, 0);

        expect(adjustedTotal).toBe(originalTotal);
    });
});
