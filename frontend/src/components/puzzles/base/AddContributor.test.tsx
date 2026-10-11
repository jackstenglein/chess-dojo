import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddContributor } from './AddContributor';
import { PuzzlebaseClient } from './puzzlebaseClient';

afterEach(cleanup);

const MEMBERS = [
    { username: 'ann', displayName: 'Ann Lee' },
    { username: 'bob', displayName: 'Bob Ray' },
];

function setup(exclude: string[] = []) {
    const searchMembers = vi.fn(() => Promise.resolve(MEMBERS));
    const addContributor = vi.fn((username: string) =>
        Promise.resolve({
            username,
            displayName: 'Ann Lee',
            status: 'APPROVED' as const,
            puzzleCount: 0,
            createdAt: 'T0',
        }),
    );
    const onAdded = vi.fn();
    const client = { searchMembers, addContributor } as unknown as PuzzlebaseClient;
    render(<AddContributor client={client} exclude={exclude} onAdded={onAdded} />);
    return { searchMembers, addContributor, onAdded };
}

const search = (text: string) => {
    const input = screen.getByLabelText('Search members');
    fireEvent.focus(input);
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: text } });
};

describe('AddContributor', () => {
    it('searches as you type and adds the member you pick', async () => {
        const { searchMembers, addContributor, onAdded } = setup();
        expect(screen.getByRole('button', { name: 'Add' }).hasAttribute('disabled')).toBe(true);

        search('an');
        fireEvent.click(await screen.findByText('Ann Lee', {}, { timeout: 3000 }));
        expect(searchMembers).toHaveBeenCalledWith('an');

        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        await waitFor(() => expect(addContributor).toHaveBeenCalledWith('ann'));
        expect(onAdded).toHaveBeenCalledWith(expect.objectContaining({ username: 'ann' }));
        expect(await screen.findByText(/Ann Lee is now a Puzzle Contributor/)).toBeTruthy();
    });

    it('leaves out people who are already contributors', async () => {
        setup(['ann']);
        search('an');
        expect(await screen.findByText('Bob Ray', {}, { timeout: 3000 })).toBeTruthy();
        expect(screen.queryByText('Ann Lee')).toBeNull();
    });

    it('does not search for less than two letters', async () => {
        const { searchMembers } = setup();
        search('a');
        await new Promise((resolve) => setTimeout(resolve, 600));
        expect(searchMembers).not.toHaveBeenCalled();
    });
});
