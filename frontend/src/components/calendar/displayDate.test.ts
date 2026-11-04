import { describe, expect, it } from 'vitest';
import { toDojoDateString } from './displayDate';

describe('toDojoDateString', () => {
    // May 3, 2025 is ambiguous when written numerically (05/03/2025 vs 03/05/2025)
    const date = new Date(2025, 4, 3);

    it('writes out the month name by default', () => {
        const result = toDojoDateString(date, undefined);
        expect(result).toMatch(/may/i);
        expect(result).not.toMatch(/\d+\/\d+\/\d+/);
    });

    it('includes the day and year by default', () => {
        const result = toDojoDateString(date, undefined);
        expect(result).toMatch(/\b3\b/);
        expect(result).toMatch(/2025/);
    });

    it('uses the caller provided options instead of the defaults', () => {
        const result = toDojoDateString(date, undefined, 'backward', {
            month: 'long',
            day: 'numeric',
        });
        expect(result).toMatch(/may/i);
        expect(result).not.toMatch(/2025/);
    });
});
