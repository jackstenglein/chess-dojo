import { describe, expect, it } from 'vitest';
import { PuzzlebasePuzzle } from './api';
import {
    addThemeToTaxonomy,
    applyPuzzleUpdate,
    buildPuzzle,
    contributionFromPgn,
    defaultTaxonomy,
    normalizeThemeName,
    removeThemeFromTaxonomy,
    validateTags,
} from './build';
import { parsePuzzlePgn } from './parse';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const PGN = `[White "A"]\n[Black "B"]\n[Date "1999.??.??"]\n[Result "1-0"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`;
const author = { id: '007', annotator: 'kostya', annotatorDisplayName: 'Kostya', now: 'T1' };

describe('defaultTaxonomy', () => {
    it('returns an independent copy', () => {
        const a = defaultTaxonomy();
        a.buckets.Tactics.push('Mutated');
        expect(defaultTaxonomy().buckets.Tactics).not.toContain('Mutated');
    });
});

describe('addThemeToTaxonomy', () => {
    it('adds a normalized theme to the bucket', () => {
        const next = addThemeToTaxonomy(defaultTaxonomy(), 'Endgame', '  wrong   bishop ');
        expect(next.buckets.Endgame).toContain('Wrong bishop');
    });

    it('does not change the input taxonomy', () => {
        const taxonomy = defaultTaxonomy();
        addThemeToTaxonomy(taxonomy, 'Endgame', 'Wrong bishop');
        expect(taxonomy.buckets.Endgame).not.toContain('Wrong bishop');
    });

    it('rejects an unknown bucket', () => {
        expect(() => addThemeToTaxonomy(defaultTaxonomy(), 'Nope', 'Something')).toThrow(
            /Unknown bucket/,
        );
    });

    it('lists a theme from another bucket here too, spelled as it is there', () => {
        const next = addThemeToTaxonomy(defaultTaxonomy(), 'Endgame', 'pin');
        expect(next.buckets.Endgame).toContain('Pin');
        expect(next.buckets.Endgame).not.toContain('pin');
        expect(next.buckets.Tactics).toContain('Pin');
    });

    it('rejects a theme the bucket already has, ignoring case', () => {
        expect(() => addThemeToTaxonomy(defaultTaxonomy(), 'Tactics', 'pin')).toThrow(
            /"Pin" is already in Tactics/,
        );
    });

    it('rejects names that are too short', () => {
        expect(() => addThemeToTaxonomy(defaultTaxonomy(), 'Endgame', ' a ')).toThrow(
            /2 characters/,
        );
    });
});

describe('normalizeThemeName', () => {
    it('trims, collapses whitespace and capitalizes the first letter', () => {
        expect(normalizeThemeName('  hanging   piece ')).toBe('Hanging piece');
    });
});

describe('validateTags', () => {
    const taxonomy = defaultTaxonomy();

    it("adds a theme's bucket and removes duplicates", () => {
        expect(validateTags(taxonomy, ['Endgame', 'Endgame'], ['Pin', 'Pin'])).toEqual({
            buckets: ['Endgame', 'Tactics'],
            themes: ['Pin'],
        });
    });

    it('rejects unknown buckets and themes', () => {
        expect(() => validateTags(taxonomy, ['Nope'], [])).toThrow(/Unknown bucket: Nope/);
        expect(() => validateTags(taxonomy, [], ['Nope'])).toThrow(/Unknown theme: Nope/);
    });
});

describe('buildPuzzle', () => {
    const parsed = parsePuzzlePgn(PGN);

    it('builds a puzzle from the parsed PGN', () => {
        const puzzle = buildPuzzle(author, parsed, { rating: 600 }, defaultTaxonomy());
        expect(puzzle).toMatchObject({
            id: '007',
            fen: FEN,
            annotator: 'kostya',
            rating: 600,
            white: 'A',
            black: 'B',
            result: '1-0',
            year: 1999,
            buckets: [],
            themes: [],
            createdAt: 'T1',
            updatedAt: 'T1',
        });
    });

    it('lets the request override the PGN headers and add tags', () => {
        const puzzle = buildPuzzle(
            author,
            parsed,
            { rating: 600, white: 'Someone', year: 2001, themes: ['Back rank mate'] },
            defaultTaxonomy(),
            'https://lichess.org/study/abc',
        );
        expect(puzzle.white).toBe('Someone');
        expect(puzzle.black).toBe('B');
        expect(puzzle.year).toBe(2001);
        expect(puzzle.buckets).toEqual(['Tactics']);
        expect(puzzle.lichessStudyUrl).toBe('https://lichess.org/study/abc');
    });
});

