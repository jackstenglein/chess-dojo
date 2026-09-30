import { describe, expect, it } from 'vitest';
import { singularUnit } from './CompactNewsfeedItem';

describe('singularUnit', () => {
    it.each([
        ['games', 'game'],
        ['exercises', 'exercise'],
        ['chapters', 'chapter'],
        ['studies', 'study'],
        ['matches', 'match'],
        ['classes', 'class'],
        ['boxes', 'box'],
        ['', ''],
        ['class', 'class'],
    ])('%s becomes %s', (plural, singular) => {
        expect(singularUnit(plural)).toBe(singular);
    });
});
