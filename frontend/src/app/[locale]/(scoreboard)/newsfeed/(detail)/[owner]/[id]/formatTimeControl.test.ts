import { describe, expect, it } from 'vitest';
import { formatTimeControl } from './GameNewsfeedItem';

describe('formatTimeControl', () => {
    it('shows the base in minutes with the increment', () => {
        expect(formatTimeControl('5400+30')).toBe('90+30');
        expect(formatTimeControl('180+2')).toBe('3+2');
        expect(formatTimeControl('90+1')).toBe('1.5+1');
    });

    it('shows a base without an increment alone', () => {
        expect(formatTimeControl('600')).toBe('10');
    });

    it('leaves out anything else', () => {
        expect(formatTimeControl(undefined)).toBe('');
        expect(formatTimeControl('-')).toBe('');
        expect(formatTimeControl('40/7200:1800')).toBe('');
    });
});
