import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { defaultTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import {
    AttemptSubmission,
    PuzzleAttempt,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PuzzleTrainerPage } from './PuzzleTrainerPage';
import { PuzzlebaseClient } from './puzzlebaseClient';

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({
        user: { ratingSystem: 'LICHESS', ratings: { LICHESS: { currentRating: 1500 } } },
    }),
}));

// The real trainer needs a board. This stand-in lets a test finish a puzzle or ask to train again.
vi.mock('../tactics/TacticsTrainerPage', () => ({
    TacticsTrainerPage: (props: {
        puzzles: { id: string }[];
        autoStart?: boolean;
        showRating?: boolean;
        timeLimitSeconds?: number;
        endless?: boolean;
        onPuzzleFinished?: (attempt: AttemptSubmission) => void;
        renderPuzzleDone?: (puzzle: { id: string }) => React.ReactNode;
        onTrainAgain?: () => void;
    }) => (
        <div>
            <div data-testid='trainer'>
                {props.puzzles.map((p) => p.id).join(',')}|{String(props.autoStart)}|
                {String(props.showRating)}
            </div>
            <div data-testid='done'>{props.renderPuzzleDone?.({ id: '001' })}</div>
            <div data-testid='limit'>
                {String(props.timeLimitSeconds)}|{String(props.endless)}
            </div>
            <button
                onClick={() =>
                    props.onPuzzleFinished?.({
                        puzzleId: props.puzzles[0].id,
                        startedAt: '2026-09-29T10:00:00.000Z',
                        finishedAt: '2026-09-29T10:01:00.000Z',
                        abandoned: false,
                        moves: [],
                    })
                }
            >
                finish puzzle
            </button>
            <button onClick={props.onTrainAgain}>train again</button>
        </div>
    ),
}));

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const puzzle = (id: string): PuzzlebasePuzzle => ({
    id,
    fen: FEN,
    solutionPgn: `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`,
    annotator: 'a',
    annotatorDisplayName: 'A',
    rating: 1500,
    buckets: [],
    themes: [],
    createdAt: 'T0',
    updatedAt: 'T0',
});

function setup(overrides: Partial<PuzzlebaseClient> = {}) {
    const train = vi.fn(() => Promise.resolve([puzzle('001'), puzzle('002')]));
    const submitAttempt = vi.fn(() => Promise.resolve({} as never));
    const getTaxonomy = vi.fn(() => Promise.resolve(defaultTaxonomy()));
    const client = {
        train,
        submitAttempt,
        getTaxonomy,
        ...overrides,
    } as unknown as PuzzlebaseClient;
    render(<PuzzleTrainerPage client={client} />);
    return { train, submitAttempt, getTaxonomy };
}

const start = () => fireEvent.click(screen.getByRole('button', { name: 'Start Training' }));

