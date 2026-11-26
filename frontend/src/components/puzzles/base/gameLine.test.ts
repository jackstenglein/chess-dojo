import { describe, expect, it } from 'vitest';
import { gameLine } from './PuzzleInfoPanel';

describe('gameLine', () => {
    it('writes the players, then the event and year', () => {
        expect(
            gameLine({ white: 'Fischer', black: 'Spassky', event: 'Reykjavik', year: 1972 }),
        ).toBe('Fischer - Spassky, Reykjavik 1972');
    });

    it('leaves out what is not known', () => {
        expect(gameLine({ white: 'Fischer', black: 'Spassky' })).toBe('Fischer - Spassky');
        expect(gameLine({ white: 'Fischer', black: 'Spassky', year: 1972 })).toBe(
            'Fischer - Spassky, 1972',
        );
        expect(gameLine({ event: 'Reykjavik', year: 1972 })).toBe('Reykjavik 1972');
        expect(gameLine({ white: '?', black: '?', event: '?' })).toBe('');
        expect(gameLine({})).toBe('');
    });

    it('leaves out the sorting label in the White field, which is not a player', () => {
        expect(
            gameLine({
                white: 'Ex 11 Tactics, Mating net',
                black: 'Glek - Frog',
                event: 'Russia (ch)',
                year: 1995,
            }),
        ).toBe('Glek - Frog, Russia (ch) 1995');
    });

    it('keeps a player whose name only starts like the label', () => {
        expect(gameLine({ white: 'Exner', black: 'Smith' })).toBe('Exner - Smith');
    });

    it('shows one player when only one is known', () => {
        expect(gameLine({ white: 'White to play', black: '?' })).toBe('White to play');
    });

    it('adds the place after the event, before the year', () => {
        expect(
            gameLine({
                white: 'Fischer',
                black: 'Spassky',
                event: 'World Championship',
                site: 'Reykjavik',
                year: 1972,
            }),
        ).toBe('Fischer - Spassky, World Championship, Reykjavik 1972');
    });

    it('does not say the place twice when it is the name of the event', () => {
        expect(
            gameLine({
                white: 'A',
                black: 'B',
                event: 'Las Palmas',
                site: 'las palmas',
                year: 1973,
            }),
        ).toBe('A - B, Las Palmas 1973');
    });

    it('uses the place on its own when there is no event', () => {
        expect(gameLine({ white: 'A', black: 'B', site: 'Moscow', year: 1950 })).toBe(
            'A - B, Moscow 1950',
        );
        expect(gameLine({ white: 'A', black: 'B', event: '?', site: '?' })).toBe('A - B');
    });

    it('does not repeat the place or the year that the event name already has', () => {
        expect(
            gameLine({
                white: 'Abraham',
                black: 'Winters',
                event: 'London 1946',
                site: 'London',
                year: 1946,
            }),
        ).toBe('Abraham - Winters, London 1946');
        expect(
            gameLine({
                white: 'A',
                black: 'B',
                event: 'Hastings 1895',
                site: 'Hastings',
                year: 1895,
            }),
        ).toBe('A - B, Hastings 1895');
    });

    it('still shows a year that is not in the event name', () => {
        expect(
            gameLine({ white: 'A', black: 'B', event: 'London', site: 'London', year: 1946 }),
        ).toBe('A - B, London 1946');
    });
});
