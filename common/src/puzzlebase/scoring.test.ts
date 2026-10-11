import { describe, expect, it } from 'vitest';
import { countSolverMoves } from './lines';
import { MoveRecord } from './runs';
import {
    accuracyScore,
    applyScore,
    averagesFromSums,
    bandNearRating,
    expectedScore,
    K_PER_RD,
    MIN_ATTEMPTS_FOR_AVERAGE,
    moveCredit,
    rateAttempt,
    ratingBand,
    RD_MIN,
    RD_START,
    replayRatings,
    requiredMovesOf,
    scoreAttempt,
    SLOWEST_RATIO,
    SPEED_FLOOR,
    speedFactor,
    startingRating,
    thinkingMs,
} from './scoring';

const turn = (tries: MoveRecord['tries'], ms = 3000, ply = 0): MoveRecord => ({
    line: 0,
    ply,
    expected: 'Nf7+',
    tries,
    ms,
});
const right = (ms = 3000) => turn([{ move: 'Nf7+', correct: true, ms }], ms);
const wrong = (move = 'Qh5') => ({ move, correct: false, ms: 1000 });

describe('moveCredit', () => {
    it('gives full credit for the right move first time', () => {
        expect(moveCredit(right())).toBe(1);
    });

    it('gives half for the second try', () => {
        expect(moveCredit(turn([wrong(), { move: 'Nf7+', correct: true, ms: 2000 }]))).toBe(0.5);
    });

    it('gives nothing for a move that was shown after two misses', () => {
        const shown = turn([
            wrong(),
            wrong('Qg4'),
            { move: 'Nf7+', correct: true, ms: 4000, revealed: true },
        ]);
        expect(moveCredit(shown)).toBe(0);
    });

    it('gives nothing for a move never found', () => {
        expect(moveCredit(turn([wrong()]))).toBe(0);
    });

    it('does not count an ALT2 nudge against the solver, and still credits what follows', () => {
        const nudged = turn([
            { move: 'Re2', correct: false, alt: 'alt2', ms: 1500 },
            { move: 'Re1+', correct: true, ms: 4000 },
        ]);
        expect(moveCredit(nudged)).toBe(1);
        const nudgedThenMissed = turn([
            { move: 'Re2', correct: false, alt: 'alt2', ms: 1500 },
            wrong(),
            { move: 'Re1+', correct: true, ms: 4000 },
        ]);
        expect(moveCredit(nudgedThenMissed)).toBe(0.5);
    });

    it('gives full credit for an ALT solution, whether they tried again or moved on', () => {
        expect(moveCredit(turn([{ move: 'f7', correct: true, alt: 'alt', ms: 3000 }]))).toBe(1);
        expect(
            moveCredit(
                turn([
                    { move: 'f7', correct: false, alt: 'alt', ms: 3000 },
                    { move: 'Rb8', correct: true, ms: 5000 },
                ]),
            ),
        ).toBe(1);
    });
});

describe('accuracyScore', () => {
    it('averages the turns', () => {
        const attempt = {
            abandoned: false,
            moves: [right(), turn([wrong(), { move: 'x', correct: true, ms: 1 }]), right()],
        };
        expect(accuracyScore(attempt, 3)).toBeCloseTo(2.5 / 3);
    });

    it('counts the turns never reached in a left puzzle as missed', () => {
        expect(accuracyScore({ abandoned: true, moves: [right()] }, 4)).toBe(0.25);
    });

    it('does not let a puzzle with a longer alternate line score above 1', () => {
        expect(accuracyScore({ abandoned: false, moves: [right(), right(), right()] }, 2)).toBe(1);
    });

    it('scores an empty attempt as zero', () => {
        expect(accuracyScore({ abandoned: true, moves: [] }, 3)).toBe(0);
        expect(accuracyScore({ abandoned: false, moves: [] }, 3)).toBe(0);
    });
});

describe('thinking time', () => {
    it('adds up the turns, not the time between puzzles', () => {
        expect(thinkingMs([right(2000), right(5000)])).toBe(7000);
    });
});

describe('speedFactor', () => {
    it('is 1 at the reference time or faster, so speed is never rewarded beyond it', () => {
        expect(speedFactor(5000, 10_000)).toBe(1);
        expect(speedFactor(10_000, 10_000)).toBe(1);
        expect(speedFactor(0, 10_000)).toBe(1);
    });

    it('falls evenly to the floor at four times the reference', () => {
        expect(speedFactor(20_000, 10_000)).toBeCloseTo(0.85);
        expect(speedFactor(40_000, 10_000)).toBeCloseTo(SPEED_FLOOR);
        expect(SLOWEST_RATIO).toBe(4);
    });

    it('never goes below the floor, however long the solver took', () => {
        expect(speedFactor(10 * 60 * 60_000, 10_000)).toBeCloseTo(SPEED_FLOOR);
    });

    it('is ignored for a puzzle that has no reference time yet', () => {
        expect(speedFactor(999_999, undefined)).toBe(1);
        expect(speedFactor(999_999, 0)).toBe(1);
    });
});

