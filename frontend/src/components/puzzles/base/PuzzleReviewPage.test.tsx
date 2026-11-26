import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { defaultTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { SuggestionSummary } from '@jackstenglein/chess-dojo-common/src/puzzlebase/suggestions';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuzzleReview, reviewQueue } from './PuzzleReviewPage';
import { PuzzlebaseClient } from './puzzlebaseClient';

// The real board and move list need the whole app. This stand-in shows the side panel.
vi.mock('@/board/pgn/PgnBoard', () => ({
    default: (props: { pgn?: string; underboardTabs?: { element: React.ReactNode }[] }) => (
        <div>
            <div data-testid='pgn'>{props.pgn}</div>
            {props.underboardTabs?.[0].element}
        </div>
    ),
}));
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

afterEach(cleanup);

const puzzle = (id: string, themes: string[] = []): PuzzlebasePuzzle => ({
    id,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionPgn: `pgn-${id}`,
    annotator: 'a',
    annotatorDisplayName: 'A',
    rating: 1000,
    buckets: themes.length ? ['Tactics', 'Middlegame'] : [],
    themes,
    createdAt: 'T0',
    updatedAt: 'T0',
});

const suggestion = (
    puzzleId: string,
    names: string[],
    action: 'add' | 'remove' = 'add',
): SuggestionSummary => ({
    puzzleId,
    tags: names.map((name) => ({
        name,
        kind: 'theme',
        action,
        count: 2,
        suggestedBy: ['Ann', 'Bob'],
    })),
});

describe('reviewQueue', () => {
    const all = [puzzle('003', ['Fork']), puzzle('001'), puzzle('002')];

    it('goes through puzzles missing tags, in id order', () => {
        expect(reviewQueue(all, [], 'untagged')).toEqual(['001', '002']);
    });

    it('goes through puzzles with suggestions waiting', () => {
        expect(reviewQueue(all, [suggestion('003', ['Pin'])], 'suggested')).toEqual(['003']);
    });

    it('can go through everything', () => {
        expect(reviewQueue(all, [], 'all')).toEqual(['001', '002', '003']);
    });
});

function setup(over: Partial<Record<keyof PuzzlebaseClient, unknown>> = {}) {
    const updated = puzzle('001', ['Pin']);
    const resolveSuggestions = vi.fn((_id: string, _request: unknown) => Promise.resolve(updated));
    const client = {
        listPuzzles: vi.fn(() =>
            Promise.resolve([puzzle('003', ['Fork']), puzzle('001'), puzzle('002')]),
        ),
        getTaxonomy: vi.fn(() => Promise.resolve(defaultTaxonomy())),
        getLeaderboard: vi.fn(() => Promise.resolve([])),
        listSuggestions: vi.fn(() => Promise.resolve([suggestion('001', ['Pin', 'Skewer'])])),
        resolveSuggestions,
        updatePuzzle: vi.fn(() => Promise.resolve(updated)),
        getPuzzle: vi.fn(() => Promise.resolve(updated)),
        ...over,
    } as unknown as PuzzlebaseClient;
    render(<PuzzleReview client={client} />);
    return { client, resolveSuggestions };
}

