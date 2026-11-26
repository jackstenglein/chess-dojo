import { GetPuzzleRushLeaderboardResponse } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuzzleRushLeaderboardView } from './PuzzleRushLeaderboard';

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: undefined }),
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

const messages = {
    puzzles: {
        rush: {
            leaderboardTitle: 'Leaderboard',
            leaderboardAllTime: 'All-time',
            leaderboardMonth: 'This month',
            leaderboardOverall: 'Overall',
            leaderboardCohort: 'Cohort',
            leaderboardMonthCaption: '{month} (UTC)',
            columnRank: 'Rank',
            columnPlayer: 'Player',
            columnScore: 'Score',
            columnRuns: 'Runs',
            leaderboardEmpty: 'No completed runs yet.',
            leaderboardPartial: 'Earlier runs are still being added.',
        },
    },
};

const leaderboard: GetPuzzleRushLeaderboardResponse = {
    month: '2026-11',
    complete: true,
    allTime: [
        {
            username: 'bob',
            displayName: 'Bob',
            cohort: '1400-1500',
            score: 9,
            runs: 4,
            sessionCreatedAt: '2026-10-01T00:00:00.000Z',
        },
        {
            username: 'alice',
            displayName: 'Alice',
            cohort: '1400-1500',
            score: 9,
            runs: 2,
            sessionCreatedAt: '2026-10-02T00:00:00.000Z',
        },
        {
            username: 'cara',
            displayName: 'Cara',
            cohort: '1500-1600',
            score: 5,
            runs: 1,
            sessionCreatedAt: '2026-10-03T00:00:00.000Z',
        },
        {
            username: 'dana',
            displayName: 'Dana',
            score: 3,
            runs: 6,
            sessionCreatedAt: '2026-09-01T00:00:00.000Z',
        },
    ],
    monthly: [
        {
            username: 'cara',
            displayName: 'Cara',
            cohort: '1500-1600',
            score: 5,
            runs: 1,
            sessionCreatedAt: '2026-11-03T00:00:00.000Z',
        },
        {
            username: 'alice',
            displayName: 'Alice',
            cohort: '1400-1500',
            score: 2,
            runs: 3,
            sessionCreatedAt: '2026-11-02T00:00:00.000Z',
        },
    ],
};

afterEach(() => {
    cleanup();
});

function renderLeaderboard(ui: ReactElement) {
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

function cells(name: string): string[] {
    const row = screen.getByRole('link', { name }).closest('tr');
    if (!row) {
        return [];
    }
    return within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent ?? '');
}

describe('PuzzleRushLeaderboardView', () => {
    it('lists all-time scores for the whole Dojo, with ties and completed runs', () => {
        renderLeaderboard(
            <PuzzleRushLeaderboardView
                leaderboard={leaderboard}
                loading={false}
                currentUsername='alice'
            />,
        );

        expect(cells('Bob')).toEqual(['1', 'Bob', '1400-1500', '9', '4']);
        expect(cells('Alice')).toEqual(['1', 'Alice', '1400-1500', '9', '2']);
        expect(cells('Cara')).toEqual(['3', 'Cara', '1500-1600', '5', '1']);
        expect(cells('Dana')).toEqual(['4', 'Dana', '—', '3', '6']);
        expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
            'href',
            '/profile/alice',
        );
        expect(screen.getByRole('link', { name: 'Alice' }).closest('tr')).toHaveClass(
            'Mui-selected',
        );
    });

    it('reranks a cohort and switches to that cohort’s monthly scores', async () => {
        const user = userEvent.setup();
        renderLeaderboard(<PuzzleRushLeaderboardView leaderboard={leaderboard} loading={false} />);

        await user.click(screen.getByRole('combobox', { name: 'Cohort' }));
        await user.click(screen.getByRole('option', { name: '1500-1600' }));

        expect(cells('Cara')).toEqual(['1', 'Cara', '5', '1']);
        expect(screen.queryByRole('link', { name: 'Bob' })).toBeNull();
        expect(screen.queryByRole('columnheader', { name: 'Cohort' })).toBeNull();

        await user.click(screen.getByRole('button', { name: 'This month' }));

        expect(screen.getByText('November 2026 (UTC)')).toBeTruthy();
        expect(cells('Cara')).toEqual(['1', 'Cara', '5', '1']);
        expect(screen.queryByRole('link', { name: 'Alice' })).toBeNull();
    });

    it('shows an empty month and a note while earlier runs are still being added', async () => {
        const user = userEvent.setup();
        renderLeaderboard(
            <PuzzleRushLeaderboardView
                leaderboard={{ ...leaderboard, complete: false, monthly: [] }}
                loading={false}
            />,
        );

        expect(screen.getByText('Earlier runs are still being added.')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'This month' }));
        expect(screen.getByText('No completed runs yet.')).toBeTruthy();

        await user.click(screen.getByRole('combobox', { name: 'Cohort' }));
        await user.click(screen.getByRole('option', { name: '1600-1700' }));
        expect(screen.getByText('No completed runs yet.')).toBeTruthy();
    });
});
