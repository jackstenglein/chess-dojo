import { describe, expect, it } from 'vitest';
import { timeClass } from './timeClass';

describe('timeClass', () => {
    it('classifies base+increment by estimated duration (base + 40x increment)', () => {
        expect(timeClass('60+1')).toBe('bullet'); // 100s
        expect(timeClass('180+2')).toBe('blitz'); // 260s
        expect(timeClass('600+5')).toBe('rapid'); // 800s
        expect(timeClass('5400+30')).toBe('classical'); // 6600s
    });

    it('classifies bare seconds with no increment', () => {
        expect(timeClass('179')).toBe('bullet');
        expect(timeClass('300')).toBe('blitz');
        expect(timeClass('900')).toBe('rapid');
        expect(timeClass('1500')).toBe('classical');
    });

    it('treats moves-per-day correspondence controls as daily', () => {
        expect(timeClass('1/86400')).toBe('daily');
        expect(timeClass('1/259200')).toBe('daily');
    });

    it('classifies OTB stage controls by the stage seconds', () => {
        expect(timeClass('40/7200')).toBe('classical');
        expect(timeClass('40/7200:3600')).toBe('classical'); // first stage only
    });

    it('returns undefined for unknown or missing controls', () => {
        expect(timeClass(undefined)).toBeUndefined();
        expect(timeClass('')).toBeUndefined();
        expect(timeClass('-')).toBeUndefined();
        expect(timeClass('?')).toBeUndefined();
        expect(timeClass('*180')).toBeUndefined();
    });
});
