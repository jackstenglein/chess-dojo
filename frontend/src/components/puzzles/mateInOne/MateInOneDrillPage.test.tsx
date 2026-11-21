import { Chess } from '@jackstenglein/chess';
import { fenToPieceList } from '@jackstenglein/chess-dojo-common/src/mateInOne/fen';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MateInOneDrillPage } from './MateInOneDrillPage';
import practicePuzzles from './practicePuzzles.json';

const mocks = vi.hoisted(() => ({
    getPuzzle: vi.fn(),
    submitSession: vi.fn(),
    updateUser: vi.fn(),
    request: {
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
        isFailure: () => false,
    },
}));

vi.mock('@/api/puzzleApi', () => ({
    getMateInOnePuzzle: mocks.getPuzzle,
    submitMateInOneSession: mocks.submitSession,
}));
vi.mock('@/api/Request', () => ({
    useRequest: () => mocks.request,
    RequestSnackbar: () => null,
}));
vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Loading: 'loading' },
    useAuth: () => ({
        user: { mateInOneRating: 1500 },
        status: 'authenticated',
        updateUser: mocks.updateUser,
    }),
}));
vi.mock('@/board/Board', () => ({ default: () => <div data-testid='feedback-board' /> }));
vi.mock('@/loading/LoadingPage', () => ({ default: () => null }));
vi.mock('@/NotFoundPage', () => ({ default: () => null }));

async function startDrill() {
    fireEvent.click(await screen.findByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'GO!' }));
    await screen.findByRole('textbox');
}

async function selectSet(label: string) {
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Puzzle set' }));
    fireEvent.click(await screen.findByRole('option', { name: label }));
    await screen.findByRole('button', { name: 'Start' });
}

describe('MateInOneDrillPage puzzle sets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Math, 'random').mockReturnValue(0);
        mocks.submitSession.mockResolvedValue({ data: { rating: 1600 } });
        // The black setup move leaves White with Qg7#.
        mocks.getPuzzle.mockResolvedValue({
            data: {
                puzzle: {
                    id: 'rated-puzzle',
                    fen: '8/7k/5KQ1/8/8/8/8/8 b - - 0 1',
                    moves: ['h7h8', 'g6g7'],
                },
            },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it.each(['3', '4'] as const)(
        'shows %s-piece practice positions directly, without a setup move',
        async (set) => {
            render(<MateInOneDrillPage />);
            if (set === '4') await selectSet('4 pieces (practice)');
            await startDrill();

            expect(
                screen.getByText(fenToPieceList(practicePuzzles[set][1].fen), {
                    normalizer: (text) => text,
                }),
            ).toBeInTheDocument();
            expect(screen.queryByText(/Your best rating/)).not.toBeInTheDocument();
            expect(mocks.getPuzzle).not.toHaveBeenCalled();
        },
    );

    it('finishes a practice block without saving a session or updating a rating', async () => {
        render(<MateInOneDrillPage />);
        await startDrill();
        const seen = new Set<string>();
        for (let i = 1; i <= 10; i++) {
            const puzzle = practicePuzzles[3][i];
            await screen.findByText(fenToPieceList(puzzle.fen), { normalizer: (text) => text });
            expect(seen.has(puzzle.id)).toBe(false);
            seen.add(puzzle.id);
            const chess = new Chess({ fen: puzzle.fen });
            const solution = chess.move(puzzle.moves[0]);
            if (!solution) throw new Error(`Invalid puzzle: ${puzzle.id}`);
            fireEvent.change(screen.getByRole('textbox'), { target: { value: solution.san } });
            fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
            if (i < 10) fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
        }
        expect(await screen.findByText('Drill Complete!')).toBeInTheDocument();
        expect(screen.getByText('10 / 10 (100%)')).toBeInTheDocument();
        expect(screen.queryByText('New Personal Best!')).not.toBeInTheDocument();
        expect(mocks.submitSession).not.toHaveBeenCalled();
        expect(mocks.updateUser).not.toHaveBeenCalled();
    });

    it('pauses practice without claiming the unsaved progress was saved', async () => {
        render(<MateInOneDrillPage />);
        await startDrill();
        fireEvent.click(screen.getByRole('button', { name: 'Pause after this problem' }));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
        expect(await screen.findByText('Paused')).toBeInTheDocument();
        expect(screen.queryByText(/already saved/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
        await screen.findByRole('textbox');
        expect(mocks.submitSession).not.toHaveBeenCalled();
    });

    it('keeps the existing API and setup move for the rated drill', async () => {
        render(<MateInOneDrillPage />);
        await selectSet('Rated drill');
        expect(screen.getByText('Your best rating: 1500')).toBeInTheDocument();
        await startDrill();
        expect(
            screen.getByText(fenToPieceList('7k/8/5KQ1/8/8/8/8/8 w - - 1 2'), {
                normalizer: (text) => text,
            }),
        ).toBeInTheDocument();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Qg7#' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        await waitFor(() =>
            expect(mocks.submitSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalPuzzles: 1,
                    correctCount: 1,
                    attempts: [
                        expect.objectContaining({ puzzleId: 'rated-puzzle', correctMove: 'Qg7#' }),
                    ],
                }),
            ),
        );
        expect(mocks.getPuzzle).toHaveBeenCalled();
    });

    it('still submits rated blocks and updates the personal best', async () => {
        render(<MateInOneDrillPage />);
        await selectSet('Rated drill');
        await startDrill();
        for (let i = 0; i < 10; i++) {
            fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Qg7#' } });
            fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
            if (i < 9) fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
        }
        await screen.findByText('Drill Complete!');
        await waitFor(() =>
            expect(mocks.updateUser).toHaveBeenCalledWith({ mateInOneRating: 1600 }),
        );
        expect(mocks.submitSession).toHaveBeenLastCalledWith(
            expect.objectContaining({
                totalPuzzles: 10,
                correctCount: 10,
            }),
        );
    });
});
