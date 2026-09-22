import { RatingSystem } from '@/database/user';
import { describe, expect, it } from 'vitest';
import {
    aggregateResults,
    toUnifiedFideResults,
    toUnifiedUscfResults,
    UnifiedResult,
} from './results';

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
        expect(toUnifiedUscfResults({ ...uscfSection, fide_matched: true, uscf_only: [] }, '1', 0)).toEqual(
            [],
        );
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
