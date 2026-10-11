import { defaultTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddPuzzlesDialog } from './AddPuzzlesDialog';
import { PuzzlebaseClient } from './puzzlebaseClient';

// The real board needs a canvas. These tests are about everything around it.
vi.mock('@/board/Board', () => ({ default: () => <div data-testid='board' /> }));

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const pgnWith = (comment: string) =>
    `[White "A"]\n[Black "B"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n${comment} 1. Rd8#`;

const puzzle = { id: '007', fen: FEN, rating: 1450 } as never;

function setup(overrides: Partial<PuzzlebaseClient> = {}) {
    const createPuzzle = vi.fn(() =>
        Promise.resolve({ puzzle, warnings: ['Unknown tag "Skewr".'] }),
    );
    const importStudy = vi.fn(() =>
        Promise.resolve({
            puzzles: [puzzle],
            skipped: [{ chapter: 3, title: 'A full game', reason: 'This looks like a full game.' }],
            warnings: [
                { chapter: 2, title: 'Fork', message: 'Unknown tag "Skewr". It was left off.' },
            ],
        }),
    );
    const client = { createPuzzle, importStudy, ...overrides } as unknown as PuzzlebaseClient;
    const onAdded = vi.fn();
    const onClose = vi.fn();
    render(
        <AddPuzzlesDialog
            client={client}
            taxonomy={defaultTaxonomy()}
            onClose={onClose}
            onAdded={onAdded}
        />,
    );
    return { createPuzzle, importStudy, onAdded, onClose };
}

const paste = (text: string) =>
    fireEvent.change(screen.getByLabelText('Puzzle PGN'), { target: { value: text } });

afterEach(cleanup);

describe('AddPuzzlesDialog', () => {
    it('will not add anything until there is a valid puzzle', () => {
        setup();
        expect(screen.getByRole('button', { name: 'Add puzzle' }).hasAttribute('disabled')).toBe(
            true,
        );

        paste('[White "A"]\n\n1. e4 e5 2. Nf3 *');
        expect(screen.getByText(/looks like a full game/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Add puzzle' }).hasAttribute('disabled')).toBe(
            true,
        );
    });

    it('shows the tags the PGN asks for and flags one that is not a real theme', () => {
        setup();
        paste(pgnWith('{ tags: back rank mate, Skewr }'));

        expect(screen.getByText('Back rank mate')).toBeTruthy();
        expect(
            screen.getByText('Unknown tag "Skewr". Did you mean "Skewer"? It was left off.'),
        ).toBeTruthy();
        // A typo does not stop the puzzle from being added.
        expect(screen.getByRole('button', { name: 'Add puzzle' }).hasAttribute('disabled')).toBe(
            false,
        );
    });

    it('uses the rating written in the PGN instead of the one typed in', async () => {
        const { createPuzzle } = setup();
        paste(pgnWith('{ rating: 1450 }'));

        expect(screen.getByText(/The PGN sets this puzzle's rating to 1450/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Add puzzle' }));

        await waitFor(() => {
            expect(createPuzzle).toHaveBeenCalledWith(expect.objectContaining({ rating: 1450 }));
        });
    });

    it('uses the typed rating when the PGN has none', async () => {
        const { createPuzzle } = setup();
        paste(pgnWith(''));
        fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '750' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add puzzle' }));

        await waitFor(() => {
            expect(createPuzzle).toHaveBeenCalledWith(expect.objectContaining({ rating: 750 }));
        });
    });

    it('passes on what the server left off, and closes', async () => {
        const { onAdded, onClose } = setup();
        paste(pgnWith('{ tags: Skewr }'));
        fireEvent.click(screen.getByRole('button', { name: 'Add puzzle' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(onAdded).toHaveBeenCalledWith([puzzle], ['Unknown tag "Skewr".']);
    });

    it('explains why adding failed and stays open', async () => {
        const createPuzzle = vi.fn(() =>
            Promise.reject(
                Object.assign(new Error('Request failed'), {
                    response: { data: { message: 'Try again later' } },
                }),
            ),
        );
        const { onClose } = setup({ createPuzzle });
        paste(pgnWith(''));
        fireEvent.click(screen.getByRole('button', { name: 'Add puzzle' }));

        expect(await screen.findByText('Try again later')).toBeTruthy();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('summarizes a study import, including what was left off and skipped', async () => {
        const { onAdded } = setup();
        fireEvent.click(screen.getByRole('tab', { name: 'Lichess study' }));
        fireEvent.change(screen.getByLabelText('Lichess study link'), {
            target: { value: 'https://lichess.org/study/abcd1234' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Import study' }));

        expect(await screen.findByText('Import finished')).toBeTruthy();
        expect(screen.getByText(/Added 1 puzzle/)).toBeTruthy();
        expect(screen.getByText('Unknown tag "Skewr". It was left off.')).toBeTruthy();
        expect(screen.getByText('This looks like a full game.')).toBeTruthy();
        // The page hears about the puzzles but not the notes, which the summary already shows.
        expect(onAdded).toHaveBeenCalledWith([puzzle], []);
    });

    it('offers a guide whose examples fill the field and are accepted as puzzles', async () => {
        const { createPuzzle } = setup();
        fireEvent.click(screen.getByText('How to write a puzzle PGN'));

        const uses = screen.getAllByRole('button', { name: 'Use this example' });
        expect(uses).toHaveLength(3);
        fireEvent.click(uses[2]);

        const field = screen.getByLabelText<HTMLTextAreaElement>('Puzzle PGN');
        expect(field.value).toContain('ALT2');
        expect(screen.getByTestId('board')).toBeInTheDocument();
        const add = screen.getByRole('button', { name: /^add/i });
        expect(add).toBeEnabled();
        fireEvent.click(add);
        await waitFor(() => expect(createPuzzle).toHaveBeenCalled());
    });
});