describe('PuzzleReview', () => {
    it('starts on the first puzzle with no themes, showing its solution', async () => {
        setup();
        expect(await screen.findByText('#001')).toBeTruthy();
        expect(screen.getByTestId('pgn').textContent).toBe('pgn-001');
        expect(screen.getByText(/1 of 2/)).toBeTruthy();
    });

    it('steps to the next and previous puzzle', async () => {
        setup();
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: 'Next puzzle' }));
        expect(await screen.findByText('#002')).toBeTruthy();
        expect(screen.getByTestId('pgn').textContent).toBe('pgn-002');
        fireEvent.click(screen.getByRole('button', { name: 'Previous puzzle' }));
        expect(await screen.findByText('#001')).toBeTruthy();
    });

    it('cannot step past either end', async () => {
        setup();
        await screen.findByText('#001');
        expect(
            screen.getByRole('button', { name: 'Previous puzzle' }).hasAttribute('disabled'),
        ).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Next puzzle' }));
        await screen.findByText('#002');
        expect(
            screen.getByRole('button', { name: 'Previous puzzle' }).hasAttribute('disabled'),
        ).toBe(false);
        expect(
            (screen.getAllByRole('button', { name: 'Next puzzle' })[0] as HTMLButtonElement)
                .disabled,
        ).toBe(true);
    });

    it('shows the tags members suggested, with who and how many', async () => {
        setup();
        await screen.findByText('#001');
        expect(screen.getByText('Suggested by members')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Accept Pin' })).toBeTruthy();
        expect(screen.getAllByText(/2 people: Ann, Bob/)).toHaveLength(2);
    });

    it('accepts a suggested tag, which leaves the pile', async () => {
        const { resolveSuggestions } = setup();
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: 'Accept Pin' }));
        await waitFor(() =>
            expect(resolveSuggestions).toHaveBeenCalledWith('001', {
                accept: ['Pin'],
                reject: [],
            }),
        );
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'Accept Pin' })).toBeNull(),
        );
        expect(screen.getByRole('button', { name: 'Accept Skewer' })).toBeTruthy();
    });

    it('dismisses a suggested tag', async () => {
        const { resolveSuggestions } = setup();
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss Skewer' }));
        await waitFor(() =>
            expect(resolveSuggestions).toHaveBeenCalledWith('001', {
                accept: [],
                reject: ['Skewer'],
            }),
        );
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'Dismiss Skewer' })).toBeNull(),
        );
    });

    it('can limit the list to puzzles with suggestions', async () => {
        setup();
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: /Suggested/ }));
        await waitFor(() => expect(screen.getByText(/1 of 1/)).toBeTruthy());
        expect(screen.getByTestId('pgn').textContent).toBe('pgn-001');
    });

    it('says so when there is nothing to review', async () => {
        setup({ listSuggestions: vi.fn(() => Promise.resolve([])) });
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: /Suggested/ }));
        expect(await screen.findByText('No suggestions are waiting.')).toBeTruthy();
    });

    it('still reviews if the suggestions cannot be loaded', async () => {
        setup({ listSuggestions: vi.fn(() => Promise.reject(new Error('down'))) });
        expect(await screen.findByText('#001')).toBeTruthy();
        expect(screen.queryByText('Suggested by members')).toBeNull();
    });

    it('shows an error if a decision cannot be saved', async () => {
        setup({
            resolveSuggestions: vi.fn(() =>
                Promise.reject(
                    Object.assign(new Error('x'), {
                        response: { data: { message: 'Someone else changed this puzzle' } },
                    }),
                ),
            ),
        });
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: 'Accept Pin' }));
        expect(await screen.findByText('Someone else changed this puzzle')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Accept Pin' })).toBeTruthy();
    });

    it('shows a suggestion to take a tag off, and takes it off when accepted', async () => {
        const { resolveSuggestions } = setup({
            listSuggestions: vi.fn(() => Promise.resolve([suggestion('001', ['Fork'], 'remove')])),
        });
        await screen.findByText('#001');
        expect(screen.getByText('Remove')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Accept removing Fork' }));
        await waitFor(() =>
            expect(resolveSuggestions).toHaveBeenCalledWith('001', {
                accept: ['Fork'],
                reject: [],
            }),
        );
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'Accept removing Fork' })).toBeNull(),
        );
    });

    it('keeps the tag when a removal is dismissed', async () => {
        const { resolveSuggestions } = setup({
            listSuggestions: vi.fn(() => Promise.resolve([suggestion('001', ['Fork'], 'remove')])),
        });
        await screen.findByText('#001');
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss Fork' }));
        await waitFor(() =>
            expect(resolveSuggestions).toHaveBeenCalledWith('001', {
                accept: [],
                reject: ['Fork'],
            }),
        );
    });
});

describe('reviewQueue: type and phase', () => {
    it('includes a puzzle with a theme but no phase', () => {
        const noPhase = { ...puzzle('004', ['Fork']), buckets: ['Tactics'] };
        expect(reviewQueue([noPhase, puzzle('005', ['Pin'])], [], 'untagged')).toEqual(['004']);
    });
});
