import { describe, expect, it } from 'vitest';
import { defaultTaxonomy } from './build';
import { describeUnknownTag, readPgnTagInfo, resolveTagNames } from './pgnTags';

describe('readPgnTagInfo', () => {
    it('reads tags and a rating from a comment before the first move', () => {
        expect(readPgnTagInfo({}, 'tags: Fork, Sacrifice; rating: 1450')).toEqual({
            names: ['Fork', 'Sacrifice'],
            rating: 1450,
            problems: [],
        });
    });

    it('reads them from headers', () => {
        expect(readPgnTagInfo({ themes: 'Fork, Pin', rating: '900' })).toEqual({
            names: ['Fork', 'Pin'],
            rating: 900,
            problems: [],
        });
    });

    it('ignores other text in the comment, and puts entries on separate lines', () => {
        const info = readPgnTagInfo(
            {},
            'White to play and win.\nTags: Pin\nRating: 700\nSee Fischer.',
        );
        expect(info).toMatchObject({ names: ['Pin'], rating: 700 });
    });

    it('accepts the key in any case and a few spellings', () => {
        expect(readPgnTagInfo({}, 'THEMES: Fork').names).toEqual(['Fork']);
        expect(readPgnTagInfo({}, 'tag: Fork').names).toEqual(['Fork']);
    });

    it('accepts hashtags and drops blanks and repeats', () => {
        expect(readPgnTagInfo({}, 'tags: #Fork, , fork, #Pin ,').names).toEqual(['Fork', 'Pin']);
    });

    it('combines tags from the comment and the headers', () => {
        expect(readPgnTagInfo({ themes: 'Pin, Fork' }, 'tags: Fork, Sacrifice').names).toEqual([
            'Fork',
            'Sacrifice',
            'Pin',
        ]);
    });

    it('prefers the header rating over the comment rating', () => {
        expect(readPgnTagInfo({ rating: '800' }, 'rating: 500').rating).toBe(800);
        expect(readPgnTagInfo({}, 'rating: 500').rating).toBe(500);
    });

    it('reports a rating that cannot be used, and ignores it', () => {
        for (const bad of ['abc', '-5', '15.5', '4000']) {
            const info = readPgnTagInfo({ rating: bad });
            expect(info.rating).toBeUndefined();
            expect(info.problems[0]).toContain(`"${bad}"`);
        }
    });

    it('finds nothing in a PGN that asks for nothing', () => {
        expect(readPgnTagInfo({}, undefined)).toEqual({
            names: [],
            rating: undefined,
            problems: [],
        });
        expect(readPgnTagInfo({ themes: 5, rating: 5 }, 'just a note')).toEqual({
            names: [],
            rating: undefined,
            problems: [],
        });
    });
});

describe('resolveTagNames', () => {
    const taxonomy = defaultTaxonomy();

    it('matches themes and buckets ignoring case', () => {
        expect(resolveTagNames(taxonomy, ['fork', 'ENDGAME', 'Passed pawn'])).toEqual({
            buckets: ['Endgame'],
            themes: ['Fork', 'Passed pawn'],
            unknown: [],
        });
    });

    it('understands other common names for a bucket', () => {
        expect(resolveTagNames(taxonomy, ['Tactical', 'positional', 'endgames']).buckets).toEqual([
            'Tactics',
            'Strategy',
            'Endgame',
        ]);
    });

    it('suggests the closest name for a likely typo', () => {
        expect(resolveTagNames(taxonomy, ['Skewr']).unknown).toEqual([
            { name: 'Skewr', suggestion: 'Skewer' },
        ]);
        expect(resolveTagNames(taxonomy, ['Discoverd attack']).unknown[0].suggestion).toBe(
            'Discovered attack',
        );
    });

    it('does not guess when nothing is close', () => {
        expect(resolveTagNames(taxonomy, ['Banana']).unknown).toEqual([
            { name: 'Banana', suggestion: undefined },
        ]);
    });

    it('does not repeat a tag', () => {
        expect(resolveTagNames(taxonomy, ['Fork', 'fork']).themes).toEqual(['Fork']);
    });

    it('describes an unknown tag in words', () => {
        expect(describeUnknownTag({ name: 'Skewr', suggestion: 'Skewer' })).toBe(
            'Unknown tag "Skewr". Did you mean "Skewer"? It was left off.',
        );
        expect(describeUnknownTag({ name: 'Banana' })).toBe(
            'Unknown tag "Banana". It was left off.',
        );
    });
});

describe('theme names that changed', () => {
    it('finds Attraction when a PGN still says Decoy', () => {
        const result = resolveTagNames(defaultTaxonomy(), ['Decoy', 'decoy', 'attraction']);
        expect(result.themes).toEqual(['Attraction']);
        expect(result.unknown).toEqual([]);
    });
});