describe('applyPuzzleUpdate', () => {
    const base: PuzzlebasePuzzle = buildPuzzle(
        author,
        parsePuzzlePgn(PGN),
        { rating: 600, composer: 'Book' },
        defaultTaxonomy(),
    );

    it('changes only the fields that are present', () => {
        const updated = applyPuzzleUpdate(
            base,
            { id: '007', rating: 900 },
            defaultTaxonomy(),
            'T2',
        );
        expect(updated.rating).toBe(900);
        expect(updated.composer).toBe('Book');
        expect(updated.createdAt).toBe('T1');
        expect(updated.updatedAt).toBe('T2');
    });

    it('re-validates a new solution and updates the position', () => {
        const fen = '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1';
        const pgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n1. Nf7+ Kg8 2. Nxd8`;
        const updated = applyPuzzleUpdate(
            base,
            { id: '007', solutionPgn: pgn },
            defaultTaxonomy(),
            'T2',
        );
        expect(updated.fen).toBe(fen);
        expect(updated.solutionPgn).toContain('Nf7+');
    });

    it('rejects an invalid new solution', () => {
        const pgn = `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Qh5`;
        expect(() =>
            applyPuzzleUpdate(base, { id: '007', solutionPgn: pgn }, defaultTaxonomy(), 'T2'),
        ).toThrow(/legal/);
    });

    it('validates tags, keeping existing ones when only themes are sent', () => {
        const tagged = applyPuzzleUpdate(
            base,
            { id: '007', buckets: ['Endgame'] },
            defaultTaxonomy(),
            'T2',
        );
        const updated = applyPuzzleUpdate(
            tagged,
            { id: '007', themes: ['Pin'] },
            defaultTaxonomy(),
            'T3',
        );
        expect(updated.buckets.sort()).toEqual(['Endgame', 'Tactics']);
        expect(() =>
            applyPuzzleUpdate(base, { id: '007', themes: ['Nope'] }, defaultTaxonomy(), 'T2'),
        ).toThrow(/Unknown theme/);
    });
});

describe('contributionFromPgn', () => {
    const withComment = (comment: string) =>
        parsePuzzlePgn(`[SetUp "1"]\n[FEN "${FEN}"]\n\n{ ${comment} } 1. Rd8#`);

    it('turns the tags and rating in a PGN into real tags', () => {
        const parsed = withComment('tags: back rank mate, Endgame; rating: 1450');
        expect(contributionFromPgn(defaultTaxonomy(), parsed)).toEqual({
            buckets: ['Endgame'],
            themes: ['Back rank mate'],
            rating: 1450,
            warnings: [],
        });
    });

    it('leaves off names that are not real themes and says so', () => {
        const parsed = withComment('tags: Fork, Skewr, Banana');
        const result = contributionFromPgn(defaultTaxonomy(), parsed);
        expect(result.themes).toEqual(['Fork']);
        expect(result.warnings).toEqual([
            'Unknown tag "Skewr". Did you mean "Skewer"? It was left off.',
            'Unknown tag "Banana". It was left off.',
        ]);
    });

    it('reports a rating that cannot be used', () => {
        const result = contributionFromPgn(defaultTaxonomy(), withComment('rating: lots'));
        expect(result.rating).toBeUndefined();
        expect(result.warnings[0]).toMatch(/Ignored the rating "lots"/);
    });

    it('reads tags and a rating from headers too', () => {
        const parsed = parsePuzzlePgn(
            `[SetUp "1"]\n[FEN "${FEN}"]\n[Themes "Pin"]\n[Rating "700"]\n\n1. Rd8#`,
        );
        expect(contributionFromPgn(defaultTaxonomy(), parsed)).toMatchObject({
            themes: ['Pin'],
            buckets: [],
            rating: 700,
        });
    });

    it('asks for nothing from a PGN that asks for nothing', () => {
        expect(contributionFromPgn(defaultTaxonomy(), parsePuzzlePgn(PGN))).toEqual({
            buckets: [],
            themes: [],
            rating: undefined,
            warnings: [],
        });
    });
});

describe('themes listed under several buckets', () => {
    const taxonomy = defaultTaxonomy();

    it('lists Attack on the king under Middlegame and Endgame by default, not Tactics', () => {
        for (const bucket of ['Middlegame', 'Endgame']) {
            expect(taxonomy.buckets[bucket]).toContain('Attack on the king');
        }
        expect(taxonomy.buckets.Tactics).not.toContain('Attack on the king');
    });

    it('brings only its first bucket when the puzzle has none that lists it', () => {
        expect(validateTags(taxonomy, [], ['Attack on the king'])).toEqual({
            buckets: ['Middlegame'],
            themes: ['Attack on the king'],
        });
    });

    it('keeps the bucket the puzzle already has, without adding another', () => {
        expect(validateTags(taxonomy, ['Endgame'], ['Attack on the king'])).toEqual({
            buckets: ['Endgame'],
            themes: ['Attack on the king'],
        });
    });

    it('calls the theme Attraction now, not Decoy', () => {
        expect(taxonomy.buckets.Tactics).toContain('Attraction');
        expect(taxonomy.buckets.Tactics).not.toContain('Decoy');
    });
});

describe('removeThemeFromTaxonomy', () => {
    const tax = { buckets: { Tactics: ['Pin', 'Fork'], Endgame: ['Fork'] } };

    it('removes the theme from one bucket and keeps it where it is still listed', () => {
        const result = removeThemeFromTaxonomy(tax, 'Tactics', 'fork');
        expect(result.taxonomy.buckets).toEqual({ Tactics: ['Pin'], Endgame: ['Fork'] });
        expect(result.goneEverywhere).toBe(false);
    });

    it('reports a theme that is gone everywhere', () => {
        expect(removeThemeFromTaxonomy(tax, 'Tactics', 'Pin').goneEverywhere).toBe(true);
    });

    it('rejects unknown buckets and themes', () => {
        expect(() => removeThemeFromTaxonomy(tax, 'Nope', 'Pin')).toThrow('Unknown bucket');
        expect(() => removeThemeFromTaxonomy(tax, 'Tactics', 'Skewer')).toThrow('not in Tactics');
    });
});
