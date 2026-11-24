import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuplicatesPage } from './DuplicatesPage';

const client = vi.hoisted(() => ({ listPuzzles: vi.fn(), deletePuzzle: vi.fn() }));
vi.mock('./PuzzlebaseGate', () => ({
    PuzzlebaseGate: ({ children }: { children: (p: unknown) => React.ReactNode }) =>
        children({ client, status: { canContribute: true, isAdmin: false } }),
}));
vi.mock('@/auth/Auth', () => ({ useAuth: () => ({ user: { username: 'ann' } }) }));
vi.mock('@/board/Board', () => ({ default: () => <div data-testid='board' /> }));
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const puzzle = (id: string, annotator: string, fen = FEN): PuzzlebasePuzzle =>
    ({
        id,
        fen,
        solutionPgn: `[FEN "${fen}"]\n\n1. Rd8#`,
        rating: 1000,
        buckets: ['Tactics'],
        themes: ['Back rank mate'],
        annotator,
        annotatorDisplayName: annotator.toUpperCase(),
        createdAt: '2026-11-01T00:00:00.000Z',
    }) as PuzzlebasePuzzle;

afterEach(cleanup);

describe('DuplicatesPage', () => {
    it('lists puzzles that share a position, with delete only on your own', async () => {
        client.listPuzzles.mockResolvedValue([
            puzzle('001', 'ann'),
            puzzle('002', 'bob'),
            puzzle('003', 'bob', '8/8/8/8/8/8/k7/K7 w - - 0 1'),
        ]);
        render(<DuplicatesPage />);

        expect(await screen.findByText(/1 position is used by more than one puzzle/)).toBeTruthy();
        expect(screen.getByRole('link', { name: '#001' })).toBeTruthy();
        expect(screen.getByRole('link', { name: '#002' })).toBeTruthy();
        expect(screen.queryByRole('link', { name: '#003' })).toBeNull();
        expect(screen.getByText('Same answer')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Delete puzzle 001' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Delete puzzle 002' })).toBeNull();
    });

    it('says so when there are no duplicates', async () => {
        client.listPuzzles.mockResolvedValue([puzzle('001', 'ann')]);
        render(<DuplicatesPage />);
        expect(await screen.findByText('No duplicates among 1 puzzles.')).toBeTruthy();
    });
});
