import PgnErrorBoundary from '@/games/view/PgnErrorBoundary';
import { renderWithIntl } from '@/i18n/intl.test';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SolveBoard, SolveStatus } from './SolveBoard';

type Handler = (orig: string, dest: string) => void;

/** A stand-in for chessground that keeps the merged config, the way the real one does. */
const fake = vi.hoisted(() => {
    let state: Record<string, unknown> = {};
    const moves: [string, string][] = [];
    const merge = (base: Record<string, unknown>, extend: Record<string, unknown>) => {
        for (const key of Object.keys(extend)) {
            const value = extend[key];
            const target = base[key];
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                !(value instanceof Map) &&
                target &&
                typeof target === 'object'
            ) {
                merge(target as Record<string, unknown>, value as Record<string, unknown>);
            } else {
                base[key] = value;
            }
        }
    };
    const api = {
        set: vi.fn((config: Record<string, unknown>) => merge(state, config)),
        move: vi.fn((orig: string, dest: string) => moves.push([orig, dest])),
        redrawAll: vi.fn(),
        destroy: vi.fn(),
        getFen: vi.fn(() => ''),
        setShapes: vi.fn(),
        setAutoShapes: vi.fn(),
        cancelMove: vi.fn(),
        stop: vi.fn(),
        toggleOrientation: vi.fn(),
    };
    return {
        moves,
        api,
        current: () => state,
        reset: () => {
            state = {};
            moves.length = 0;
            api.set.mockClear();
        },
    };
});

vi.mock('@lichess-org/chessground', () => ({
    Chessground: () => fake.api,
}));

const START = 'r1bq3r/pp1nbkp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 w - - 0 20';
const AFTER_QXE6 = 'r1bq3r/pp1nbkp1/2p1Q2p/8/2BP4/1PN3P1/P4P1P/3R1RK1 b - - 0 20';
const AFTER_KF8 = 'r1bq1k1r/pp1nb1p1/2p1Q2p/8/2BP4/1PN3P1/P4P1P/3R1RK1 w - - 1 21';
const MATE = 'r1bq1k1r/pp1nbQp1/2p4p/8/2BP4/1PN3P1/P4P1P/3R1RK1 b - - 2 21';
const PGN =
    '[Event "Problem 307"]\n[White "Mate in two"]\n[Result "*"]\n' +
    `[FEN "${START}"]\n[SetUp "1"]\n\n` +
    '20. Qxe6+ (20. Qe5 {Threatens nothing; the king slips away.}) Kf8 21. Qf7# *\n';

interface Movable {
    color?: string;
    dests?: Map<string, string[]>;
}

function movable(): Movable {
    return fake.current().movable as Movable;
}

/** Every config set on the board since the last clear, in order. */
function sets(): Record<string, unknown>[] {
    return fake.api.set.mock.calls.map(([config]) => config);
}

const PROMPT: SolveStatus = { kind: 'prompt', toMove: 'white' };

const statuses: SolveStatus[] = [];
const onStatus = vi.fn((status: SolveStatus) => statuses.push(status));
const onComplete = vi.fn();

function mount(pgn: string, playBothSides = false) {
    render(
        <SolveBoard
            pgn={pgn}
            playBothSides={playBothSides}
            onStatus={onStatus}
            onComplete={onComplete}
        />,
    );
}

function play(orig: string, dest: string) {
    const events = movable() as { events?: { after: Handler } };
    act(() => events.events?.after(orig, dest));
}

