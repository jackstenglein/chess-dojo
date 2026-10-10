import { describe, expect, it } from 'vitest';
import { scrollDelta } from './catalogScroll';

describe('scrollDelta', () => {
    const list = { rowHeight: 40, listHeight: 600 };

    it('leaves a visible row where it is', () => {
        expect(scrollDelta({ ...list, offset: 0 })).toBe(0);
        expect(scrollDelta({ ...list, offset: 280 })).toBe(0);
        expect(scrollDelta({ ...list, offset: 560 })).toBe(0);
    });

    it('brings a row just outside to the nearest edge', () => {
        expect(scrollDelta({ ...list, offset: 600 })).toBe(40);
        expect(scrollDelta({ ...list, offset: 580 })).toBe(20);
        expect(scrollDelta({ ...list, offset: -40 })).toBe(-40);
        expect(scrollDelta({ ...list, offset: -1 })).toBe(-1);
    });

    it('centres a row further away than one viewport', () => {
        expect(scrollDelta({ ...list, offset: 2000 })).toBe(1720);
        expect(scrollDelta({ ...list, offset: -1200 })).toBe(-1480);
    });

    it('shows the top of a row taller than the viewport', () => {
        expect(scrollDelta({ offset: 0, rowHeight: 800, listHeight: 600 })).toBe(0);
        expect(scrollDelta({ offset: -200, rowHeight: 800, listHeight: 600 })).toBe(-200);
        expect(scrollDelta({ offset: 50, rowHeight: 800, listHeight: 600 })).toBe(50);
    });
});