async function chooseFocus(label: string) {
    const input = screen.getByLabelText('Themes');
    fireEvent.mouseDown(input);
    fireEvent.click(await screen.findByRole('option', { name: label }));
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('PuzzleTrainerPage while training is not open', () => {
    it('says so instead of offering to start', async () => {
        setup({ getStatus: vi.fn(() => Promise.resolve({ canTrain: false })) as never });
        expect(await screen.findByText(/not open for training yet/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Start Training' })).toBeNull();
    });
});

describe('PuzzleTrainerPage setup', () => {
    it('starts with all ratings, which the member can change', () => {
        setup();
        expect(screen.getByText('All ratings', { selector: 'h6' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Around my rating' })).toBeTruthy();
    });

    it('shows which rating range is in use', () => {
        setup();
        const all = () => screen.getByRole('button', { name: 'All ratings' });
        const around = () => screen.getByRole('button', { name: 'Around my rating' });
        expect(all().getAttribute('aria-pressed')).toBe('true');
        expect(around().getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(around());
        expect(around().getAttribute('aria-pressed')).toBe('true');
        expect(all().getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(all());
        expect(all().getAttribute('aria-pressed')).toBe('true');
    });

    it('links to past runs under the Start Training button', () => {
        setup();
        const link = screen.getByRole('link', { name: 'View past runs' });
        expect(link.getAttribute('href')).toBe('/puzzles/train/history');
    });

    it('asks for tactics of any rating when started without changing anything', async () => {
        const { train } = setup();
        expect(screen.getByRole('button', { name: 'Tactics' }).getAttribute('aria-pressed')).toBe(
            'true',
        );
        start();
        await waitFor(() => expect(train).toHaveBeenCalled());
        expect(train).toHaveBeenCalledWith({ count: 15, types: 'Tactics', exclude: [] });
    });

    it('has five boxes: tactics is on, and so is every phase of the game', () => {
        setup();
        const on = (name: string) =>
            screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true';
        expect(on('Tactics')).toBe(true);
        expect(on('Strategy')).toBe(false);
        expect(['Opening', 'Middlegame', 'Endgame'].every(on)).toBe(true);
        expect(screen.queryByRole('button', { name: 'Mixed' })).toBeNull();
    });

    it('trains on tactics, strategy, or both', async () => {
        const { train } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Strategy' }));
        fireEvent.click(screen.getByRole('button', { name: 'Tactics' }));
        start();
        await waitFor(() => expect(train).toHaveBeenCalledTimes(1));
        expect(train).toHaveBeenLastCalledWith(expect.objectContaining({ types: 'Strategy' }));

        cleanup();
        const both = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Strategy' }));
        start();
        await waitFor(() => expect(both.train).toHaveBeenCalled());
        expect((both.train.mock.calls as unknown[][])[0][0]).not.toHaveProperty('types');
    });

    it('trains only on the phases of the game that are on', async () => {
        const { train } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Opening' }));
        start();
        await waitFor(() => expect(train).toHaveBeenCalled());
        expect(train).toHaveBeenCalledWith(
            expect.objectContaining({ types: 'Tactics', phases: 'Middlegame,Endgame' }),
        );
    });

    it('never turns off the last type or the last phase', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'Tactics' }));
        expect(screen.getByRole('button', { name: 'Tactics' }).getAttribute('aria-pressed')).toBe(
            'true',
        );
        for (const phase of ['Opening', 'Middlegame', 'Endgame']) {
            fireEvent.click(screen.getByRole('button', { name: phase }));
        }
        expect(screen.getByRole('button', { name: 'Endgame' }).getAttribute('aria-pressed')).toBe(
            'true',
        );
    });

    it('puts the themes menu above the puzzle rating', () => {
        setup();
        const focus = screen.getByLabelText('Themes');
        const rating = screen.getByText('Puzzle rating');
        expect(
            focus.compareDocumentPosition(rating) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('can narrow the range to around the member’s own rating (1500)', async () => {
        const { train } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Around my rating' }));
        expect(screen.getByText('1300–1700')).toBeTruthy();
        start();
        await waitFor(() => expect(train).toHaveBeenCalled());
        expect(train).toHaveBeenCalledWith(
            expect.objectContaining({ minRating: 1300, maxRating: 1700 }),
        );
    });

    it('goes back to all ratings', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'Around my rating' }));
        fireEvent.click(screen.getByRole('button', { name: 'All ratings' }));
        expect(screen.getByText('All ratings', { selector: 'h6' })).toBeTruthy();
    });

    it('lasts 20 minutes unless the member chooses another length', async () => {
        setup();
        start();
        await screen.findByTestId('trainer');
        expect(screen.getByTestId('limit').textContent).toBe('1200|true');
    });

    it('lets the member choose a number of minutes', async () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: '30 min' }));
        start();
        await screen.findByTestId('trainer');
        expect(screen.getByTestId('limit').textContent).toBe('1800|true');
    });

    it('lets the member train with no time limit', async () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'Unlimited' }));
        start();
        await screen.findByTestId('trainer');
        expect(screen.getByTestId('limit').textContent).toBe('undefined|true');
    });

    it('lets the member focus on a theme', async () => {
        const { train } = setup();
        await waitFor(() => expect(screen.getByLabelText('Themes')).toBeTruthy());
        await chooseFocus('Fork');
        start();
        await waitFor(() => expect(train).toHaveBeenCalled());
        expect(train).toHaveBeenCalledWith(
            expect.objectContaining({ theme: 'Fork', types: 'Tactics' }),
        );
    });

    it('still works if the list of themes cannot be loaded', async () => {
        const { train } = setup({ getTaxonomy: () => Promise.reject(new Error('down')) });
        start();
        await waitFor(() => expect(train).toHaveBeenCalled());
    });
});

