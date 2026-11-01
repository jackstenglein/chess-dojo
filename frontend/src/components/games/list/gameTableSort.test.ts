import { describe, expect, it } from 'vitest';
import { getPlayedDateSortComparator } from './gameTableSort';

const dates = ['2024.05.01', '????.??.??', '2024.??.??', undefined, '2019.01.01', '2024.05.??'];

// The comparator ignores the cell params.
const noParams = undefined as never;

describe('getPlayedDateSortComparator', () => {
    it('sorts oldest first with partial dates after their period and undated games last', () => {
        const compare = getPlayedDateSortComparator('asc');

        expect([...dates].sort((a, b) => compare(a, b, noParams, noParams))).toEqual([
            '2019.01.01',
            '2024.05.01',
            '2024.05.??',
            '2024.??.??',
            '????.??.??',
            undefined,
        ]);
    });

    it('sorts newest first with undated games still last', () => {
        const compare = getPlayedDateSortComparator('desc');

        expect([...dates].sort((a, b) => compare(a, b, noParams, noParams))).toEqual([
            '2024.??.??',
            '2024.05.??',
            '2024.05.01',
            '2019.01.01',
            '????.??.??',
            undefined,
        ]);
    });
});
