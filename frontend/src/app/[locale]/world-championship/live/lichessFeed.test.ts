import { logger } from '@/logging/logger';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    addTimeSpent,
    clocksAt,
    formatClock,
    formatSpent,
    parseGamePgn,
    pickDefaultRound,
    RoundFeed,
    useRoundFeed,
} from './lichessFeed';

vi.mock('@/logging/logger', () => ({ logger: { warn: vi.fn() } }));

/** The shape of a Lichess broadcast PGN, with engine evals and clocks in the comments. */
const PGN = `[Event "FIDE World Chess Championship 2026"]
[White "Sindarov, Javokhir"]
[Black "Gukesh D"]
[Result "*"]
[WhiteElo "2782"]
[WhiteTitle "GM"]
[BlackElo "2710"]
[BlackTitle "GM"]

1. d4 { [%eval 0.15] [%clk 1:59:50] } 1... Nf6 { [%eval 0.27] [%clk 1:58:00] } 2. c4 { [%clk 1:59:20] } *
`;

describe('parseGamePgn', () => {
    it('reads players, moves and clocks', () => {
        const game = parseGamePgn(PGN);
        expect(game.white).toMatchObject({ name: 'Sindarov, Javokhir', title: 'GM', rating: 2782 });
        expect(game.black.name).toBe('Gukesh D');
        expect(game.moves.map((m) => m.san)).toEqual(['d4', 'Nf6', 'c4']);
        expect(game.moves.map((m) => m.uci)).toEqual(['d2d4', 'g8f6', 'c2c4']);
        expect(game.moves.map((m) => m.clock)).toEqual([7190, 7080, 7160]);
        expect(game.result).toBe('*');
    });
});

describe('clocksAt', () => {
    const game = parseGamePgn(PGN);
    const feed: RoundFeed = { status: 'ready', ...game, thinkingSince: 1_000_000 };

    it('shows the clocks after an earlier move without ticking', () => {
        expect(clocksAt(feed, 1, 2_000_000)).toEqual({ white: 7190, black: 7200 });
    });

    it('counts down the side to move at the live position', () => {
        // Black to move after 2. c4, thinking for 65 seconds.
        expect(clocksAt(feed, 3, 1_065_000)).toEqual({
            white: 7160,
            black: 7080 - 65,
            running: 'black',
        });
    });

    it('prefers the Lichess clocks when they match the last move', () => {
        const withLive = { ...feed, liveClocks: { white: 7150, black: 7070, lastMove: 'c2c4' } };
        expect(clocksAt(withLive, 3, 1_000_000).black).toBe(7070);
        const stale = { ...feed, liveClocks: { white: 1, black: 1, lastMove: 'g8f6' } };
        expect(clocksAt(stale, 3, 1_000_000).black).toBe(7080);
    });
});

