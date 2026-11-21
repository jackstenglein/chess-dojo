import { DashboardAttempt } from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SolveStatsPage } from './SolveStatsPage';

const client = vi.hoisted(() => ({ getDashboardAttempts: vi.fn() }));
vi.mock('../PuzzlebaseGate', () => ({
    PuzzlebaseGate: ({ children }: { children: (p: unknown) => React.ReactNode }) =>
        children({ client, status: { canContribute: true, isAdmin: false } }),
}));
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));
// The chart needs a real layout engine. These tests are about the numbers around it.
vi.mock('@mui/x-charts', () => ({ BarChart: () => <div data-testid='chart' /> }));

const finishedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const attempt = (username: string, puzzleId: string, result: string): DashboardAttempt =>
    ({
        username,
        puzzleId,
        startedAt: finishedAt,
        finishedAt,
        moves: [{ line: 0, ply: 0, expected: 'Rd8#', tries: [], ms: 15_000 }],
        summary: { result, moves: 1, movesFirstTry: 1, mistakes: 0, revealed: 0, totalMs: 45_000 },
        fen: '',
        puzzleRating: 1200,
        buckets: [],
        themes: [],
        scoring: {
            accuracy: 1,
            speed: 1,
            score: 0.9,
            thinkingMs: 45_000,
            counted: true,
            puzzleRating: 1200,
            ratingBefore: 1000,
            ratingAfter: 1012,
            delta: 12,
        },
        solver: {
            displayName: username.toUpperCase(),
            cohort: '1000-1100',
            normalizedRating: 1050,
            ratings: { LICHESS: 1400 },
        },
    }) as unknown as DashboardAttempt;

afterEach(cleanup);

describe('SolveStatsPage', () => {
    it('shows the overview, every attempt and each puzzle', async () => {
        client.getDashboardAttempts.mockResolvedValue({
            attempts: [attempt('ann', '001', 'clean'), attempt('bob', '002', 'abandoned')],
            truncated: false,
        });
        render(<SolveStatsPage />);

        // Overview: 2 attempts by 2 solvers on 2 puzzles.
        expect(await screen.findByText('Attempts per day')).toBeTruthy();
        const tile = (label: string) => {
            const box = screen.getByText(label).parentElement;
            if (!box) throw new Error(`No tile for ${label}`);
            return box;
        };
        expect(within(tile('Attempts')).getByText('2')).toBeTruthy();
        expect(within(tile('After 1st move')).getByText('30s')).toBeTruthy();

        fireEvent.click(screen.getByRole('tab', { name: 'Every attempt' }));
        expect(screen.getByText('ANN')).toBeTruthy();
        expect(screen.getAllByText('Lichess 1400')).toHaveLength(2);
        expect(screen.getAllByText('+12')).toHaveLength(2);
        fireEvent.change(screen.getByLabelText('Member, cohort or puzzle #'), {
            target: { value: '#002' },
        });
        expect(screen.queryByText('ANN')).toBeNull();
        expect(screen.getByText('BOB')).toBeTruthy();

        fireEvent.click(screen.getByRole('tab', { name: 'By puzzle' }));
        expect(screen.getByRole('link', { name: '#001' })).toBeTruthy();
        expect(screen.getByRole('link', { name: '#002' })).toBeTruthy();
    });

    it('says when nothing was played', async () => {
        client.getDashboardAttempts.mockResolvedValue({ attempts: [], truncated: false });
        render(<SolveStatsPage />);
        expect(await screen.findByText('No puzzles were played in this range.')).toBeTruthy();
    });

    it('shows an error from the server', async () => {
        client.getDashboardAttempts.mockRejectedValue(new Error('Try again later'));
        render(<SolveStatsPage />);
        expect(await screen.findByText('Try again later')).toBeTruthy();
    });
});