describe('scoreAttempt', () => {
    it('is accuracy times speed', () => {
        const result = scoreAttempt(
            { abandoned: false, moves: [right(20_000), right(20_000)] },
            { requiredMoves: 2, referenceMs: 20_000 },
        );
        expect(result.accuracy).toBe(1);
        expect(result.speed).toBeCloseTo(0.85);
        expect(result.score).toBeCloseTo(0.85);
        expect(result.thinkingMs).toBe(40_000);
    });

    it('lets accuracy outweigh speed: a fast miss scores below a slow clean solve', () => {
        const slowClean = scoreAttempt(
            { abandoned: false, moves: [right(60_000)] },
            { requiredMoves: 1, referenceMs: 15_000 },
        );
        const fastSecondTry = scoreAttempt(
            {
                abandoned: false,
                moves: [turn([wrong(), { move: 'x', correct: true, ms: 1 }], 5000)],
            },
            { requiredMoves: 1, referenceMs: 15_000 },
        );
        expect(slowClean.score).toBeCloseTo(0.7);
        expect(fastSecondTry.score).toBeCloseTo(0.5);
        expect(slowClean.score).toBeGreaterThan(fastSecondTry.score);
    });

    it('never scores above 1', () => {
        const result = scoreAttempt(
            { abandoned: false, moves: [right(100)] },
            { requiredMoves: 1, referenceMs: 100_000 },
        );
        expect(result.score).toBe(1);
    });

    it('does not take points for time from a puzzle that was left', () => {
        const result = scoreAttempt(
            { abandoned: true, moves: [right(900_000)] },
            { requiredMoves: 2, referenceMs: 10_000 },
        );
        expect(result.speed).toBe(1);
        expect(result.score).toBe(0.5);
    });
});

describe('countSolverMoves', () => {
    it('counts the solver’s moves once, even when two lines share them', () => {
        expect(
            countSolverMoves([
                ['Nxf2', 'Kxf2', 'Bxc3'],
                ['Nxf2', 'O-O', 'Nxd1'],
            ]),
        ).toBe(3);
        expect(countSolverMoves([['Bxg6', 'fxg6', 'Qh6']])).toBe(2);
        expect(countSolverMoves([['Re1+']])).toBe(1);
    });
});

describe('startingRating', () => {
    it('starts from the rating the member already has, very uncertain', () => {
        expect(startingRating(2340.4)).toEqual({ rating: 2340, rd: RD_START, count: 0 });
    });

    it('has a default for someone with no rating', () => {
        expect(startingRating(undefined).rating).toBe(1000);
        expect(startingRating(0).rating).toBe(1000);
    });
});

describe('applyScore', () => {
    const member = { rating: 1500, rd: 300, count: 0 };

    it('expects 0.5 against a puzzle at the member’s own rating', () => {
        expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
        expect(expectedScore(1900, 1500)).toBeGreaterThan(0.9);
        expect(expectedScore(1100, 1500)).toBeLessThan(0.1);
    });

    it('does not move the rating when the member scores what was expected', () => {
        const change = applyScore(member, 1500, 0.5);
        expect(change.delta).toBe(0);
    });

    it('moves up for beating the expectation and down for missing it', () => {
        expect(applyScore(member, 1500, 1).delta).toBeGreaterThan(0);
        expect(applyScore(member, 1500, 0).delta).toBeLessThan(0);
    });

    it('rewards solving a hard puzzle more than an easy one', () => {
        expect(applyScore(member, 1900, 1).delta).toBeGreaterThan(
            applyScore(member, 1100, 1).delta,
        );
    });

    it('costs more to miss an easy puzzle than a hard one', () => {
        expect(applyScore(member, 1100, 0).delta).toBeLessThan(applyScore(member, 1900, 0).delta);
    });

    it('moves a new, uncertain rating more than a settled one', () => {
        const settled = { rating: 1500, rd: RD_MIN, count: 80 };
        expect(Math.abs(applyScore(member, 1500, 1).delta)).toBeGreaterThan(
            Math.abs(applyScore(settled, 1500, 1).delta) * 3,
        );
    });

    it('shrinks the uncertainty with every puzzle, down to a floor, and counts it', () => {
        let m = member;
        for (let i = 0; i < 200; i++) m = applyScore(m, 1500, 0.5).after;
        expect(m.rd).toBe(RD_MIN);
        expect(m.count).toBe(200);
    });

    it('moves by at most the step, however surprising the result', () => {
        const change = applyScore(member, 1500, 1);
        expect(change.delta).toBeLessThanOrEqual(member.rd * K_PER_RD);
    });
});

