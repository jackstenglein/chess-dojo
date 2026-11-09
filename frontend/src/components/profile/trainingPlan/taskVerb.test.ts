import { describe, expect, it } from 'vitest';
import { splitDisplayName, splitTaskVerb } from './taskVerb';

describe('splitTaskVerb', () => {
    it('takes the verb off the front', () => {
        expect(splitTaskVerb('Read How to Find a Training Partner')).toEqual({
            verb: 'read',
            rest: 'How to Find a Training Partner',
        });
        expect(splitTaskVerb('Watch How to Make 1900')).toEqual({
            verb: 'watch',
            rest: 'How to Make 1900',
        });
    });

    it('drops a leading article and capitalises what is left', () => {
        expect(splitTaskVerb('Annotate a Classical Game')).toEqual({
            verb: 'annotate',
            rest: 'Classical Game',
        });
        expect(splitTaskVerb('play an opening line')).toEqual({
            verb: 'play',
            rest: 'Opening line',
        });
    });

    it('leaves names without a known verb alone', () => {
        expect(splitTaskVerb('Schedule Your Next Classical Game')).toEqual({
            rest: 'Schedule Your Next Classical Game',
        });
        expect(splitTaskVerb('Lire la stratégie des finales')).toEqual({
            rest: 'Lire la stratégie des finales',
        });
    });

    it('needs more than the verb alone', () => {
        expect(splitTaskVerb('Read')).toEqual({ rest: 'Read' });
    });

    it('does not match a verb inside a longer word', () => {
        expect(splitTaskVerb('Reading List')).toEqual({ rest: 'Reading List' });
    });
});

describe('splitDisplayName', () => {
    it.each([
        ['Watch How to Make 1900', 'watch', 'How to Make 1900'],
        ['Read How to Find a Training Partner', 'guide', 'How to Find a Training Partner'],
        ['Read the Tactics Guide', 'guide', 'Tactics Guide'],
        ['Read Endgame Strategy, Shereshevsky', 'read', 'Endgame Strategy, Shereshevsky'],
        ['Spar White Repertoire', 'spar', 'Spar White Repertoire'],
        ['Review With a Coach', 'review', 'Review With a Coach'],
    ])('%s', (name, verb, rest) => {
        expect(splitDisplayName(name)).toEqual({ verb, rest });
    });
});
