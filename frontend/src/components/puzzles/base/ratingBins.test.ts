import { describe, expect, it } from 'vitest';
import { countRatingBins, parseRating, ratingBinIndex, ratingBinLabel } from './ratingBins';

describe('ratingBins', () => {
    it('puts ratings in the right band', () => {
        expect(ratingBinIndex(0)).toBe(0);
        expect(ratingBinIndex(399)).toBe(0);
        expect(ratingBinIndex(400)).toBe(1);
        expect(ratingBinIndex(1199)).toBe(2);
        expect(ratingBinIndex(1200)).toBe(3);
        expect(ratingBinIndex(1399)).toBe(3);
        expect(ratingBinIndex(1400)).toBe(4);
        expect(ratingBinIndex(3500)).toBe(11);
    });

    it('labels bands', () => {
        expect(ratingBinLabel(0)).toBe('0–400');
        expect(ratingBinLabel(3)).toBe('1200–1400');
        expect(ratingBinLabel(11)).toBe('2800+');
    });

    it('counts ratings per band', () => {
        const counts = countRatingBins([300, 350, 600, 1700, 1700]);
        expect(counts[0]).toBe(2);
        expect(counts[1]).toBe(1);
        expect(counts[5]).toBe(2);
        expect(counts.reduce((a, b) => a + b, 0)).toBe(5);
    });
});

describe('parseRating', () => {
    it('accepts whole numbers in range', () => {
        expect(parseRating('0')).toBe(0);
        expect(parseRating(' 1500 ')).toBe(1500);
        expect(parseRating('3500')).toBe(3500);
    });

    it('rejects everything else', () => {
        expect(parseRating('')).toBeUndefined();
        expect(parseRating('abc')).toBeUndefined();
        expect(parseRating('15.5')).toBeUndefined();
        expect(parseRating('-100')).toBeUndefined();
        expect(parseRating('3501')).toBeUndefined();
    });
});