describe('does not inflate', () => {
    /** A small deterministic random number generator. */
    function rng(seed: number) {
        return () => {
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed / 4294967296;
        };
    }

    it('keeps members at their true level when puzzles are rated correctly', () => {
        const random = rng(7);
        const trueLevels = [1000, 1400, 1800, 2200, 2500];
        // Puzzle ratings 800 to 2800 are right: a member at that level averages 0.5.
        const puzzles = Array.from({ length: 105 }, (_, i) => 800 + (2000 * i) / 104);
        const drift: number[] = [];

        for (const level of trueLevels) {
            const finals: number[] = [];
            for (let player = 0; player < 40; player++) {
                let m = startingRating(level);
                const order = [...puzzles].sort(() => random() - 0.5);
                for (const puzzleRating of order) {
                    // The result a real member of this level would get.
                    const score = random() < expectedScore(level, puzzleRating) ? 1 : 0;
                    m = applyScore(m, puzzleRating, score).after;
                }
                finals.push(m.rating);
            }
            drift.push(finals.reduce((a, b) => a + b, 0) / finals.length - level);
        }

        // On average they end where they started, not higher.
        const mean = drift.reduce((a, b) => a + b, 0) / drift.length;
        expect(Math.abs(mean)).toBeLessThan(15);
        for (const d of drift) expect(Math.abs(d)).toBeLessThan(40);
    });

    it('moves a member who is really stronger than their start rating up towards it', () => {
        const random = rng(11);
        const puzzles = Array.from({ length: 105 }, (_, i) => 800 + (2000 * i) / 104);
        let m = startingRating(1800); // declared 1800, really plays like 2300
        for (const puzzleRating of puzzles) {
            const score = random() < expectedScore(2300, puzzleRating) ? 1 : 0;
            m = applyScore(m, puzzleRating, score).after;
        }
        expect(m.rating).toBeGreaterThan(2000);
        expect(m.rating).toBeLessThan(2500);
    });
});

describe('rateAttempt', () => {
    const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
    const solutionPgn = `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`;
    const puzzle = { solutionPgn, rating: 1500, referenceMs: 10_000 };
    const clean = { abandoned: false, moves: [right(10_000)] };

    it('counts the moves a puzzle asks for', () => {
        expect(requiredMovesOf(solutionPgn)).toBe(1);
    });

    it('starts a new member at their Dojo rating and moves it on a first attempt', () => {
        const { scoring, member } = rateAttempt({
            attempt: clean,
            puzzle,
            firstAttempt: true,
            member: undefined,
            anchor: 1500,
        });
        expect(scoring).toMatchObject({
            counted: true,
            accuracy: 1,
            speed: 1,
            score: 1,
            puzzleRating: 1500,
            ratingBefore: 1500,
        });
        expect(scoring.delta).toBeGreaterThan(0);
        expect(scoring.ratingAfter).toBeCloseTo(1500 + (scoring.delta ?? 0), 0);
        expect(member.count).toBe(1);
        expect(member.rating).toBe(scoring.ratingAfter);
    });

    it('scores a repeat attempt but leaves the rating alone', () => {
        const existing = { rating: 1620, rd: 200, count: 12 };
        const { scoring, member } = rateAttempt({
            attempt: clean,
            puzzle,
            firstAttempt: false,
            member: existing,
            anchor: 1500,
        });
        expect(scoring.counted).toBe(false);
        expect(scoring.score).toBe(1);
        expect(scoring.delta).toBeUndefined();
        // The rating is not moved, but it is given, so it can be shown.
        expect(scoring.ratingBefore).toBe(1620);
        expect(scoring.ratingAfter).toBe(1620);
        expect(member).toEqual(existing);
    });

    it('uses the member’s existing rating, not the anchor, once they have one', () => {
        const { scoring } = rateAttempt({
            attempt: clean,
            puzzle,
            firstAttempt: true,
            member: { rating: 1900, rd: 100, count: 40 },
            anchor: 1000,
        });
        expect(scoring.ratingBefore).toBe(1900);
    });

    it('includes the speed factor in the score that moves the rating', () => {
        const slow = { abandoned: false, moves: [right(40_000)] };
        const { scoring } = rateAttempt({
            attempt: slow,
            puzzle,
            firstAttempt: true,
            member: { rating: 1500, rd: 300, count: 0 },
            anchor: undefined,
        });
        expect(scoring.speed).toBeCloseTo(0.7);
        expect(scoring.score).toBeCloseTo(0.7);
    });
});

