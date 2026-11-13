import { describe, expect, it } from 'vitest';
import { BF_OFFER, BlackFridayOffer, CONTEST, getOfferStatus, getPhase, Results } from './config';
import {
    DECISIVE_SCORES,
    decisiveOptions,
    describePicks,
    Draft,
    findConflict,
    firstDecisiveOptions,
    firstOpenStep,
    formatCountdown,
    formatLockMoment,
    lockDayLabel,
    MAX_POINTS,
    Picks,
    picksSchema,
    scorePicks,
    stepsFor,
    TIED_SCORE,
    toPicks,
    wcEntrySchema,
} from './prediction';

const picks: Picks = {
    winner: 'sindarov',
    tiebreaks: false,
    score: '7.5-5.5',
    decisiveGames: 4,
    firstDecisiveGame: 3,
    game1Moves: 41,
};

describe('which picks can happen together', () => {
    it('knows how many games with a winner each score allows', () => {
        expect(decisiveOptions('7.5-6.5')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
        expect(decisiveOptions('7.5-5.5')).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
        expect(decisiveOptions('7.5-4.5')).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect(decisiveOptions('7.5-3.5+')).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
        expect(decisiveOptions(TIED_SCORE)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    });

    it('offers "none" as the first win only when every game is drawn', () => {
        expect(firstDecisiveOptions(TIED_SCORE, 0)).toEqual(['none']);
        expect(firstDecisiveOptions(TIED_SCORE, 2)).not.toContain('none');
        // Four wins and seven draws end the match in game 11, so the first win comes by game 8.
        expect(firstDecisiveOptions('7.5-3.5+', 4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('allows every first game up to a latest one, with no gaps', () => {
        for (const score of [...DECISIVE_SCORES, TIED_SCORE]) {
            for (const decisive of decisiveOptions(score)) {
                const games = firstDecisiveOptions(score, decisive).filter(
                    (option) => option !== 'none',
                );
                if (decisive === 0) {
                    expect(games).toEqual([]);
                    continue;
                }
                expect(games.length).toBeGreaterThan(0);
                expect(games).toEqual(games.map((_, index) => index + 1));
            }
        }
    });

    it('accepts a consistent set of picks', () => {
        expect(findConflict(picks)).toBeUndefined();
        expect(picksSchema.safeParse(picks).success).toBe(true);
    });

    it('tells the visitor to raise the count when the score needs more winners', () => {
        const conflict = findConflict({ ...picks, score: '7.5-6.5', decisiveGames: 0 });
        expect(conflict?.step).toBe('decisive');
        expect(conflict?.message).toBe(
            'A 7.5-6.5 finish needs at least 1 game with a winner. Raise this number, or go back and change the score.',
        );
    });

    it('tells the visitor to lower the count when the match is too short for it', () => {
        const conflict = findConflict({ ...picks, score: '7.5-3.5+', decisiveGames: 12 });
        expect(conflict?.step).toBe('decisive');
        expect(conflict?.message).toContain('at most 11 games with a winner');
    });

    it('explains why a 7-7 match has an even number of winners', () => {
        const conflict = findConflict({ tiebreaks: true, decisiveGames: 3 });
        expect(conflict?.step).toBe('decisive');
        expect(conflict?.message).toContain('even');
    });

    it('catches a first win when there are no wins, and the reverse', () => {
        expect(
            findConflict({ tiebreaks: true, decisiveGames: 0, firstDecisiveGame: 2 })?.message,
        ).toContain('there is no first one');
        expect(
            findConflict({ tiebreaks: true, decisiveGames: 4, firstDecisiveGame: 'none' })?.message,
        ).toContain('one of them comes first');
    });

    it('says how early the first win has to come', () => {
        const options = firstDecisiveOptions('7.5-5.5', 6);
        const latest = Math.max(...options.filter((option) => option !== 'none'));
        const conflict = findConflict({
            ...picks,
            decisiveGames: 6,
            firstDecisiveGame: latest + 1,
        });
        expect(conflict?.step).toBe('first');
        expect(conflict?.message).toContain(`the first win comes by game ${latest}`);
    });

    it('rejects inconsistent picks in the schema too', () => {
        expect(picksSchema.safeParse({ ...picks, decisiveGames: 1 }).success).toBe(false);
        expect(picksSchema.safeParse({ ...picks, tiebreaks: true }).success).toBe(false);
        expect(picksSchema.safeParse({ ...picks, game1Moves: 0 }).success).toBe(false);
        expect(picksSchema.safeParse({ ...picks, game1Moves: 201 }).success).toBe(false);
    });
});

describe('the pick flow', () => {
    it('skips the score question after a tiebreak pick', () => {
        expect(stepsFor({ tiebreaks: false })).toContain('score');
        expect(stepsFor({ tiebreaks: true })).not.toContain('score');
    });

    it('finds the first unanswered step', () => {
        expect(firstOpenStep({})).toBe('winner');
        expect(firstOpenStep({ winner: 'gukesh', tiebreaks: true })).toBe('decisive');
        expect(firstOpenStep({ winner: 'gukesh', tiebreaks: false })).toBe('score');
        expect(firstOpenStep(picks)).toBe('email');
    });

    it('fixes the score at 7-7 for a tiebreak pick', () => {
        const draft: Draft = {
            winner: 'gukesh',
            tiebreaks: true,
            score: '7.5-6.5',
            decisiveGames: 2,
            firstDecisiveGame: 5,
            game1Moves: 60,
        };
        expect(toPicks(draft)?.score).toBe(TIED_SCORE);
        expect(toPicks({ winner: 'gukesh' })).toBeUndefined();
    });

    it('describes the five picks for the card', () => {
        expect(describePicks(picks).map((line) => line.value)).toEqual([
            'Sindarov',
            'Classical games',
            '7.5-5.5',
            '4',
            'Game 3',
        ]);
    });
});

describe('scoring', () => {
    const results: Results = {
        winner: 'sindarov',
        tiebreaks: false,
        classicalScore: '8-5',
        classicalGames: 13,
        decisiveGames: 5,
        firstDecisiveGame: 3,
        game1Moves: 38,
        winners: [],
    };

    it('adds up to 16 for a perfect entry', () => {
        expect(MAX_POINTS).toBe(16);
        expect(scorePicks({ ...picks, decisiveGames: 5 }, results)).toBe(16);
    });

    it('counts 8-5 as the 7.5-5.5 pick and gives one point for being off by one', () => {
        expect(scorePicks(picks, results)).toBe(3 + 2 + 5 + 1 + 3);
    });

    it('gives nothing for a miss on every question', () => {
        const miss: Picks = {
            winner: 'gukesh',
            tiebreaks: true,
            score: TIED_SCORE,
            decisiveGames: 0,
            firstDecisiveGame: 'none',
            game1Moves: 20,
        };
        expect(scorePicks(miss, results)).toBe(0);
    });
});

describe('entry schema', () => {
    const entry = { kind: 'prediction', email: 'player@example.com', consent: true, picks };

    it('accepts a prediction and a results sign up', () => {
        expect(wcEntrySchema.safeParse(entry).success).toBe(true);
        expect(
            wcEntrySchema.safeParse({ kind: 'results', email: 'fan@example.com', consent: true })
                .success,
        ).toBe(true);
    });

    it('requires consent, a real email and an empty honeypot', () => {
        expect(wcEntrySchema.safeParse({ ...entry, consent: false }).success).toBe(false);
        expect(wcEntrySchema.safeParse({ ...entry, email: 'nope' }).success).toBe(false);
        expect(wcEntrySchema.safeParse({ ...entry, website: 'x' }).success).toBe(false);
    });

    it('limits the display name', () => {
        expect(wcEntrySchema.safeParse({ ...entry, displayName: 'x'.repeat(31) }).success).toBe(
            false,
        );
    });
});

describe('page state', () => {
    const lockAt = CONTEST.lockAt;

    it('locks at 15:00 Geneva time on November 24, 2026', () => {
        expect(new Date(lockAt).toISOString()).toBe('2026-11-24T14:00:00.000Z');
        expect(formatLockMoment(lockAt, 'Europe/Zurich')).toBe(
            'Tuesday, November 24 at 3:00 PM GMT+1',
        );
    });

    it('is open before the lock, live after it and finished once results are in', () => {
        expect(getPhase(lockAt - 1)).toBe('open');
        expect(getPhase(lockAt)).toBe('live');
        const results: Results = {
            winner: 'gukesh',
            tiebreaks: true,
            classicalScore: '7-7',
            classicalGames: 14,
            decisiveGames: 2,
            firstDecisiveGame: 4,
            game1Moves: 50,
            winners: [],
        };
        expect(getPhase(lockAt - 1, { ...CONTEST, results })).toBe('finished');
    });

    it('ships with the unconfirmed blocks switched off', () => {
        expect(CONTEST.prizes.confirmed).toBe(false);
        expect(CONTEST.senseiPicks).toEqual([]);
        expect(CONTEST.eligibilityConfirmed).toBe(false);
        expect(CONTEST.offer.confirmed).toBe(false);
        expect(CONTEST.results).toBeNull();
        expect(getOfferStatus(Date.parse(BF_OFFER.startsAt) + 1000, true)).toBe('hidden');
    });

    it('shows the offer only when confirmed, coded and inside its window', () => {
        const offer: BlackFridayOffer = { ...BF_OFFER, confirmed: true, promoCode: 'CODE' };
        const starts = Date.parse(offer.startsAt);
        const ends = Date.parse(offer.endsAt);
        const early = Date.parse(offer.earlyAccessStartsAt);

        expect(getOfferStatus(starts - 1, false, offer)).toBe('hidden');
        expect(getOfferStatus(starts, false, offer)).toBe('live');
        expect(getOfferStatus(ends, false, offer)).toBe('hidden');
        expect(getOfferStatus(starts, false, { ...offer, promoCode: ' ' })).toBe('hidden');

        // Entrants only get early access once Kostya confirms it.
        expect(getOfferStatus(early, true, offer)).toBe('hidden');
        const withEarlyAccess = { ...offer, earlyAccessConfirmed: true };
        expect(getOfferStatus(early - 1, true, withEarlyAccess)).toBe('early-access-teaser');
        expect(getOfferStatus(early, true, withEarlyAccess)).toBe('live');
        expect(getOfferStatus(early, false, withEarlyAccess)).toBe('hidden');
    });
});

describe('the clock', () => {
    it('counts down in days until the last day, then in seconds', () => {
        const day = 24 * 60 * 60 * 1000;
        expect(formatCountdown(4 * day + 6 * 3600000 + 12 * 60000)).toBe('4d 06h 12m');
        expect(formatCountdown(6 * 3600000 + 12 * 60000 + 9000)).toBe('06h 12m 09s');
        expect(formatCountdown(-5)).toBe('00h 00m 00s');
    });

    it('names the lock day the way a person would', () => {
        const lockAt = CONTEST.lockAt;
        const day = 24 * 60 * 60 * 1000;
        const zone = 'Europe/Zurich';
        expect(lockDayLabel(lockAt - 11 * day, lockAt, zone)).toBe('November 24');
        expect(lockDayLabel(lockAt - 3 * day, lockAt, zone)).toBe('Tuesday');
        expect(lockDayLabel(lockAt - day, lockAt, zone)).toBe('tomorrow');
        expect(lockDayLabel(lockAt - 3600000, lockAt, zone)).toBe('today');
        // 15:00 in Geneva is already Wednesday in Auckland.
        expect(lockDayLabel(lockAt - 3 * day, lockAt, 'Pacific/Auckland')).toBe('Wednesday');
    });
});
