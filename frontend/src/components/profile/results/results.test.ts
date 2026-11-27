import { ChesscomGame } from '@/api/external/chesscom';
import { LichessGame } from '@/api/external/lichess';
import { RatingSystem } from '@/database/user';
import { describe, expect, it } from 'vitest';
import {
    aggregateResults,
    toUnifiedChesscomResult,
    toUnifiedLichessResult,
    UnifiedResult,
} from './results';

function lichessGame(overrides: Partial<LichessGame>): LichessGame {
    return {
        id: 'abc123',
        status: 'mate',
        speed: 'classical',
        createdAt: 1000,
        lastMoveAt: 2000,
        players: {
            white: { user: { id: 'me', name: 'Me' }, rating: 1500 },
            black: { user: { id: 'them', name: 'Them' }, rating: 1600 },
        },
        ...overrides,
    } as unknown as LichessGame;
}

function chesscomGame(myResult: string, iAmWhite = true): ChesscomGame {
    const me = { username: 'Me', rating: 1400, result: myResult };
    const them = { username: 'Them', rating: 1450, result: 'whatever' };
    return {
        uuid: 'uuid-1',
        url: 'https://www.chess.com/game/live/1',
        end_time: 1700000000,
        time_class: 'rapid',
        white: iAmWhite ? me : them,
        black: iAmWhite ? them : me,
    } as unknown as ChesscomGame;
}

function result(overrides: Partial<UnifiedResult>): UnifiedResult {
    return {
        id: 'r',
        platform: RatingSystem.Lichess,
        url: '',
        date: 0,
        opponent: 'Them',
        color: 'white',
        outcome: 'win',
        timeClass: 'classical',
        ...overrides,
    };
}

describe('toUnifiedLichessResult', () => {
    it('reads the game from the given player’s side', () => {
        const r = toUnifiedLichessResult(lichessGame({ winner: 'white' }), 'Me');
        expect(r).toMatchObject({
            platform: RatingSystem.Lichess,
            url: 'https://lichess.org/abc123',
            date: 2000,
            opponent: 'Them',
            opponentRating: 1600,
            myRating: 1500,
            color: 'white',
            outcome: 'win',
            timeClass: 'classical',
        });
    });

    it('counts a game with no winner as a draw', () => {
        expect(toUnifiedLichessResult(lichessGame({}), 'me')?.outcome).toBe('draw');
    });

    it('leaves out games that never started', () => {
        expect(toUnifiedLichessResult(lichessGame({ status: 'aborted' }), 'me')).toBeUndefined();
        expect(toUnifiedLichessResult(lichessGame({ status: 'noStart' }), 'me')).toBeUndefined();
    });
});

describe('toUnifiedChesscomResult', () => {
    it('reads wins, draws and losses from the given player’s side', () => {
        expect(toUnifiedChesscomResult(chesscomGame('win'), 'me').outcome).toBe('win');
        expect(toUnifiedChesscomResult(chesscomGame('repetition'), 'me').outcome).toBe('draw');
        expect(toUnifiedChesscomResult(chesscomGame('timeout'), 'me').outcome).toBe('loss');
    });

    it('finds the player when they had Black', () => {
        const r = toUnifiedChesscomResult(chesscomGame('win', false), 'ME');
        expect(r).toMatchObject({
            color: 'black',
            opponent: 'Them',
            opponentRating: 1450,
            myRating: 1400,
            date: 1700000000000,
            timeClass: 'rapid',
        });
    });
});

describe('aggregateResults', () => {
    it('totals results overall, by platform and by color', () => {
        const aggregated = aggregateResults([
            result({ outcome: 'win', opponentRating: 1600 }),
            result({ outcome: 'loss', color: 'black', opponentRating: 1500 }),
            result({ outcome: 'draw', platform: RatingSystem.Chesscom, opponentRating: 1700 }),
        ]);
        expect(aggregated.overall).toMatchObject({ games: 3, wins: 1, losses: 1, draws: 1 });
        expect(aggregated.byPlatform[RatingSystem.Lichess]?.games).toBe(2);
        expect(aggregated.byPlatform[RatingSystem.Chesscom]?.draws).toBe(1);
        expect(aggregated.byColor.white.games).toBe(2);
        expect(aggregated.byColor.black.losses).toBe(1);
        expect(aggregated.avgOpponentRating).toBe(1600);
        expect(aggregated.bestWin?.opponentRating).toBe(1600);
    });

    it('finds the longest run of wins', () => {
        const outcomes = ['win', 'win', 'loss', 'win', 'win', 'win', 'draw'] as const;
        const aggregated = aggregateResults(outcomes.map((outcome) => result({ outcome })));
        expect(aggregated.bestWinStreak).toBe(3);
    });

    it('leaves the performance out when no opponent rating is known', () => {
        expect(aggregateResults([result({})]).performance).toBeUndefined();
    });
});