describe('PuzzleTrainerPage training', () => {
    it('plays the puzzles it was given, starting at once, without the demo rating', async () => {
        setup();
        start();
        expect((await screen.findByTestId('trainer')).textContent).toBe('001,002|true|false');
    });

    it('says so, and stays on the setup screen, when no puzzles match', async () => {
        const { train } = setup({ train: vi.fn(() => Promise.resolve([])) });
        start();
        expect(await screen.findByText(/No puzzles match/)).toBeTruthy();
        expect(screen.queryByTestId('trainer')).toBeNull();
        expect(train).not.toHaveBeenCalled();
    });

    it('ignores a puzzle whose solution cannot be played', async () => {
        setup({
            train: vi.fn(() =>
                Promise.resolve([{ ...puzzle('001'), solutionPgn: 'broken' }, puzzle('002')]),
            ),
        });
        start();
        expect((await screen.findByTestId('trainer')).textContent).toContain('002|');
        expect(screen.getByTestId('trainer').textContent).not.toContain('001');
    });

    it('explains why puzzles could not be fetched', async () => {
        setup({
            train: vi.fn(() =>
                Promise.reject(
                    Object.assign(new Error('x'), {
                        response: { data: { message: 'Sign in first' } },
                    }),
                ),
            ),
        });
        start();
        expect(await screen.findByText('Sign in first')).toBeTruthy();
    });

    it('goes back to choosing when the member wants to train again', async () => {
        setup();
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'train again' }));
        expect(await screen.findByRole('button', { name: 'Start Training' })).toBeTruthy();
    });

    it('does not offer puzzles again that were just played', async () => {
        const { train } = setup();
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'train again' }));
        start();
        await waitFor(() => expect(train).toHaveBeenCalledTimes(2));
        expect(train).toHaveBeenLastCalledWith(
            expect.objectContaining({ exclude: ['001', '002'] }),
        );
    });

    it('lets puzzles repeat, and says so, once everything that matches has been played', async () => {
        const train = vi
            .fn()
            .mockResolvedValueOnce([puzzle('001')])
            .mockResolvedValueOnce([]) // everything matching was played...
            .mockResolvedValueOnce([puzzle('001')]); // ...so ask again allowing repeats
        setup({ train });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'train again' }));
        start();

        expect(await screen.findByText(/some will repeat/)).toBeTruthy();
        expect(train).toHaveBeenCalledTimes(3);
        expect(train.mock.calls[2][0]).not.toHaveProperty('exclude');
    });
});

