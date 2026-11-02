import { ChesscomGame } from '@/api/external/chesscom';
import { LichessGame } from '@/api/external/lichess';
import { RatingSystem } from '@/database/user';
import { describe, expect, it } from 'vitest';
import {
    aggregateResults,
    toUnifiedChesscomResult,
    toUnifiedFideResults,
    toUnifiedLichessResult,
    toUnifiedUscfResults,
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

const fideTournament = {
    name: 'Test Open',
    report_url: 'https://ratings.fide.com/report.phtml?event=1&t=0',
    start: '2024-05-24',
    end: '2024-05-27',
    rating_type: 'Standard',
    games: 3,
    score: 2.0,
    rounds: [
        { opp: 'Strong, Opp', color: 'White', rating: 2600, fed: 'USA', score: 1.0, games: 1 },
        { opp: 'Weak, Opp', color: 'Black', rating: 0, fed: 'USA', score: 0.5, games: 1 },
        { opp: 'Multi, Opp', color: '', rating: 2400, fed: 'USA', score: 1.5, games: 2 },
    ],
};

const uscfSection = {
    name: 'Test Section',
    start: '2024-05-24',
    end: '2024-05-27',
    games: 2,
    score: 1.5,
    rounds: [
        { opp: 'KNOWN, PLAYER', color: 'White', score: 1.0, games: 1, system: 'R' },
        { opp: 'MYSTERY, PLAYER', color: '', score: 0.5, games: 1, system: 'B' },
    ],
};

describe('toUnifiedFideResults', () => {
    it('converts single games, skips aggregate rows and unrated opponents', () => {
        const results = toUnifiedFideResults(fideTournament, 0);
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({
            platform: RatingSystem.Fide,
            opponent: 'Strong, Opp',
            opponentRating: 2600,
            color: 'white',
            outcome: 'win',
            timeClass: 'classical',
        });
        expect(results[1].opponentRating).toBeUndefined();
        expect(results[1].outcome).toBe('draw');
        expect(results.map((r) => r.id)).toEqual(['fide-0-0', 'fide-0-1']);
    });
});

describe('toUnifiedUscfResults', () => {
    it('maps systems to time classes and unknown colors', () => {
        const results = toUnifiedUscfResults(uscfSection, '12742780', 3);
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({
            platform: RatingSystem.Uscf,
            color: 'white',
            outcome: 'win',
            timeClass: 'classical',
            url: 'https://ratings.uschess.org/player/12742780',
        });
        expect(results[1].color).toBe('unknown');
        expect(results[1].timeClass).toBe('blitz');
        expect(results[1].opponentRating).toBeUndefined();
    });

    it('skips fully shared sections and keeps only USCF-only games', () => {
        const duped = {
            ...uscfSection,
            fide_matched: true,
            uscf_only: [
                { opp: 'EXTRA, PLAYER', color: 'Black', score: 1.0, games: 1, system: 'R' },
            ],
        };
        const results = toUnifiedUscfResults(duped, '12742780', 0);
        expect(results).toHaveLength(1);
        expect(results[0].opponent).toBe('EXTRA, PLAYER');
        expect(
            toUnifiedUscfResults({ ...uscfSection, fide_matched: true, uscf_only: [] }, '1', 0),
        ).toEqual([]);
    });
});

describe('aggregateResults with OTB platforms', () => {
    const games: UnifiedResult[] = [
        ...toUnifiedFideResults(fideTournament, 0),
        ...toUnifiedUscfResults(uscfSection, '12742780', 0),
    ];

    it('breaks down by platform including FIDE and USCF', () => {
        const agg = aggregateResults(games);
        expect(agg.overall.games).toBe(4);
        expect(agg.byPlatform[RatingSystem.Fide]?.games).toBe(2);
        expect(agg.byPlatform[RatingSystem.Uscf]?.games).toBe(2);
    });

    it('excludes unknown colors from byColor but keeps them overall', () => {
        const agg = aggregateResults(games);
        expect(agg.byColor.white.games).toBe(2);
        expect(agg.byColor.black.games).toBe(1);
        expect(agg.overall.games).toBe(4);
    });

    it('computes best win from rated opponents only', () => {
        const agg = aggregateResults(games);
        expect(agg.bestWin?.opponent).toBe('Strong, Opp');
        expect(agg.bestWin?.opponentRating).toBe(2600);
    });
});
