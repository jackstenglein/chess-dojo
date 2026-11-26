import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeletePuzzleButton } from './DeletePuzzleButton';

afterEach(cleanup);

describe('DeletePuzzleButton', () => {
    it('asks before deleting, and deletes on yes', async () => {
        const onDelete = vi.fn(() => Promise.resolve());
        render(<DeletePuzzleButton puzzleId='007' onDelete={onDelete} />);

        fireEvent.click(screen.getByRole('button', { name: 'Delete puzzle' }));
        expect(screen.getByText('Delete puzzle #007?')).toBeTruthy();
        expect(onDelete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    });

    it('does nothing when the answer is no', () => {
        const onDelete = vi.fn(() => Promise.resolve());
        render(<DeletePuzzleButton puzzleId='007' onDelete={onDelete} variant='icon' />);

        fireEvent.click(screen.getByRole('button', { name: 'Delete puzzle 007' }));
        fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("shows the server's reason when it can't delete", async () => {
        const onDelete = vi.fn(() =>
            Promise.reject(
                Object.assign(new Error('Forbidden'), {
                    response: { data: { message: 'You can only delete puzzles you added.' } },
                }),
            ),
        );
        render(<DeletePuzzleButton puzzleId='007' onDelete={onDelete} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete puzzle' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(await screen.findByText('You can only delete puzzles you added.')).toBeTruthy();
        expect(screen.getByText('Delete puzzle #007?')).toBeTruthy();
    });
});