describe('useRoundFeed clock synchronization', () => {
    const now = 1_000_000;
    const nextPgn = PGN.replace(/\*\s*$/, '2... e6 { [%clk 1:57:50] } *');
    let clockRequests: ((response: Response) => void)[];
    let stream: ReadableStreamDefaultController<Uint8Array> | undefined;
    let initialPgn: string;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(now);
        vi.mocked(logger.warn).mockClear();
        initialPgn = PGN;
        clockRequests = [];
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                stream = controller;
            },
        });
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url.includes('/api/broadcast/-/-/')) {
                    return new Promise<Response>((resolve) => clockRequests.push(resolve));
                }
                if (url.includes('/api/stream/')) {
                    return Promise.resolve(new Response(body));
                }
                return Promise.resolve(new Response(initialPgn));
            }),
        );
    });

    afterEach(() => {
        cleanup();
        stream?.close();
        stream = undefined;
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    async function openFeed(pgn = PGN) {
        initialPgn = pgn;
        const hook = renderHook(() => useRoundFeed('round-id'));
        await waitFor(() => {
            expect(hook.result.current.status).toBe('ready');
            expect(clockRequests).toHaveLength(1);
        });
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
        return hook;
    }

    function snapshot(pgn = PGN, thinkTime = 65) {
        return {
            players: [{ clock: 715000 }, { clock: 707000 }],
            // Independent FEN fixtures, rather than copying the parser's output.
            fen:
                pgn === nextPgn
                    ? 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3'
                    : 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
            lastMove: pgn === nextPgn ? 'e7e6' : 'c2c4',
            thinkTime,
            status: '*',
        };
    }

    function laggingSnapshot() {
        return {
            ...snapshot(),
            fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
            lastMove: 'g8f6',
            thinkTime: 120,
        };
    }

    async function answerClock(index: number, game: ReturnType<typeof snapshot>) {
        await act(async () => {
            clockRequests[index](Response.json({ games: [game] }));
            await vi.advanceTimersByTimeAsync(0);
        });
    }

    async function receiveMove(pgn: string) {
        await act(async () => {
            stream?.enqueue(new TextEncoder().encode(pgn));
            await vi.advanceTimersByTimeAsync(0);
        });
    }

    async function advanceTime(ms: number) {
        await act(async () => {
            await vi.advanceTimersByTimeAsync(ms);
        });
    }

    it('retries a lagging snapshot without needing a new PGN move', async () => {
        const { result } = await openFeed();
        await answerClock(0, laggingSnapshot());
        expect(result.current.thinkingSince).toBe(now);

        await advanceTime(1000);
        expect(clockRequests).toHaveLength(2);
        await answerClock(1, snapshot(PGN, 66));

        expect(result.current.thinkingSince).toBe(now - 65_000);
        expect(clocksAt(result.current, 3, now + 1000).black).toBe(7070 - 66);
        await advanceTime(10_000);
        expect(clockRequests).toHaveLength(2);
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('stops retrying after two retries and keeps the PGN countdown', async () => {
        const { result } = await openFeed();
        const lagging = laggingSnapshot();
        await answerClock(0, lagging);
        await advanceTime(1000);
        await answerClock(1, lagging);
        await advanceTime(2000);
        await answerClock(2, lagging);
        await advanceTime(10_000);

        expect(clockRequests).toHaveLength(3);
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(result.current.thinkingSince).toBe(now);
        expect(clocksAt(result.current, 3, now + 13_000).black).toBe(7080 - 13);
    });

    it('cancels a pending retry when a new move arrives', async () => {
        await openFeed();
        await answerClock(0, laggingSnapshot());
        await receiveMove(nextPgn);
        expect(clockRequests).toHaveLength(2);
        await answerClock(1, snapshot(nextPgn, 0));
        await advanceTime(10_000);
        expect(clockRequests).toHaveLength(2);
    });

    it('cancels pending retries on unmount', async () => {
        const { unmount } = await openFeed();
        await answerClock(0, laggingSnapshot());
        unmount();
        await advanceTime(10_000);
        expect(clockRequests).toHaveLength(1);
    });

    it('cancels pending retries when the game ends', async () => {
        await openFeed();
        await answerClock(0, laggingSnapshot());
        await receiveMove(PGN.replaceAll('"*"', '"1-0"').replace(/\*\s*$/, '1-0'));
        await advanceTime(10_000);
        expect(clockRequests).toHaveLength(1);
    });

    it.each([undefined, 'not-a-fen', 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -'])(
        'retries missing or invalid full FEN metadata: %s',
        async (fen) => {
            const { result } = await openFeed();
            await act(async () => {
                clockRequests[0](Response.json({ games: [{ ...snapshot(), fen }] }));
                await vi.advanceTimersByTimeAsync(0);
            });
            expect(result.current.thinkingSince).toBe(now);
            expect(result.current.liveClocks).toBeUndefined();

            await advanceTime(1000);
            expect(clockRequests).toHaveLength(2);
            await answerClock(1, snapshot());
            expect(result.current.liveClocks).toBeDefined();
        },
    );

    it('does not normalize away the fullmove number of a different turn', async () => {
        const { result } = await openFeed();
        await answerClock(0, {
            ...snapshot(),
            fen: 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 10',
        });
        expect(result.current.thinkingSince).toBe(now);
        expect(result.current.liveClocks).toBeUndefined();
    });

    it('does not immediately retry rate-limited clock requests', async () => {
        const { result } = await openFeed();
        await act(async () => {
            clockRequests[0](new Response('', { status: 429 }));
            await vi.advanceTimersByTimeAsync(0);
        });
        await advanceTime(10_000);

        expect(clockRequests).toHaveLength(1);
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(result.current.thinkingSince).toBe(now);
        expect(result.current.liveClocks).toBeUndefined();
    });

    it('normalizes an irrelevant en-passant target before comparing FENs', async () => {
        const { result } = await openFeed('[Event "Test"]\n[Result "*"]\n\n1. e4 *');
        await answerClock(0, {
            ...snapshot(),
            fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            lastMove: 'e2e4',
        });
        expect(result.current.liveClocks).toEqual({ white: 7150, black: 7070, lastMove: 'e2e4' });
        expect(clocksAt(result.current, 1, now).black).toBe(7070 - 65);
    });

    it('preserves an en-passant target when it changes the legal position', async () => {
        const { result } = await openFeed('[Event "Test"]\n[Result "*"]\n\n1. e4 a6 2. e5 d5 *');
        await answerClock(0, {
            ...snapshot(),
            fen: 'rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3',
            lastMove: 'd7d5',
        });
        expect(result.current.liveClocks).toBeUndefined();

        await advanceTime(1000);
        await answerClock(1, {
            ...snapshot(),
            fen: 'rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
            lastMove: 'd7d5',
        });
        expect(result.current.liveClocks).toEqual({ white: 7150, black: 7070, lastMove: 'd7d5' });
    });

    it('uses the matching position even when Lichess encodes castling differently', async () => {
        const { result } = await openFeed(
            '[Event "Test"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *',
        );
        await answerClock(0, {
            ...snapshot(),
            fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
            lastMove: 'e1h1',
        });

        expect(result.current.liveClocks).toEqual({ white: 7150, black: 7070, lastMove: 'e1g1' });
        expect(clocksAt(result.current, 7, now).black).toBe(7070 - 65);
    });

    it('ignores clock values and thinking time from an older position', async () => {
        const { result } = await openFeed();
        await answerClock(0, laggingSnapshot());

        expect(result.current.thinkingSince).toBe(now);
        expect(result.current.liveClocks).toBeUndefined();
        expect(clocksAt(result.current, 3, now)).toEqual({
            white: 7160,
            black: 7080,
            running: 'black',
        });
    });

    it('synchronizes a matching snapshot and continues counting down the right side', async () => {
        const { result } = await openFeed();
        await answerClock(0, snapshot());

        expect(result.current.thinkingSince).toBe(now - 65_000);
        expect(clocksAt(result.current, 3, now + 5000)).toEqual({
            white: 7150,
            black: 7070 - 70,
            running: 'black',
        });
    });

    it('does not let an older response overwrite the next turn after its clock was synchronized', async () => {
        const { result } = await openFeed();
        await receiveMove(nextPgn);
        expect(clockRequests).toHaveLength(2);
        await answerClock(1, snapshot(nextPgn, 5));
        const synchronized = result.current;

        await answerClock(0, snapshot(PGN, 120));

        expect(result.current).toBe(synchronized);
        expect(clocksAt(result.current, 4, now + 5000)).toEqual({
            white: 7150 - 10,
            black: 7070,
            running: 'white',
        });
    });

    it('rejects a response for an older request even if it reports the latest position', async () => {
        const { result } = await openFeed();
        await receiveMove(nextPgn);
        expect(clockRequests).toHaveLength(2);
        const before = result.current;

        await answerClock(0, snapshot(nextPgn, 120));

        expect(result.current).toBe(before);
        expect(result.current.thinkingSince).toBe(now);
    });

    it('does not restart a finished game when a pending clock response arrives', async () => {
        const { result } = await openFeed();
        await receiveMove(PGN.replaceAll('"*"', '"1-0"').replace(/\*\s*$/, '1-0'));
        expect(result.current.result).toBe('1-0');

        await answerClock(0, snapshot());

        expect(result.current.thinkingSince).toBeUndefined();
        expect(clocksAt(result.current, 3, now + 5000)).toEqual({ white: 7160, black: 7080 });
    });
});

describe('pickDefaultRound', () => {
    const r = (number: number, ongoing: boolean, finished: boolean) => ({
        id: `round00${number}`,
        name: `Game ${number}`,
        number,
        ongoing,
        finished,
    });

    it('opens the live game, else the next one, else the last', () => {
        expect(
            pickDefaultRound([r(1, false, true), r(2, true, false), r(3, false, false)])?.number,
        ).toBe(2);
        expect(pickDefaultRound([r(1, false, true), r(2, false, false)])?.number).toBe(2);
        expect(pickDefaultRound([r(1, false, true), r(2, false, true)])?.number).toBe(2);
    });
});

describe('formatClock', () => {
    it('shows hours only when there are some', () => {
        expect(formatClock(7200)).toBe('2:00:00');
        expect(formatClock(65.9)).toBe('01:05');
    });
});

describe('time spent', () => {
    it('works out each move from the clocks', () => {
        const game = parseGamePgn(PGN);
        // 2:00:00 to 1:59:50, 2:00:00 to 1:58:00, 1:59:50 to 1:59:20.
        expect(game.moves.map((m) => m.spent)).toEqual([10, 120, 30]);
    });

    it('takes the increment and the move 40 bonus back out', () => {
        const at = (ply: number, clock: number) =>
            ({ ply, san: 'x', uci: 'x', from: 'a1', to: 'a2', fen: '', clock }) as const;
        const moves = Array.from({ length: 82 }, (_, i) => at(i + 1, 1000));
        // Move 40 for White (ply 79): 1000 before, 30 minutes added, 2500 after.
        moves[78] = at(79, 2500);
        // Move 41 for White (ply 81): 2500 before, 30 seconds added, 2400 after.
        moves[80] = at(81, 2400);
        const result = addTimeSpent(moves);
        expect(result[78].spent).toBe(1000 + 1800 - 2500);
        expect(result[80].spent).toBe(2500 + 30 - 2400);
    });

    it('formats like 0:30 and 4:23', () => {
        expect(formatSpent(30)).toBe('0:30');
        expect(formatSpent(263)).toBe('4:23');
        expect(formatSpent(3725)).toBe('1:02:05');
    });
});
