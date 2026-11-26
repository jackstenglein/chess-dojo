import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuzzleVote } from './PuzzleVote';
import { PuzzlebaseClient } from './puzzlebaseClient';

afterEach(cleanup);

function setup(
    vote = vi.fn(() => Promise.resolve({ upvotes: 1, downvotes: 0, vote: 1 as const })),
    initialVote?: 1 | -1,
) {
    const client = { vote } as unknown as PuzzlebaseClient;
    render(<PuzzleVote client={client} puzzleId='007' initialVote={initialVote} />);
    return vote;
}

const up = () => screen.getByRole('button', { name: 'Thumbs up' });
const down = () => screen.getByRole('button', { name: 'Thumbs down' });

describe('PuzzleVote', () => {
    it('sends a thumbs up and shows it at once', async () => {
        const vote = setup();
        fireEvent.click(up());
        expect(up().getAttribute('aria-pressed')).toBe('true');
        await waitFor(() => expect(vote).toHaveBeenCalledWith('007', 1));
    });

    it('moves the vote to the other thumb', () => {
        const vote = setup(undefined, 1);
        expect(up().getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(down());
        expect(down().getAttribute('aria-pressed')).toBe('true');
        expect(up().getAttribute('aria-pressed')).toBe('false');
        expect(vote).toHaveBeenCalledWith('007', -1);
    });

    it('takes the vote back when the same thumb is pressed again', () => {
        const vote = setup(undefined, -1);
        fireEvent.click(down());
        expect(down().getAttribute('aria-pressed')).toBe('false');
        expect(vote).toHaveBeenCalledWith('007', 0);
    });

    it('goes back to how it was when saving fails, and says so', async () => {
        setup(vi.fn(() => Promise.reject(new Error('offline'))));
        fireEvent.click(up());
        expect(await screen.findByText(/Couldn’t save your vote/)).toBeTruthy();
        expect(up().getAttribute('aria-pressed')).toBe('false');
    });
});
