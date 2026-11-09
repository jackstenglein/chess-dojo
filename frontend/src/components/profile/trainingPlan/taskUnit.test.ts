import { describe, expect, it } from 'vitest';
import { getTaskUnit } from './taskUnit';

describe('getTaskUnit', () => {
    it('uses the task’s own unit when it has one', () => {
        expect(getTaskUnit({ progressBarSuffix: 'Exercises', name: 'Solve Polgar M2s' })).toBe(
            'Exercises',
        );
    });

    it.each([
        ['Study Master Games', 'Games'],
        ['Annotate {{count}} Classical Games per Year', 'Games'],
        ['Read the first 3 chapters', 'Chapters'],
        ['Solve 30 puzzles', 'Puzzles'],
    ])('finds the unit in "%s"', (name, unit) => {
        expect(getTaskUnit({ progressBarSuffix: '', name })).toBe(unit);
    });

    it('is empty when nothing names a unit', () => {
        expect(
            getTaskUnit({ progressBarSuffix: '', name: 'Read How to Find a Training Partner' }),
        ).toBe('');
    });
});