beforeEach(() => {
    vi.useFakeTimers();
    fake.reset();
    statuses.length = 0;
    onStatus.mockClear();
    onComplete.mockClear();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('SolveBoard', () => {
    beforeEach(() => mount(PGN));

    it('opens on the position, oriented to the side to move, with only that side movable', () => {
        expect(fake.current().fen).toBe(START);
        expect(fake.current().orientation).toBe('white');
        expect(movable().color).toBe('white');
        expect(movable().dests?.get('e2')).toContain('e6');
        expect(statuses).toEqual([PROMPT]);
    });

    it('plays a correct move, then the reply, and hands the move back', async () => {
        play('e2', 'e6');
        expect(statuses).toEqual([PROMPT, { kind: 'correct' }]);
        expect(fake.current().fen).toBe(AFTER_QXE6);
        expect(movable().color).toBeUndefined();

        await act(() => vi.advanceTimersByTimeAsync(300));
        expect(fake.moves).toEqual([['f7', 'f8']]);
        expect(fake.current().fen).toBe(AFTER_KF8);
        expect(movable().color).toBe('white');
        expect(statuses).toEqual([PROMPT, { kind: 'correct' }, PROMPT]);
        expect(onComplete).not.toHaveBeenCalled();
    });

    it("takes back a wrong move with the author's feedback and restores the position", async () => {
        fake.api.set.mockClear();
        play('e2', 'e5');
        expect(statuses).toEqual([
            PROMPT,
            {
                kind: 'wrong',
                toMove: 'white',
                feedback: 'Threatens nothing; the king slips away.',
            },
        ]);
        // The wrong move stays on view until the takeback. Movement is off and the board sets
        // no position.
        expect(sets()).toEqual([{ movable: { color: undefined, dests: undefined } }]);

        await act(() => vi.advanceTimersByTimeAsync(600));
        const restored = sets().find((config) => 'fen' in config);
        expect(restored).toMatchObject({ fen: START, lastMove: [], movable: { color: 'white' } });
        expect((restored?.movable as Movable).dests?.get('e2')).toContain('e6');
        expect(fake.moves).toEqual([]);
    });

    it('reports a move with no authored variation as plainly wrong', () => {
        play('c4', 'e6');
        expect(statuses).toEqual([PROMPT, { kind: 'wrong', toMove: 'white', feedback: undefined }]);
    });

    it('completes on the mating move', async () => {
        play('e2', 'e5');
        await act(() => vi.advanceTimersByTimeAsync(600));
        play('c4', 'e6');
        await act(() => vi.advanceTimersByTimeAsync(600));
        play('e2', 'e6');
        await act(() => vi.advanceTimersByTimeAsync(300));
        play('e6', 'f7');
        expect(fake.current().fen).toBe(MATE);
        expect(statuses.at(-1)).toEqual({ kind: 'complete' });
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(movable().color).toBe('black');
    });
});

describe('SolveBoard playing both sides', () => {
    it('reports correct, then complete, and nothing after two quick moves', async () => {
        mount('[Event "Line"]\n[Result "*"]\n\n1. e4 e5 *', true);
        expect(fake.current().orientation).toBe('white');
        play('e2', 'e4');
        expect(movable().color).toBe('black');
        play('e7', 'e5');
        expect(statuses).toEqual([PROMPT, { kind: 'correct' }, { kind: 'complete' }]);
        expect(onComplete).toHaveBeenCalledTimes(1);

        await act(() => vi.advanceTimersByTimeAsync(1000));
        expect(statuses).toEqual([PROMPT, { kind: 'correct' }, { kind: 'complete' }]);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('hands the move to the other side after a correct move', async () => {
        mount('[Event "Line"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 *', true);
        play('e2', 'e4');
        expect(statuses).toEqual([PROMPT, { kind: 'correct' }]);
        await act(() => vi.advanceTimersByTimeAsync(300));
        expect(statuses).toEqual([
            PROMPT,
            { kind: 'correct' },
            { kind: 'prompt', toMove: 'black' },
        ]);
        expect(movable().color).toBe('black');
        expect(fake.moves).toEqual([]);
    });
});

describe('SolveBoard with an optional tail', () => {
    it('completes on a move carrying the optional NAG and then explores freely', () => {
        mount(PGN.replace('20. Qxe6+', '20. Qxe6+ $10'));
        play('e2', 'e6');
        expect(statuses).toEqual([PROMPT, { kind: 'complete' }]);
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(fake.current().fen).toBe(AFTER_QXE6);
        expect(movable().color).toBe('black');

        onStatus.mockClear();
        play('f7', 'f8');
        expect(fake.current().fen).toBe(AFTER_KF8);
        expect(onStatus).not.toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});

describe('SolveBoard with a malformed PGN', () => {
    const bad = PGN.replace('21. Qf7# *', '(21. Qf7# *');

    it('throws out of the board on mount, and PgnErrorBoundary shows its fallback instead', () => {
        expect(() => mount(bad)).toThrow('end of input');
        cleanup();

        renderWithIntl(
            <PgnErrorBoundary pgn={bad}>
                <SolveBoard
                    pgn={bad}
                    playBothSides={false}
                    onStatus={onStatus}
                    onComplete={onComplete}
                />
            </PgnErrorBoundary>,
        );
        expect(screen.getByText('Invalid PGN')).toBeVisible();
        expect(screen.queryByTestId('solve-board')).toBeNull();
    });
});
