import { describe, expect, it } from 'vitest';
import { defaultTaxonomy } from './build';
import {
    acceptTags,
    applyTagChanges,
    isEmptySuggestion,
    newTagsFor,
    PuzzleSuggestion,
    removalsFor,
    ResolveSuggestionsRequestSchema,
    suggestedNames,
    SuggestTagsRequestSchema,
    summarizeSuggestions,
    withoutTags,
} from './suggestions';

const suggestion = (
    puzzleId: string,
    username: string,
    buckets: string[],
    themes: string[],
    createdAt = '2026-10-01T10:00:00.000Z',
): PuzzleSuggestion => ({
    puzzleId,
    username,
    displayName: username.toUpperCase(),
    buckets,
    themes,
    createdAt,
});

describe('requests', () => {
    it('defaults to no tags, which withdraws a suggestion', () => {
        expect(SuggestTagsRequestSchema.parse({})).toEqual({
            buckets: [],
            themes: [],
            removeBuckets: [],
            removeThemes: [],
        });
        expect(ResolveSuggestionsRequestSchema.parse({})).toEqual({ accept: [], reject: [] });
    });

    it('rejects an absurd number of tags', () => {
        expect(
            SuggestTagsRequestSchema.safeParse({
                themes: Array.from({ length: 31 }, (_, i) => `t${i}`),
            }).success,
        ).toBe(false);
    });
});

describe('newTagsFor', () => {
    it('drops tags the puzzle already has, and repeats', () => {
        expect(
            newTagsFor(
                { buckets: ['Tactics'], themes: ['Fork'] },
                { buckets: ['Tactics', 'Endgame'], themes: ['Fork', 'Pin', 'Pin'] },
            ),
        ).toEqual({ buckets: ['Endgame'], themes: ['Pin'] });
    });
});

describe('withoutTags', () => {
    it('removes named tags whatever their case, and leaves the rest', () => {
        const s = withoutTags(suggestion('001', 'a', ['Tactics'], ['Fork', 'Pin']), ['fork']);
        expect(s.themes).toEqual(['Pin']);
        expect(s.buckets).toEqual(['Tactics']);
        expect(isEmptySuggestion(withoutTags(s, ['Pin', 'Tactics']))).toBe(true);
    });
});

describe('summarizeSuggestions', () => {
    it('counts each tag once per person, and lists who suggested it', () => {
        const summary = summarizeSuggestions([
            suggestion('002', 'ann', [], ['Fork'], '2026-10-01T10:00:00.000Z'),
            suggestion('002', 'bob', [], ['Fork', 'Pin'], '2026-10-01T11:00:00.000Z'),
            suggestion('002', 'cy', ['Endgame'], ['Pin'], '2026-10-01T12:00:00.000Z'),
        ]);
        expect(summary).toHaveLength(1);
        expect(summary[0].tags.map((t) => [t.name, t.kind, t.count])).toEqual([
            ['Fork', 'theme', 2],
            ['Pin', 'theme', 2],
            ['Endgame', 'bucket', 1],
        ]);
        expect(summary[0].tags[0].suggestedBy).toEqual(['ANN', 'BOB']);
    });

    it('puts the most wanted tags first, then by name, and puzzles in id order', () => {
        const summary = summarizeSuggestions([
            suggestion('010', 'a', [], ['Zwischenzug']),
            suggestion('003', 'a', [], ['Pin']),
            suggestion('003', 'b', [], ['Fork', 'Pin']),
        ]);
        expect(summary.map((s) => s.puzzleId)).toEqual(['003', '010']);
        expect(summary[0].tags.map((t) => t.name)).toEqual(['Pin', 'Fork']);
    });

    it('shows nothing for no suggestions, or for suggestions with no tags', () => {
        expect(summarizeSuggestions([])).toEqual([]);
        expect(summarizeSuggestions([suggestion('001', 'a', [], [])])).toEqual([]);
    });
});

describe('acceptTags', () => {
    const taxonomy = defaultTaxonomy();

    it('adds a theme with its bucket, and a bucket on its own', () => {
        const { tags, unknown } = acceptTags(taxonomy, { buckets: [], themes: [] }, [
            'Fork',
            'Endgame',
        ]);
        expect(tags.themes).toEqual(['Fork']);
        expect(tags.buckets).toEqual(['Tactics', 'Endgame']);
        expect(unknown).toEqual([]);
    });

    it('reports names that are not tags, without failing the rest', () => {
        const { tags, unknown } = acceptTags(taxonomy, { buckets: [], themes: [] }, [
            'Pin',
            'Nonsense',
        ]);
        expect(tags.themes).toEqual(['Pin']);
        expect(unknown).toEqual(['Nonsense']);
    });

    it('takes off a tag the puzzle already has', () => {
        const { tags } = acceptTags(taxonomy, { buckets: ['Tactics'], themes: ['Fork'] }, ['Fork']);
        expect(tags).toEqual({ buckets: ['Tactics'], themes: [] });
    });

    it('takes off a bucket along with the themes that were only there because of it', () => {
        const { tags } = acceptTags(
            taxonomy,
            { buckets: ['Tactics', 'Endgame'], themes: ['Fork', 'Passed pawn'] },
            ['Tactics'],
        );
        expect(tags).toEqual({ buckets: ['Endgame'], themes: ['Passed pawn'] });
    });

    it('adds and takes off in one go', () => {
        const { tags } = acceptTags(taxonomy, { buckets: ['Tactics'], themes: ['Fork'] }, [
            'Fork',
            'Pin',
        ]);
        expect(tags.themes).toEqual(['Pin']);
    });
});

