import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuzzleRunsPage } from './PuzzleRunsPage';

const auth = vi.hoisted(() => ({ user: undefined as { username: string } | undefined }));
vi.mock('@/auth/Auth', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));
vi.mock('../stats/PuzzleStatsTab', () => ({
    PuzzleStatsTab: ({ username }: { username: string }) => <div>stats for {username}</div>,
}));

afterEach(cleanup);

describe('PuzzleRunsPage', () => {
    it('shows the signed-in member’s own runs, with a way back to training', () => {
        auth.user = { username: 'kostya' };
        render(<PuzzleRunsPage />);
        expect(screen.getByText('Past runs')).toBeTruthy();
        expect(screen.getByText('stats for kostya')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Train' }).getAttribute('href')).toBe(
            '/puzzles/train',
        );
    });

    it('waits for the member to load', () => {
        auth.user = undefined;
        render(<PuzzleRunsPage />);
        expect(screen.queryByText(/stats for/)).toBeNull();
        expect(screen.getByRole('progressbar')).toBeTruthy();
    });
});
