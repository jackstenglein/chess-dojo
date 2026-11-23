import { describe, expect, it } from 'vitest';
import { clocksAt, formatClock, parseGamePgn, pickDefaultRound, RoundFeed } from './lichessFeed';

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
