import { ContributorStatusResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuzzlebaseGate } from './PuzzlebaseGate';
import { PuzzlebaseClient } from './puzzlebaseClient';

const contributorRecord = (status: 'PENDING' | 'APPROVED') => ({
    username: 'kostya',
    displayName: 'Kostya',
    status,
    puzzleCount: 0,
    createdAt: 'T0',
});

function clientWith(
    status: ContributorStatusResponse,
    overrides: Partial<PuzzlebaseClient> = {},
): PuzzlebaseClient {
    return {
        getStatus: vi.fn(() => Promise.resolve(status)),
        apply: vi.fn(() => Promise.resolve(contributorRecord('PENDING'))),
        ...overrides,
    } as unknown as PuzzlebaseClient;
}

function renderGate(client: PuzzlebaseClient) {
    return render(<PuzzlebaseGate client={client}>{() => <div>The puzzles</div>}</PuzzlebaseGate>);
}

afterEach(cleanup);

describe('PuzzlebaseGate', () => {
    it('shows a Puzzle Contributor the puzzlebase', async () => {
        renderGate(clientWith({ canContribute: true, canTrain: true, isAdmin: false }));
        expect(await screen.findByText('The puzzles')).toBeTruthy();
    });

    it('shows an admin the puzzlebase', async () => {
        renderGate(clientWith({ canContribute: true, canTrain: true, isAdmin: true }));
        expect(await screen.findByText('The puzzles')).toBeTruthy();
    });

    it('shows everyone else only the title, instructions and a big apply button', async () => {
        renderGate(clientWith({ canContribute: false, canTrain: false, isAdmin: false }));

        expect(await screen.findByText('Dojo PuzzleBase')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Apply to be a Puzzle Contributor' }),
        ).toBeTruthy();
        expect(screen.getByText(/A Dojo admin will review your application/)).toBeTruthy();
        expect(screen.queryByText('The puzzles')).toBeNull();
    });

    it('does not load any puzzles for someone who is not a contributor', async () => {
        const getStatus = vi.fn(() =>
            Promise.resolve({ canContribute: false, canTrain: false, isAdmin: false }),
        );
        const client = clientWith(
            { canContribute: false, canTrain: false, isAdmin: false },
            { getStatus },
        );
        renderGate(client);
        await screen.findByText('Dojo PuzzleBase');
        expect(getStatus).toHaveBeenCalledTimes(1);
        // The gate never even asks for puzzles.
        expect(Object.keys(client)).not.toContain('listPuzzles');
    });

    it('says the application was received after applying', async () => {
        const apply = vi.fn(() => Promise.resolve(contributorRecord('PENDING')));
        renderGate(
            clientWith({ canContribute: false, canTrain: false, isAdmin: false }, { apply }),
        );

        fireEvent.click(
            await screen.findByRole('button', { name: 'Apply to be a Puzzle Contributor' }),
        );

        expect(apply).toHaveBeenCalledTimes(1);
        expect(await screen.findByText('Application received')).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Apply to be a Puzzle Contributor' }),
        ).toBeNull();
    });

    it('shows a pending applicant that the application is waiting, with no apply button', async () => {
        renderGate(
            clientWith({
                canContribute: false,
                canTrain: false,
                isAdmin: false,
                contributor: contributorRecord('PENDING'),
            }),
        );
        expect(await screen.findByText('Application received')).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Apply to be a Puzzle Contributor' }),
        ).toBeNull();
    });

    it('lets an applicant check again and get in once approved', async () => {
        const getStatus = vi
            .fn()
            .mockResolvedValueOnce({
                canContribute: false,
                canTrain: false,
                isAdmin: false,
                contributor: contributorRecord('PENDING'),
            })
            .mockResolvedValueOnce({
                canContribute: true,
                canTrain: true,
                isAdmin: false,
                contributor: contributorRecord('APPROVED'),
            });
        renderGate(
            clientWith({ canContribute: false, canTrain: false, isAdmin: false }, { getStatus }),
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
        expect(await screen.findByText('The puzzles')).toBeTruthy();
    });

    it('explains when applying fails', async () => {
        const apply = vi.fn().mockRejectedValue({ response: { data: { message: 'Try later' } } });
        renderGate(
            clientWith({ canContribute: false, canTrain: false, isAdmin: false }, { apply }),
        );

        fireEvent.click(
            await screen.findByRole('button', { name: 'Apply to be a Puzzle Contributor' }),
        );
        expect(await screen.findByText('Try later')).toBeTruthy();
        // They can try again.
        expect(
            screen.getByRole('button', { name: 'Apply to be a Puzzle Contributor' }),
        ).toBeTruthy();
    });

    it('offers to try again when the status cannot be loaded', async () => {
        const getStatus = vi
            .fn()
            .mockRejectedValueOnce(new Error('Network down'))
            .mockResolvedValue({ canContribute: true, canTrain: true, isAdmin: false });
        renderGate(
            clientWith({ canContribute: true, canTrain: true, isAdmin: false }, { getStatus }),
        );

        expect(await screen.findByText('Network down')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        await waitFor(() => expect(screen.getByText('The puzzles')).toBeTruthy());
    });
});
