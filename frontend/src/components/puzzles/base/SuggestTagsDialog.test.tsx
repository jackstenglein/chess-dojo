import { defaultTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { SuggestTagsButton } from './SuggestTagsButton';
import { SuggestTagsDialog } from './SuggestTagsDialog';

afterEach(cleanup);

function setup(
    suggestTags = vi.fn((..._args: unknown[]) => Promise.resolve({ applied: false })),
    puzzle = {},
) {
    const client = { suggestTags } as unknown as PuzzlebaseClient;
    const onSent = vi.fn();
    const onClose = vi.fn();
    render(
        <SuggestTagsDialog
            client={client}
            taxonomy={defaultTaxonomy()}
            puzzle={{ id: '007', buckets: [], themes: [], ...puzzle }}
            onClose={onClose}
            onSent={onSent}
        />,
    );
    return { suggestTags, onSent, onClose };
}

const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));

describe('SuggestTagsDialog', () => {
    it('cannot be sent until a tag is chosen', () => {
        setup();
        expect(
            screen.getByRole('button', { name: 'Send suggestion' }).hasAttribute('disabled'),
        ).toBe(true);
    });

    it('sends the chosen themes and buckets apart', async () => {
        const { suggestTags, onSent } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Fork' }));
        fireEvent.click(screen.getByRole('button', { name: 'Endgame' }));
        send();
        await waitFor(() => expect(onSent).toHaveBeenCalled());
        expect(suggestTags).toHaveBeenCalledWith('007', {
            buckets: ['Endgame'],
            themes: ['Fork'],
            removeBuckets: [],
            removeThemes: [],
        });
    });

    it('lets a tag be chosen and then unchosen', async () => {
        const { suggestTags } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Fork' }));
        fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
        fireEvent.click(screen.getByRole('button', { name: 'Fork' }));
        send();
        await waitFor(() => expect(suggestTags).toHaveBeenCalled());
        expect(suggestTags).toHaveBeenCalledWith('007', {
            buckets: [],
            themes: ['Pin'],
            removeBuckets: [],
            removeThemes: [],
        });
    });

    it('does not offer tags the puzzle already has', () => {
        setup(undefined, { buckets: ['Tactics'], themes: ['Fork'] });
        expect(screen.getByRole('button', { name: 'Fork' }).getAttribute('aria-disabled')).toBe(
            'true',
        );
        expect(
            screen.getByRole('button', { name: 'Pin' }).getAttribute('aria-disabled'),
        ).toBeNull();
    });

    it('explains a failure and stays open', async () => {
        const { onSent } = setup(
            vi.fn(() =>
                Promise.reject(
                    Object.assign(new Error('x'), {
                        response: { data: { message: 'Sign in first' } },
                    }),
                ),
            ),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
        send();
        expect(await screen.findByText('Sign in first')).toBeTruthy();
        expect(onSent).not.toHaveBeenCalled();
    });
});

describe('SuggestTagsDialog taking tags off', () => {
    const tagged = { buckets: ['Tactics'], themes: ['Fork', 'Sacrifice'] };

    it('offers the puzzle’s own tags to remove, and nothing when it has none', () => {
        setup(undefined, tagged);
        expect(screen.getByText('Remove tags')).toBeTruthy();
        for (const name of ['Tactics', 'Fork', 'Sacrifice']) {
            expect(screen.getByRole('button', { name: `Remove ${name}` })).toBeTruthy();
        }
        cleanup();
        setup();
        expect(screen.queryByText('Remove tags')).toBeNull();
    });

    it('can send a suggestion that only takes tags off', async () => {
        const { suggestTags, onSent } = setup(undefined, tagged);
        fireEvent.click(screen.getByRole('button', { name: 'Remove Sacrifice' }));
        send();
        await waitFor(() => expect(onSent).toHaveBeenCalled());
        expect(suggestTags).toHaveBeenCalledWith('007', {
            buckets: [],
            themes: [],
            removeBuckets: [],
            removeThemes: ['Sacrifice'],
        });
    });

    it('sends buckets and themes apart, and can add and remove together', async () => {
        const { suggestTags } = setup(undefined, tagged);
        fireEvent.click(screen.getByRole('button', { name: 'Remove Tactics' }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove Fork' }));
        fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
        send();
        await waitFor(() => expect(suggestTags).toHaveBeenCalled());
        expect(suggestTags).toHaveBeenCalledWith('007', {
            buckets: [],
            themes: ['Pin'],
            removeBuckets: ['Tactics'],
            removeThemes: ['Fork'],
        });
    });

    it('lets a removal be changed back before sending', () => {
        setup(undefined, tagged);
        const chip = screen.getByRole('button', { name: 'Remove Fork' });
        fireEvent.click(chip);
        expect(chip.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(chip);
        expect(chip.getAttribute('aria-pressed')).toBe('false');
        expect(
            screen.getByRole('button', { name: 'Send suggestion' }).getAttribute('disabled'),
        ).not.toBeNull();
    });
});

describe('SuggestTagsButton', () => {
    it('opens the dialog, and thanks the member after they send a suggestion', async () => {
        const suggestTags = vi.fn(() => Promise.resolve({ applied: false }));
        render(
            <SuggestTagsButton
                client={{ suggestTags } as unknown as PuzzlebaseClient}
                taxonomy={defaultTaxonomy()}
                puzzle={{ id: '003' }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Suggest tags' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Skewer' }));
        send();
        expect(await screen.findByText(/A Puzzle Contributor will review/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Suggest tags' })).toBeNull();
    });
});

describe('SuggestTagsButton for a contributor', () => {
    const updated = {
        id: '003',
        buckets: ['Tactics'],
        themes: ['Skewer'],
    } as unknown as import('@jackstenglein/chess-dojo-common/src/puzzlebase/api').PuzzlebasePuzzle;

    function renderButton(onApplied = vi.fn()) {
        const suggestTags = vi.fn(() => Promise.resolve({ applied: true, puzzle: updated }));
        render(
            <SuggestTagsButton
                client={{ suggestTags } as unknown as PuzzlebaseClient}
                taxonomy={defaultTaxonomy()}
                puzzle={{ id: '003' }}
                onApplied={onApplied}
            />,
        );
        return { onApplied };
    }

    it('says the tags are updated and hands back the updated puzzle', async () => {
        const { onApplied } = renderButton();
        fireEvent.click(screen.getByRole('button', { name: 'Suggest tags' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Skewer' }));
        send();
        expect(await screen.findByText('Tags updated.')).toBeTruthy();
        expect(onApplied).toHaveBeenCalledWith(updated);
        expect(screen.queryByText(/will review/)).toBeNull();
    });

    it('keeps the button, so more can be changed', async () => {
        renderButton();
        fireEvent.click(screen.getByRole('button', { name: 'Suggest tags' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Skewer' }));
        send();
        await screen.findByText('Tags updated.');
        expect(screen.getByRole('button', { name: 'Suggest tags' })).toBeTruthy();
    });
});
