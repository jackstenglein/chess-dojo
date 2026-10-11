import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getProfile = vi.hoisted(() => vi.fn());

vi.mock('@/components/puzzles/base/puzzlebaseClient', () => ({
    getPuzzlebaseClient: () => ({ getProfile }),
}));

import PuzzleContributorChip from './PuzzleContributorChip';

describe('PuzzleContributorChip', () => {
    beforeEach(() => {
        getProfile.mockReset();
    });
    afterEach(cleanup);

    it('shows a badge on a Puzzle Contributor’s profile, linking to the PuzzleBase', async () => {
        getProfile.mockResolvedValue({ isContributor: true, puzzleCount: 12 });
        render(<PuzzleContributorChip username='hellokostya' />);

        const chip = await screen.findByText('Puzzle Contributor');
        expect(chip.closest('a')?.getAttribute('href')).toBe('/puzzles/base');
        expect(getProfile).toHaveBeenCalledWith('hellokostya');
    });

    it('shows nothing on anyone else’s profile', async () => {
        getProfile.mockResolvedValue({ isContributor: false, puzzleCount: 0 });
        const { container } = render(<PuzzleContributorChip username='someone' />);
        await waitFor(() => {
            expect(getProfile).toHaveBeenCalled();
        });
        expect(container.textContent).toBe('');
    });

    it('shows nothing, and does not break the profile, if the lookup fails', async () => {
        getProfile.mockImplementation(() => Promise.reject(new Error('Network down')));
        const { container } = render(<PuzzleContributorChip username='someone' />);
        await waitFor(() => {
            expect(getProfile).toHaveBeenCalled();
        });
        expect(container.textContent).toBe('');
    });

    it('looks up the profile’s own user, again if the profile changes', async () => {
        getProfile.mockResolvedValue({ isContributor: false, puzzleCount: 0 });
        const { rerender } = render(<PuzzleContributorChip username='one' />);
        rerender(<PuzzleContributorChip username='two' />);
        await waitFor(() => {
            expect(getProfile).toHaveBeenCalledWith('two');
        });
        expect(getProfile).toHaveBeenCalledWith('one');
    });
});
