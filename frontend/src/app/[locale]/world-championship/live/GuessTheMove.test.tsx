import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuessPanel, GuessState, Leaderboard } from './GuessTheMove';

// The avatar loads the user's picture through the app's cache, which a test has not got.
vi.mock('@/profile/Avatar', () => ({ default: () => null }));
vi.mock('@/components/navigation/Link', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

const open = (guessSan?: string): GuessState => ({
    kind: 'open',
    moveLabel: '14. (White to play)',
    guessSan,
    saving: false,
});

const howTo = () => screen.queryByText(/Drag a piece to guess/);

describe('GuessPanel', () => {
    beforeEach(() => localStorage.clear());
    afterEach(cleanup);

    it('explains how to guess to someone who has not guessed yet', () => {
        render(<GuessPanel state={open()} onGoLive={() => undefined} />);
        expect(howTo()).not.toBeNull();
    });

    it('hides the instructions once a guess is in', () => {
        const { rerender } = render(<GuessPanel state={open()} onGoLive={() => undefined} />);
        rerender(<GuessPanel state={open('Rd2')} onGoLive={() => undefined} />);
        expect(howTo()).toBeNull();
        expect(screen.getByText('Your guess: Rd2')).toBeDefined();
    });

    it('keeps them hidden for the next move and the next visit', () => {
        const first = render(<GuessPanel state={open('Rd2')} onGoLive={() => undefined} />);
        first.unmount();
        render(<GuessPanel state={open()} onGoLive={() => undefined} />);
        expect(howTo()).toBeNull();
    });

    it('hides them for someone who guessed earlier in the game', () => {
        render(
            <GuessPanel
                state={open()}
                onGoLive={() => undefined}
                score={{ correct: 1, guessed: 2 }}
            />,
        );
        expect(howTo()).toBeNull();
    });
});

describe('Leaderboard', () => {
    afterEach(cleanup);

    it('shows the names people chose, not their account IDs', () => {
        render(
            <Leaderboard
                gameName='Game 1'
                username='google_222'
                leaderboard={{
                    roundId: 'r1',
                    plies: 10,
                    updatedAt: '2026-11-24T00:00:00Z',
                    entries: [
                        {
                            username: 'google_111',
                            displayName: 'Magnus Fan',
                            correct: 3,
                            guessed: 4,
                        },
                        { username: 'google_222', displayName: '', correct: 1, guessed: 4 },
                    ],
                }}
            />,
        );
        expect(screen.getByText('Magnus Fan')).toBeDefined();
        expect(screen.queryByText('google_111')).toBeNull();
        // Someone with no display name keeps their username.
        expect(screen.getAllByText('google_222').length).toBeGreaterThan(0);
    });
});
