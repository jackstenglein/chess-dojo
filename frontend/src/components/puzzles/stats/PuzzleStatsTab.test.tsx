import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ getPuzzleStats: vi.fn(), getPuzzleRuns: vi.fn() }));
vi.mock('@/components/puzzles/base/puzzlebaseClient', () => ({
    getPuzzlebaseClient: () => client,
}));
vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

import {
    emptyCounters,
    groupIntoSessions,
    statsFromAttempts,
    toPuzzleAttempt,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { PuzzleStatsTab } from './PuzzleStatsTab';

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const make = (id: string, msAgo: number, clean: boolean) =>
    toPuzzleAttempt(
        {
            puzzleId: id,
            startedAt: iso(msAgo + 60_000),
            finishedAt: iso(msAgo),
            abandoned: false,
            moves: [
                {
                    line: 0,
                    ply: 0,
                    expected: 'Nf7+',
                    tries: clean
                        ? [{ move: 'Nf7+', correct: true, ms: 2000 }]
                        : [
                              { move: 'Qh5', correct: false, ms: 1000 },
                              { move: 'Nf7+', correct: true, ms: 3000 },
                          ],
                    ms: clean ? 2000 : 3000,
                },
            ],
        },
        { fen: 'F', rating: 850, buckets: ['Tactics'], themes: ['Fork'] },
    );

const attempts = [make('003', 3_600_000, true), make('004', 3_500_000, false)];

afterEach(cleanup);

beforeEach(() => {
    client.getPuzzleStats.mockReset();
    client.getPuzzleRuns.mockReset();
});

describe('PuzzleStatsTab', () => {
    it('shows an invitation when nothing has been solved', async () => {
        client.getPuzzleStats.mockResolvedValue({
            total: emptyCounters(),
            buckets: {},
            themes: {},
        });
        client.getPuzzleRuns.mockResolvedValue({ sessions: [], attempts: [] });
        render(<PuzzleStatsTab username='kostya' />);
        expect(await screen.findByText('No puzzles solved yet')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Start training' })).toHaveAttribute(
            'href',
            '/puzzles/train',
        );
    });

    it('shows an error when loading fails', async () => {
        client.getPuzzleStats.mockRejectedValue(new Error('nope'));
        client.getPuzzleRuns.mockResolvedValue({ sessions: [], attempts: [] });
        render(<PuzzleStatsTab username='kostya' />);
        expect(await screen.findByText(/Could not load puzzle stats/)).toBeInTheDocument();
    });

    it('shows totals, tag tables and sessions', async () => {
        client.getPuzzleStats.mockResolvedValue(statsFromAttempts(attempts));
        client.getPuzzleRuns.mockResolvedValue({ sessions: groupIntoSessions(attempts), attempts });
        render(<PuzzleStatsTab username='kostya' />);
        expect(await screen.findByText('Recent sessions')).toBeInTheDocument();
        expect(screen.getByRole('table', { name: 'Buckets' })).toHaveTextContent('Tactics');
        expect(screen.getByRole('table', { name: 'Themes' })).toHaveTextContent('Fork');
        expect(client.getPuzzleStats).toHaveBeenCalledWith('kostya');
    });

    it('opens a session, then an attempt, to show the wrong move tried', async () => {
        client.getPuzzleStats.mockResolvedValue(statsFromAttempts(attempts));
        client.getPuzzleRuns.mockResolvedValue({ sessions: groupIntoSessions(attempts), attempts });
        render(<PuzzleStatsTab username='kostya' />);

        fireEvent.click(await screen.findByRole('button', { name: 'Show puzzles' }));
        expect(screen.getByText('#004')).toBeInTheDocument();
        expect(screen.queryByText('Qh5')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Puzzle 004 details' }));
        expect(screen.getByText('Qh5')).toBeInTheDocument();
    });

    it('loads older history and merges it in', async () => {
        const old = make('001', 40 * 24 * 3_600_000, true);
        client.getPuzzleStats.mockResolvedValue(statsFromAttempts([...attempts, old]));
        client.getPuzzleRuns
            .mockResolvedValueOnce({ sessions: groupIntoSessions(attempts), attempts })
            .mockResolvedValueOnce({ sessions: groupIntoSessions([old]), attempts: [old] });
        render(<PuzzleStatsTab username='kostya' />);

        fireEvent.click(await screen.findByRole('button', { name: 'Load older' }));
        await waitFor(() => expect(client.getPuzzleRuns).toHaveBeenCalledTimes(2));
        const range = client.getPuzzleRuns.mock.calls[1][1] as { to: string };
        expect(Date.parse(range.to)).toBeLessThan(Date.now() - 29 * 24 * 3_600_000);
        await waitFor(() =>
            expect(screen.getAllByRole('button', { name: 'Show puzzles' })).toHaveLength(2),
        );
    });

    it('shows the tactics rating and what each puzzle did to it', async () => {
        const scored = {
            ...attempts[0],
            scoring: {
                accuracy: 1,
                speed: 1,
                score: 1,
                thinkingMs: 2000,
                counted: true,
                puzzleRating: 850,
                ratingBefore: 1500,
                ratingAfter: 1506.4,
                delta: 6.4,
            },
        };
        client.getPuzzleStats.mockResolvedValue({
            ...statsFromAttempts([scored]),
            rating: { rating: 1506.4, rd: 280, count: 1 },
        });
        client.getPuzzleRuns.mockResolvedValue({
            sessions: groupIntoSessions([scored]),
            attempts: [scored],
        });
        render(<PuzzleStatsTab username='kostya' />);
        expect(await screen.findByText('Tactics rating')).toBeInTheDocument();
        expect(screen.getByText('1506')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Show puzzles' }));
        expect(screen.getByText('+6.4')).toBeInTheDocument();
    });

    it('shows no rating tile for a member without a rating yet', async () => {
        client.getPuzzleStats.mockResolvedValue(statsFromAttempts(attempts));
        client.getPuzzleRuns.mockResolvedValue({ sessions: groupIntoSessions(attempts), attempts });
        render(<PuzzleStatsTab username='kostya' />);
        await screen.findByText('Recent sessions');
        expect(screen.queryByText('Tactics rating')).not.toBeInTheDocument();
    });
});
