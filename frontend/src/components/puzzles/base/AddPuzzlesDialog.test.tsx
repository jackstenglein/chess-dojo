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

    const upload = async (text: string) => {
        fireEvent.click(screen.getByRole('tab', { name: 'Upload a file' }));
        const file = new File([text], 'my-puzzles.pgn', { type: 'application/x-chess-pgn' });
        fireEvent.change(screen.getByTestId('pgn-file-input'), { target: { files: [file] } });
        expect(await screen.findByText('my-puzzles.pgn')).toBeTruthy();
    };
    const apiError = (status: number, message: string) =>
        Object.assign(new Error(message), { response: { status, data: { message } } });

    it('adds every game of an uploaded PGN file as its own puzzle', async () => {
        const { createPuzzle, onAdded } = setup();
        await upload(`${pgnWith('')}\n\n${pgnWith('')}`);
        expect(screen.getByText('2 games found')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Import 2 puzzles' }));

        expect(await screen.findByText('Import finished')).toBeTruthy();
        expect(createPuzzle).toHaveBeenCalledTimes(2);
        expect(createPuzzle).toHaveBeenCalledWith({
            pgn: pgnWith(''),
            rating: 1000,
            themes: [],
            buckets: [],
        });
        expect(onAdded).toHaveBeenCalledWith([puzzle, puzzle], []);
        // Notes are reported per game.
        expect(screen.getByText(/Game 2/)).toBeTruthy();
    });

    it('skips games that are not puzzles and carries on', async () => {
        const createPuzzle = vi
            .fn()
            .mockRejectedValueOnce(apiError(400, 'This looks like a full game.'))
            .mockResolvedValueOnce({ puzzle, warnings: [] });
        setup({ createPuzzle });
        await upload(`[Event "Full game"]\n\n1. e4 e5 *\n\n${pgnWith('')}`);
        fireEvent.click(screen.getByRole('button', { name: 'Import 2 puzzles' }));

        expect(await screen.findByText(/Added 1 puzzle/)).toBeTruthy();
        expect(screen.getByText('This looks like a full game.')).toBeTruthy();
        expect(screen.getByText(/Game 1: Full game/)).toBeTruthy();
    });

    it('stops at an error that is not about the game, and lists what was not added', async () => {
        const createPuzzle = vi
            .fn()
            .mockResolvedValueOnce({ puzzle, warnings: [] })
            .mockRejectedValueOnce(apiError(500, 'Try again later'));
        setup({ createPuzzle });
        await upload([pgnWith(''), pgnWith(''), pgnWith('')].join('\n\n'));
        fireEvent.click(screen.getByRole('button', { name: 'Import 3 puzzles' }));

        expect(await screen.findByText(/Added 1 puzzle/)).toBeTruthy();
        expect(createPuzzle).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Try again later')).toBeTruthy();
        expect(screen.getByText(/upload stopped at an earlier error/)).toBeTruthy();
    });

    it('takes files of more than 100 games, up to 500', async () => {
        setup();
        await upload(Array.from({ length: 105 }, () => pgnWith('')).join('\n\n'));
        expect(screen.getByText('105 games found')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Import 105 puzzles' })).toBeEnabled();
    });

    it('turns down files of more than 500 games', async () => {
        setup();
        await upload(Array.from({ length: 501 }, () => pgnWith('')).join('\n\n'));
        expect(screen.getByText(/You can upload at most 500 at a time/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Import 501 puzzles' })).toBeDisabled();
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