describe('PuzzleTrainerPage fetching more', () => {
    it('adds more puzzles as the member gets through the ones they have', async () => {
        const train = vi
            .fn()
            .mockResolvedValueOnce([puzzle('001'), puzzle('002')])
            .mockResolvedValueOnce([puzzle('003'), puzzle('004')]);
        setup({ train });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));

        await waitFor(() => expect(screen.getByTestId('trainer').textContent).toContain('003'));
        expect(screen.getByTestId('trainer').textContent).toContain('001,002,003,004');
        expect(train).toHaveBeenLastCalledWith(
            expect.objectContaining({ exclude: ['001', '002'] }),
        );
    });

    it('lets puzzles repeat, and says so, when nothing new matches', async () => {
        const train = vi
            .fn()
            .mockResolvedValueOnce([puzzle('001')])
            .mockResolvedValueOnce([]) // nothing new...
            .mockResolvedValueOnce([puzzle('001')]); // ...so allow repeats
        setup({ train });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));

        expect(await screen.findByText(/some will repeat/)).toBeTruthy();
        expect(screen.getByTestId('trainer').textContent).toContain('001,001');
    });

    it('stops asking once there is nothing more to offer', async () => {
        const train = vi
            .fn()
            .mockResolvedValueOnce([puzzle('001')])
            .mockResolvedValue([]);
        setup({ train });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));
        await waitFor(() => expect(train).toHaveBeenCalledTimes(3));
        fireEvent.click(screen.getByRole('button', { name: 'finish puzzle' }));
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(train).toHaveBeenCalledTimes(3);
    });

    it('does not count a puzzle that was left unfinished', async () => {
        const train = vi.fn(() => Promise.resolve([puzzle('001'), puzzle('002')]));
        setup({ train });
        start();
        await screen.findByTestId('trainer');
        expect(train).toHaveBeenCalledTimes(1);
    });
});

describe('PuzzleTrainerPage scoring', () => {
    const scoring = {
        accuracy: 1,
        speed: 1,
        score: 1,
        thinkingMs: 5000,
        counted: true,
        puzzleRating: 1500,
        ratingBefore: 1500,
        ratingAfter: 1512.3,
        delta: 12.3,
    };

    it('shows the rating change once the puzzle has been scored', async () => {
        setup({ submitAttempt: vi.fn(() => Promise.resolve({ scoring } as never)) });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));
        expect(await screen.findByText('1512')).toBeTruthy();
        expect(screen.getByText('+12.3')).toBeTruthy();
    });

    it('shows a placeholder until the server answers', async () => {
        let answer: (value: PuzzleAttempt) => void = () => undefined;
        setup({
            submitAttempt: vi.fn(
                () =>
                    new Promise<PuzzleAttempt>((resolve) => {
                        answer = resolve;
                    }),
            ),
        });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));
        expect(await screen.findByLabelText('Scoring')).toBeTruthy();
        answer({ scoring } as unknown as PuzzleAttempt);
        expect(await screen.findByText('1512')).toBeTruthy();
    });

    it('says the puzzle could not be scored when saving fails twice', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        setup({ submitAttempt: vi.fn(() => Promise.reject(new Error('down'))) });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(await screen.findByText('This puzzle could not be scored.')).toBeTruthy();
    });

    it('shows nothing about scoring before a puzzle has been finished', async () => {
        setup();
        start();
        await screen.findByTestId('trainer');
        expect(screen.queryByLabelText('Scoring')).toBeNull();
        expect(screen.queryByText('Tactics rating')).toBeNull();
    });
});

describe('PuzzleTrainerPage saving', () => {
    it('saves each puzzle as it ends', async () => {
        const { submitAttempt } = setup();
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));
        await waitFor(() => expect(submitAttempt).toHaveBeenCalledTimes(1));
        expect(submitAttempt).toHaveBeenCalledWith(expect.objectContaining({ puzzleId: '001' }));
    });

    it('tries again once if saving fails, and says nothing if that works', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const submitAttempt = vi
            .fn()
            .mockRejectedValueOnce(new Error('blip'))
            .mockResolvedValue({});
        setup({ submitAttempt });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(submitAttempt).toHaveBeenCalledTimes(2);
        expect(screen.queryByText(/could not be saved/)).toBeNull();
    });

    it('tells the member if it still cannot be saved after trying again', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const submitAttempt = vi.fn().mockRejectedValue(
            Object.assign(new Error('x'), {
                response: { data: { message: 'Server is down' } },
            }),
        );
        setup({ submitAttempt });
        start();
        fireEvent.click(await screen.findByRole('button', { name: 'finish puzzle' }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(submitAttempt).toHaveBeenCalledTimes(2);
        expect(
            await screen.findByText(/could not be saved to your stats: Server is down/),
        ).toBeTruthy();
    });
});

beforeEach(() => {
    vi.useRealTimers();
});
