import { describe, expect, it } from 'vitest';
import { splitMinutes } from './suggestedTasks';

describe('splitMinutes', () => {
    it('splits into multiples of 5, earlier tasks taking the extra', () => {
        expect(splitMinutes(140, 3)).toEqual([50, 45, 45]);
    });

    it('splits evenly when it can', () => {
        expect(splitMinutes(60, 2)).toEqual([30, 30]);
    });

    it('always adds up to the total', () => {
        for (const [total, count] of [
            [140, 3],
            [95, 2],
            [7, 1],
            [142, 3],
            [165, 4],
        ]) {
            const parts = splitMinutes(total, count);
            expect(parts).toHaveLength(count);
            expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        }
    });

    it('gives the odd minutes to the first task when the total is not a multiple of 5', () => {
        expect(splitMinutes(142, 3)).toEqual([52, 45, 45]);
    });

    it('never goes negative', () => {
        expect(splitMinutes(-10, 2)).toEqual([0, 0]);
    });

    it('returns nothing for no tasks', () => {
        expect(splitMinutes(60, 0)).toEqual([]);
    });
});
