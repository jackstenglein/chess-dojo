import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getChartData } from './RatingCard';

interface ChartData {
    label: string;
    data: {
        date: Date;
        rating: number;
    }[];
}

function stringifyDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function simplify(chartData: ChartData[]) {
    if (!chartData || chartData.length === 0) {
        return [];
    }

    return chartData[0].data.map((datum) => {
        return {
            date: stringifyDate(datum.date),
            rating: datum.rating,
        };
    });
}

function subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

describe('RatingCard.tsx', () => {
    describe('getChartData', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('assigns the correct label to the chart data', () => {
            const today = new Date();

            const history = [{ date: stringifyDate(today), rating: 1500 }];

            expect(getChartData(history, 1500)[0].label).toBe('Rating');
        });

        it('provides correct data for a normal sample case', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 20)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 13)), rating: 1200 },
                { date: stringifyDate(subtractDays(today, 6)), rating: 1300 },
            ];

            const result = simplify(getChartData(history, 1400));

            expect(result[0].date).toBe(stringifyDate(subtractDays(today, 20)));
            expect(result[0].rating).toBe(1100);
            expect(result[1].date).toBe(stringifyDate(subtractDays(today, 13)));
            expect(result[1].rating).toBe(1200);
            expect(result[2].date).toBe(stringifyDate(subtractDays(today, 6)));
            expect(result[2].rating).toBe(1300);
            expect(result[3].date).toBe(stringifyDate(today));
            expect(result[3].rating).toBe(1400);
            expect(result.length).toBe(4);
        });

        it('returns an empty array when history is undefined', () => {
            expect(getChartData(undefined, 1500)).toEqual([]);
        });

        it('returns an empty array when history is empty', () => {
            expect(getChartData([], 1500)).toEqual([]);
        });

        it('returns an empty array when all ratings are zero', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 7)), rating: 0 },
                { date: stringifyDate(today), rating: 0 },
            ];

            const result = getChartData(history, 1500);

            expect(result).toEqual([]);
        });

        it('strips out zero ratings', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 22)), rating: 0 },
                { date: stringifyDate(subtractDays(today, 15)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 8)), rating: 0 },
                { date: stringifyDate(subtractDays(today, 1)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result.every((datum) => datum.rating > 0)).toBe(true);
        });

        it('starts chart at first date with a nonzero rating', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 22)), rating: 0 },
                { date: stringifyDate(subtractDays(today, 15)), rating: 0 },
                { date: stringifyDate(subtractDays(today, 8)), rating: 1300 },
                { date: stringifyDate(subtractDays(today, 1)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1400));

            expect(result[0].date).toBe(stringifyDate(subtractDays(today, 8)));
        });

        it('adds current rating if no ratings in past seven days', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 15)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 8)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result[result.length - 1].rating).toBe(1300);
        });

        it('adds current rating if there was a rating in the past seven days but not today', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 15)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 8)), rating: 1200 },
                { date: stringifyDate(subtractDays(today, 1)), rating: 1300 },
            ];

            const result = simplify(getChartData(history, 1400));

            expect(result[result.length - 1].rating).toBe(1400);
        });

        it('does not add current rating if there was a rating today', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 14)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 7)), rating: 1200 },
                { date: stringifyDate(today), rating: 1300 },
            ];

            const result = simplify(getChartData(history, 1400));

            expect(result[result.length - 1].rating).toBe(1300);
        });

        it('fills in missing weeks', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 21)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 7)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result[1].date).toBe(stringifyDate(subtractDays(today, 14)));
        });

        it('fills in missing weeks with last known rating', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 21)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 7)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result[1].rating).toBe(1100);
        });

        it('fills in zero-rated weeks with last known rating', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 21)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 14)), rating: 0 },
                { date: stringifyDate(subtractDays(today, 7)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result[1].date).toBe(stringifyDate(subtractDays(today, 14)));
            expect(result[1].rating).toBe(1100);
        });

        it('has correct data for the week before a missing week', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 21)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 7)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result[2].date).toBe(stringifyDate(subtractDays(today, 7)));
            expect(result[2].rating).toBe(1200);
        });

        it('has correct data for the week after a missing week', () => {
            const today = new Date();

            const history = [
                { date: stringifyDate(subtractDays(today, 21)), rating: 1100 },
                { date: stringifyDate(subtractDays(today, 7)), rating: 1200 },
            ];

            const result = simplify(getChartData(history, 1300));

            expect(result[0].date).toBe(stringifyDate(subtractDays(today, 21)));
            expect(result[0].rating).toBe(1100);
        });

        it('uses current rating instead last known rating for today when last known rating was an integer multiple of seven days ago', () => {
            const today = new Date();

            const history = [{ date: stringifyDate(subtractDays(today, 7)), rating: 1200 }];

            const result = simplify(getChartData(history, 1300));

            expect(result[1].date).toBe(stringifyDate(today));
            expect(result[1].rating).toBe(1300);

            const history2 = [{ date: stringifyDate(subtractDays(today, 14)), rating: 1200 }];

            const result2 = simplify(getChartData(history2, 1300));

            expect(result2[2].date).toBe(stringifyDate(today));
            expect(result2[2].rating).toBe(1300);
        });
    });
});
