import { describe, expect, it } from 'vitest';
import {
    addTimeSpent,
    clocksAt,
    formatClock,
    formatSpent,
    parseGamePgn,
    pickDefaultRound,
    RoundFeed,
    sameUci,
    thinkingSinceFromRound,
} from './lichessFeed';

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

describe('sameUci', () => {
    it('matches the same move', () => {
        expect(sameUci('e2e4', 'e2e4')).toBe(true);
        expect(sameUci('e2e4', 'd2d4')).toBe(false);
        expect(sameUci(undefined, 'e2e4')).toBe(false);
    });

    it('treats both ways of writing castling as one move', () => {
        expect(sameUci('e1h1', 'e1g1')).toBe(true);
        expect(sameUci('e8a8', 'e8c8')).toBe(true);
        expect(sameUci('e1g1', 'e1h1')).toBe(true);
    });
});

describe('thinkingSinceFromRound', () => {
    const now = 1_000_000;

    it('starts the clock from the think time when the JSON is on the latest move', () => {
        const game = { thinkTime: 40, lastMove: 'g1f3', status: '*' };
        expect(thinkingSinceFromRound(game, 'g1f3', now)).toBe(now - 40_000);
    });

    it("ignores a JSON still on the move before, whose think time is the other player's", () => {
        // Black has just played Nc6, but the JSON still shows White's Nf3 and
        // five minutes of Black thinking. Using it would take those five
        // minutes off White's clock.
        const game = { thinkTime: 300, lastMove: 'g1f3', status: '*' };
        expect(thinkingSinceFromRound(game, 'b8c6', now)).toBeUndefined();
    });

    it('ignores a finished game and a JSON with no think time', () => {
        expect(
            thinkingSinceFromRound({ thinkTime: 5, lastMove: 'a2a3', status: '1-0' }, 'a2a3', now),
        ).toBeUndefined();
        expect(
            thinkingSinceFromRound({ lastMove: 'a2a3', status: '*' }, 'a2a3', now),
        ).toBeUndefined();
    });
});
