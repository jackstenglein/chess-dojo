import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PopularPuzzles } from './PopularPuzzles';

vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

afterEach(cleanup);

const puzzle = (id: string, upvotes?: number, downvotes?: number) =>
    ({ id, buckets: ['Tactics'], themes: [], upvotes, downvotes }) as unknown as PuzzlebasePuzzle;

describe('PopularPuzzles', () => {
    it('lists the best liked puzzles first, with popularity and the votes', () => {
        render(
            <PopularPuzzles
                puzzles={[puzzle('001', 1, 0), puzzle('002', 40, 2), puzzle('003', 9, 1)]}
            />,
        );
        const links = screen.getAllByRole('link').map((a) => a.textContent);
        expect(links).toEqual(['#002', '#003', '#001']);
        expect(screen.getByText('90%')).toBeTruthy(); // 40 up, 2 down: 100 × 38 ÷ 42, rounded
        expect(screen.getByLabelText('40 up, 2 down')).toBeTruthy();
    });

    it('links to the puzzle', () => {
        render(<PopularPuzzles puzzles={[puzzle('002', 5, 0)]} />);
        expect(screen.getByRole('link').getAttribute('href')).toBe('/puzzles/base/002');
    });

    it('says so when nobody has voted', () => {
        render(<PopularPuzzles puzzles={[puzzle('001'), puzzle('002', 0, 2)]} />);
        expect(screen.getByText(/No votes yet/)).toBeTruthy();
    });
});