describe('replayRatings', () => {
    const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
    const solutionPgn = `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`;
    const attemptAt = (puzzleId: string, finishedAt: string, ok = true) => ({
        puzzleId,
        finishedAt,
        abandoned: false,
        moves: [
            ok
                ? right(2000)
                : turn([
                      { move: 'Qh5', correct: false, ms: 1000 },
                      { move: 'Nf7+', correct: true, ms: 1000 },
                      { move: 'x', correct: true, ms: 1, revealed: true },
                  ]),
        ],
    });
    const puzzles = {
        '001': { solutionPgn, rating: 1200 },
        '002': { solutionPgn, rating: 1800 },
    };

    it('gives the same rating as playing the attempts live', () => {
        const attempts = [
            attemptAt('001', '2026-10-01T10:00:00Z'),
            attemptAt('002', '2026-10-01T10:05:00Z', false),
            attemptAt('001', '2026-10-01T10:10:00Z'),
        ];

        let live: ReturnType<typeof rateAttempt>['member'] | undefined;
        const seen = new Set<string>();
        for (const a of attempts) {
            live = rateAttempt({
                attempt: a,
                puzzle: puzzles[a.puzzleId as '001'],
                firstAttempt: !seen.has(a.puzzleId),
                member: live,
                anchor: 1500,
            }).member;
            seen.add(a.puzzleId);
        }
        const replayed = replayRatings(attempts, puzzles, 1500);
        expect(replayed.member?.rating).toBeCloseTo(live?.rating ?? NaN, 8);
        expect(replayed.member?.count).toBe(2);
        expect(replayed.scored.map((s) => s.scoring.counted)).toEqual([true, true, false]);
    });

    it('puts the attempts in order, whatever order they come in', () => {
        const a = attemptAt('001', '2026-10-01T10:00:00Z');
        const b = attemptAt('002', '2026-10-01T10:05:00Z');
        expect(replayRatings([b, a], puzzles, 1500).member).toEqual(
            replayRatings([a, b], puzzles, 1500).member,
        );
    });

    it('uses the puzzle ratings given, so recalibrating changes the result', () => {
        const attempts = [attemptAt('002', '2026-10-01T10:00:00Z')];
        const hard = replayRatings(attempts, { '002': { solutionPgn, rating: 2200 } }, 1500);
        const easy = replayRatings(attempts, { '002': { solutionPgn, rating: 1200 } }, 1500);
        expect(hard.member?.rating ?? 0).toBeGreaterThan(easy.member?.rating ?? Infinity);
    });

    it('leaves out attempts at puzzles that no longer exist', () => {
        const replayed = replayRatings([attemptAt('999', '2026-10-01T10:00:00Z')], puzzles, 1500);
        expect(replayed.scored).toEqual([]);
        expect(replayed.member).toBeUndefined();
    });

    it('has no rating for a member who has played nothing', () => {
        expect(replayRatings([], puzzles, 1500).member).toBeUndefined();
    });
});

describe('puzzle averages', () => {
    const sums = {
        attempts: 4,
        accuracySum: 3,
        speedSum: 3.2,
        scoreSum: 2.4,
        thinkingMsSum: 120_000,
    };

    it('are the totals divided by the attempts', () => {
        expect(averagesFromSums(sums)).toEqual({
            attempts: 4,
            accuracy: 0.75,
            speed: 0.8,
            score: 0.6,
            thinkingMs: 30_000,
        });
    });

    it('wait until enough people have played the puzzle', () => {
        expect(
            averagesFromSums({ ...sums, attempts: MIN_ATTEMPTS_FOR_AVERAGE - 1 }),
        ).toBeUndefined();
        expect(averagesFromSums({ ...sums, attempts: MIN_ATTEMPTS_FOR_AVERAGE })).toBeDefined();
    });
});

describe('rating bands', () => {
    it('name a rating by the lower end of its band', () => {
        expect(ratingBand(1613)).toBe(1600);
        expect(ratingBand(1600)).toBe(1600);
        expect(ratingBand(1599)).toBe(1550);
    });

    it('are near a member when their middle is within 200 points', () => {
        // Band 1600 has its middle at 1625.
        expect(bandNearRating(1600, 1425)).toBe(true);
        expect(bandNearRating(1600, 1424)).toBe(false);
        expect(bandNearRating(1600, 1825)).toBe(true);
        expect(bandNearRating(1600, 1826)).toBe(false);
    });
});