describe('suggesting that tags come off', () => {
    it('keeps only removals of tags the puzzle has', () => {
        expect(
            removalsFor(
                { buckets: ['Tactics'], themes: ['Fork'] },
                { removeBuckets: ['Tactics', 'Endgame'], removeThemes: ['Fork', 'Pin', 'Pin'] },
            ),
        ).toEqual({ removeBuckets: ['Tactics'], removeThemes: ['Fork'] });
        expect(removalsFor({ buckets: [], themes: [] }, {})).toEqual({
            removeBuckets: [],
            removeThemes: [],
        });
    });

    it('counts removals apart from additions, and says which each is', () => {
        const summary = summarizeSuggestions([
            { ...suggestion('001', 'ann', [], ['Pin']), removeThemes: ['Fork'] },
            { ...suggestion('001', 'bob', [], []), removeThemes: ['Fork'] },
            suggestion('001', 'cy', [], ['Fork']),
        ]);
        expect(summary[0].tags.map((t) => [t.name, t.action, t.count])).toEqual([
            ['Fork', 'remove', 2],
            ['Fork', 'add', 1],
            ['Pin', 'add', 1],
        ]);
        expect(summary[0].tags[0].suggestedBy).toEqual(['ANN', 'BOB']);
    });

    it('treats a suggestion with only removals as not empty, and clears them by name', () => {
        const s = {
            ...suggestion('001', 'a', [], []),
            removeThemes: ['Fork'],
            removeBuckets: ['Tactics'],
        };
        expect(isEmptySuggestion(s)).toBe(false);
        const left = withoutTags(s, ['fork', 'Tactics']);
        expect(left.removeThemes).toEqual([]);
        expect(left.removeBuckets).toEqual([]);
        expect(isEmptySuggestion(left)).toBe(true);
    });

    it('reads suggestions saved before removals existed', () => {
        const old = suggestion('001', 'a', [], ['Pin']);
        expect(old.removeThemes).toBeUndefined();
        expect(isEmptySuggestion(old)).toBe(false);
        expect(withoutTags(old, ['Pin']).themes).toEqual([]);
        expect(summarizeSuggestions([old])[0].tags[0]).toMatchObject({
            name: 'Pin',
            action: 'add',
        });
    });
});

describe('applyTagChanges', () => {
    const taxonomy = defaultTaxonomy();
    const none = { buckets: [], themes: [], removeBuckets: [], removeThemes: [] };

    it('adds tags, bringing a theme’s bucket along', () => {
        expect(
            applyTagChanges(taxonomy, { buckets: [], themes: [] }, { ...none, themes: ['Fork'] }),
        ).toEqual({ buckets: ['Tactics'], themes: ['Fork'] });
    });

    it('takes tags off', () => {
        expect(
            applyTagChanges(
                taxonomy,
                { buckets: ['Tactics'], themes: ['Fork', 'Pin'] },
                { ...none, removeThemes: ['Fork'] },
            ),
        ).toEqual({ buckets: ['Tactics'], themes: ['Pin'] });
    });

    it('adds and takes off in one go, and takes a bucket’s themes with it', () => {
        expect(
            applyTagChanges(
                taxonomy,
                { buckets: ['Tactics', 'Endgame'], themes: ['Fork', 'Passed pawn'] },
                { ...none, themes: ['Pin'], removeBuckets: ['Endgame'] },
            ),
        ).toEqual({ buckets: ['Tactics'], themes: ['Fork', 'Pin'] });
    });

    it('lists every name a suggestion mentions', () => {
        expect(
            suggestedNames({
                buckets: ['Endgame'],
                themes: ['Pin'],
                removeBuckets: ['Opening'],
                removeThemes: ['Fork'],
            }),
        ).toEqual(['Endgame', 'Pin', 'Opening', 'Fork']);
        expect(suggestedNames({ buckets: [], themes: ['Pin'] })).toEqual(['Pin']);
    });
});
