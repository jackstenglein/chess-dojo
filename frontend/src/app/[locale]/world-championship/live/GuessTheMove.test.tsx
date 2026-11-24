import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GuessPanel, GuessState } from './GuessTheMove';

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
