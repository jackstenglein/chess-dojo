import { describe, expect, it } from 'vitest';
import { getRandomSquare, getSquareColor } from './squareColor';

describe('getSquareColor', () => {
    it('returns black for a1', () => {
        expect(getSquareColor('a1')).toBe('black');
    });

    it('returns white for a8', () => {
        expect(getSquareColor('a8')).toBe('white');
    });

    it('returns white for h1', () => {
        expect(getSquareColor('h1')).toBe('white');
    });

    it('returns black for h8', () => {
        expect(getSquareColor('h8')).toBe('black');
    });

    it('returns correct colors for middle squares', () => {
        expect(getSquareColor('d4')).toBe('black');
        expect(getSquareColor('e4')).toBe('white');
        expect(getSquareColor('d5')).toBe('white');
        expect(getSquareColor('e5')).toBe('black');
    });
});

describe('getRandomSquare', () => {
    it('returns a valid square in format [a-h][1-8]', () => {
        for (let i = 0; i < 50; i++) {
            const square = getRandomSquare();
            expect(square).toMatch(/^[a-h][1-8]$/);
        }
    });

    it('never returns the excluded square', () => {
        const excluded = 'e4';
        for (let i = 0; i < 100; i++) {
            expect(getRandomSquare(excluded)).not.toBe(excluded);
        }
    });
});
