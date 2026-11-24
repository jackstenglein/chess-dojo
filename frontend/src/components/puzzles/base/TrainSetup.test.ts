import { defaultTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SELECTION, focusOptions, focusQuery, TrainSelection } from './TrainSetup';

const taxonomy = defaultTaxonomy();
const everything: TrainSelection = {
    types: ['Tactics', 'Strategy'],
    phases: ['Opening', 'Middlegame', 'Endgame'],
};
const labels = (selection: TrainSelection, available?: Parameters<typeof focusOptions>[2]) =>
    focusOptions(taxonomy, selection, available).map((o) => `${o.group}:${o.label}`);

describe('the default choice', () => {
    it('is tactics, in every phase of the game', () => {
        expect(DEFAULT_SELECTION).toEqual({
            types: ['Tactics'],
            phases: ['Opening', 'Middlegame', 'Endgame'],
        });
    });
});

describe('focusOptions', () => {
    it('offers all themes first, then the themes of what is chosen', () => {
        const options = labels(DEFAULT_SELECTION);
        expect(options[0]).toBe('All puzzles:All Themes');
        expect(options).toContain('Tactics:Fork');
        expect(options).toContain('Endgame:Passed pawn');
        expect(options).not.toContain('Strategy:Outpost');
    });

    it('offers the strategy themes when strategy is chosen', () => {
        const options = labels({ ...everything, types: ['Strategy'] });
        expect(options).toContain('Strategy:Outpost');
        expect(options).not.toContain('Tactics:Fork');
    });

    it('leaves out the themes of a phase that is turned off', () => {
        const options = labels({ ...DEFAULT_SELECTION, phases: ['Endgame'] });
        expect(options).toContain('Endgame:Passed pawn');
        expect(options.some((o) => o.startsWith('Middlegame:'))).toBe(false);
        expect(options.some((o) => o.startsWith('Opening:'))).toBe(false);
    });

    it('does not offer phases or types as things to focus on', () => {
        expect(
            labels(everything).some((o) => o.endsWith(':Endgame') || o.endsWith(':Tactics')),
        ).toBe(false);
    });
});

describe('focusQuery', () => {
    const anything = { kind: 'any' as const, label: 'All Themes', group: 'All puzzles' };

    it('asks only for tactics when that is all that is chosen, with no limit on the phase', () => {
        expect(focusQuery(DEFAULT_SELECTION, anything)).toEqual({ types: 'Tactics' });
    });

    it('asks for nothing when everything is chosen', () => {
        expect(focusQuery(everything, anything)).toEqual({});
    });

    it('asks for the phases left on, and the theme', () => {
        expect(
            focusQuery(
                { types: ['Strategy'], phases: ['Opening', 'Endgame'] },
                { kind: 'theme', label: 'Outpost', group: 'Strategy' },
            ),
        ).toEqual({ types: 'Strategy', phases: 'Opening,Endgame', theme: 'Outpost' });
    });
});

describe('focusOptions with what there are puzzles for', () => {
    const available = [
        { buckets: ['Tactics', 'Endgame'], themes: ['Fork'], count: 3 },
        { buckets: ['Tactics', 'Middlegame'], themes: ['Pin'], count: 1 },
        { buckets: ['Strategy', 'Middlegame'], themes: ['Outpost'], count: 2 },
    ];

    it('only offers themes that tactics puzzles have, for tactics', () => {
        const options = labels(DEFAULT_SELECTION, available);
        expect(options).toContain('Tactics:Fork');
        expect(options).toContain('Tactics:Pin');
        expect(options).not.toContain('Tactics:Skewer');
        expect(options).not.toContain('Strategy:Outpost');
    });

    it('only offers themes that puzzles in the chosen phases have', () => {
        const options = labels({ ...DEFAULT_SELECTION, phases: ['Endgame'] }, available);
        expect(options).toContain('Tactics:Fork');
        expect(options).not.toContain('Tactics:Pin');
    });

    it('offers the themes of every puzzle when everything is chosen', () => {
        expect(labels(everything, available)).toEqual(
            expect.arrayContaining(['Tactics:Fork', 'Tactics:Pin', 'Strategy:Outpost']),
        );
    });

    it('offers nothing but All Themes when there are no puzzles', () => {
        expect(focusOptions(taxonomy, everything, []).map((o) => o.label)).toEqual(['All Themes']);
    });
});
