import { countSolverMoves, linesFromSolution } from './lines';
import type { AttemptSubmission, MoveRecord, TryRecord } from './runs';

/*
 * How a puzzle attempt is scored, and how that moves a member's tactics rating.
 *
 * Score for a puzzle = accuracy x speed, a number from 0 to 1. It is used like a game result in
 * an Elo rating: a member is expected to score a certain amount against a puzzle of a given
 * rating, and their rating moves by how far they land above or below that.
 *
 * Puzzle ratings are fitted, offline, on this same score, so a member at a puzzle's rating
 * averages 0.5 on it. The time penalty is part of that fit, which is why it cannot inflate
 * ratings. Nothing here is a bonus: the score never goes above 1.
 */

/** What each kind of turn earns, from 0 to 1. */
export const MOVE_CREDIT = {
    /** The right move on the first try. A good alternate (ALT, ALT2) first does not change this. */
    firstTry: 1,
    /** The right move on the second try. */
    secondTry: 0.5,
    /** Shown the move after two misses, or never found. */
    missed: 0,
} as const;

/** How slow a solve can be before the speed factor stops falling, as a multiple of the reference. */
export const SLOWEST_RATIO = 4;

/** The lowest the speed factor goes: a very slow, correct solve keeps this much of its score. */
export const SPEED_FLOOR = 0.7;

/** The uncertainty, in rating points, of a member who has not solved anything yet. */
export const RD_START = 300;
/** The uncertainty never falls below this, so a rating can always keep moving. */
export const RD_MIN = 60;
/** Each counted puzzle multiplies the uncertainty by this. */
export const RD_DECAY = 0.96;
/** How much of the uncertainty is the most a single puzzle can move the rating by, per point of surprise. */
export const K_PER_RD = 0.15;
/** The rating given to a member who has no rating to start from. */
export const DEFAULT_START_RATING = 1000;

/** A member's tactics rating. */
export interface MemberRating {
    rating: number;
    /** How uncertain the rating is, in rating points. It starts high and shrinks with every puzzle. */
    rd: number;
    /** How many puzzles have counted towards it. */
    count: number;
}

/** A member who has not solved anything yet, starting from the rating they already have. */
export function startingRating(anchor: number | undefined): MemberRating {
    return {
        rating: anchor && anchor > 0 ? Math.round(anchor) : DEFAULT_START_RATING,
        rd: RD_START,
        count: 0,
    };
}

/** What one turn earned. Alternates that cost nothing (ALT2, or ALT then "try again") are ignored. */
export function moveCredit(move: MoveRecord): number {
    const real = move.tries.filter((t: TryRecord) => !(t.alt !== undefined && !t.correct));
    const [first, second] = real;
    if (first?.correct) return first.revealed ? MOVE_CREDIT.missed : MOVE_CREDIT.firstTry;
    if (second?.correct && !second.revealed) return MOVE_CREDIT.secondTry;
    return MOVE_CREDIT.missed;
}

/**
 * The accuracy of an attempt, from 0 to 1: the average credit over the solver's turns. A puzzle
 * that was left counts the turns never reached as missed.
 * @param requiredMoves How many moves the puzzle asks for.
 */
export function accuracyScore(
    attempt: Pick<AttemptSubmission, 'moves' | 'abandoned'>,
    requiredMoves: number,
): number {
    const turns = attempt.moves.length;
    const total = attempt.abandoned ? Math.max(requiredMoves, turns) : turns;
    if (total === 0) return 0;
    const earned = attempt.moves.reduce((sum, move) => sum + moveCredit(move), 0);
    return earned / total;
}

/** How long the solver spent thinking, in ms: their turns added up, not the time between puzzles. */
export function thinkingMs(moves: MoveRecord[]): number {
    return moves.reduce((sum, move) => sum + move.ms, 0);
}

/**
 * The speed factor, from SPEED_FLOOR to 1. Anyone as fast as the reference time or faster gets 1.
 * Slower solves lose score steadily and evenly, down to the floor at four times the reference.
 * @param referenceMs The time a quick solver takes on this puzzle. Without one, time is not counted.
 */
export function speedFactor(thinking: number, referenceMs: number | undefined): number {
    if (!referenceMs || referenceMs <= 0) return 1;
    const ratio = Math.min(Math.max(thinking / referenceMs, 1), SLOWEST_RATIO);
    const lost = (1 - SPEED_FLOOR) * (Math.log2(ratio) / Math.log2(SLOWEST_RATIO));
    return 1 - lost;
}

/** The score a member is expected to get against a puzzle: 0.5 when their ratings match. */
export function expectedScore(memberRating: number, puzzleRating: number): number {
    return 1 / (1 + Math.pow(10, (puzzleRating - memberRating) / 400));
}

/** How a puzzle was scored, with everything that went into it, so it can be shown and re-run. */
export interface AttemptScore {
    accuracy: number;
    speed: number;
    /** accuracy x speed: the result used for the rating. */
    score: number;
    thinkingMs: number;
    /** The time the speed was judged against, if the puzzle had one. */
    referenceMs?: number;
}

/** Scores an attempt. A left puzzle is not penalised for time. */
export function scoreAttempt(
    attempt: Pick<AttemptSubmission, 'moves' | 'abandoned'>,
    puzzle: { requiredMoves: number; referenceMs?: number },
): AttemptScore {
    const accuracy = accuracyScore(attempt, puzzle.requiredMoves);
    const thinking = thinkingMs(attempt.moves);
    const speed = attempt.abandoned ? 1 : speedFactor(thinking, puzzle.referenceMs);
    return {
        accuracy,
        speed,
        score: accuracy * speed,
        thinkingMs: thinking,
        ...(puzzle.referenceMs ? { referenceMs: puzzle.referenceMs } : {}),
    };
}

/** What counting one puzzle did to a rating. */
export interface RatingChange {
    before: MemberRating;
    after: MemberRating;
    /** The change in rating, to the nearest tenth. */
    delta: number;
    expected: number;
}

/**
 * Moves a member's rating for one puzzle they are seeing for the first time. The size of the move
 * is the surprise (score minus expected) times a step that is large while the rating is still
 * uncertain and small once it has settled.
 */
export function applyScore(
    member: MemberRating,
    puzzleRating: number,
    score: number,
): RatingChange {
    const expected = expectedScore(member.rating, puzzleRating);
    const step = member.rd * K_PER_RD;
    const rating = member.rating + step * (score - expected);
    return {
        before: member,
        after: {
            rating,
            rd: Math.max(RD_MIN, member.rd * RD_DECAY),
            count: member.count + 1,
        },
        delta: Math.round((rating - member.rating) * 10) / 10,
        expected,
    };
}

/** How many first attempts a puzzle needs before its averages are worth showing. */
export const MIN_ATTEMPTS_FOR_AVERAGE = 3;

/** Averages are kept for members of similar strength: totals are split into bands this wide. */
export const RATING_BAND = 50;
/** The averages a member sees are of members rated within this many points of them. */
export const AVERAGE_RANGE = 200;

/** The band a rating falls in, named by its lower end: 1613 is in band 1600. */
export function ratingBand(rating: number): number {
    return Math.floor(rating / RATING_BAND) * RATING_BAND;
}

/** Whether a band is close enough to a member's rating to be in their averages. */
export function bandNearRating(band: number, rating: number): boolean {
    return Math.abs(band + RATING_BAND / 2 - rating) <= AVERAGE_RANGE;
}

/** The totals behind a puzzle's averages: counted attempts at it, added up. */
export interface PuzzleScoreSums {
    attempts: number;
    accuracySum: number;
    speedSum: number;
    scoreSum: number;
    thinkingMsSum: number;
}

/**
 * How members rated near the member do on a puzzle on average: their first attempts, the one just
 * made included.
 */
export interface PuzzleAverages {
    attempts: number;
    accuracy: number;
    speed: number;
    score: number;
    thinkingMs: number;
}

/**
 * Turns a puzzle's totals into averages. Nothing until enough people have played it for an average
 * to mean something.
 */
export function averagesFromSums(sums: PuzzleScoreSums): PuzzleAverages | undefined {
    if (sums.attempts < MIN_ATTEMPTS_FOR_AVERAGE) return undefined;
    return {
        attempts: sums.attempts,
        accuracy: sums.accuracySum / sums.attempts,
        speed: sums.speedSum / sums.attempts,
        score: sums.scoreSum / sums.attempts,
        thinkingMs: sums.thinkingMsSum / sums.attempts,
    };
}

/** How an attempt was scored and what it did to the member's rating, as stored with the attempt. */
export interface AttemptScoring extends AttemptScore {
    /** Whether it counted towards the member's rating. Only a first attempt at a puzzle does. */
    counted: boolean;
    /** The puzzle's rating that the score was measured against. */
    puzzleRating: number;
    /** The rating the member was expected to score against that puzzle. Only if it counted. */
    expected?: number;
    /** The member's rating before the puzzle. For a repeat, which does not move it, their rating. */
    ratingBefore?: number;
    ratingAfter?: number;
    /** The change in rating. Only if it counted. */
    delta?: number;
    /**
     * How members do on this puzzle on average, sent back with a counted attempt once enough people
     * have played it. Not stored with the attempt.
     */
    average?: PuzzleAverages;
}

/** How many moves the solver has to find in a puzzle, from its solution PGN. */
export function requiredMovesOf(solutionPgn: string): number {
    return countSolverMoves(linesFromSolution(solutionPgn).lines);
}

/**
 * Scores an attempt and, if it is the member's first at the puzzle, moves their rating. This is
 * the one place the two are put together, so the server and the preview agree.
 * @param member The member's rating so far, or undefined if they have none yet.
 * @param anchor Their Dojo normalized rating, which a new rating starts from.
 */
export function rateAttempt(input: {
    attempt: Pick<AttemptSubmission, 'moves' | 'abandoned'>;
    puzzle: { solutionPgn: string; rating: number; referenceMs?: number };
    firstAttempt: boolean;
    member: MemberRating | undefined;
    anchor: number | undefined;
}): { scoring: AttemptScoring; member: MemberRating } {
    const { attempt, puzzle, firstAttempt } = input;
    const score = scoreAttempt(attempt, {
        requiredMoves: requiredMovesOf(puzzle.solutionPgn),
        referenceMs: puzzle.referenceMs,
    });
    const before = input.member ?? startingRating(input.anchor);

    if (!firstAttempt) {
        return {
            // The rating is unchanged, but is still given, so it can be shown.
            scoring: {
                ...score,
                counted: false,
                puzzleRating: puzzle.rating,
                ratingBefore: before.rating,
                ratingAfter: before.rating,
            },
            member: before,
        };
    }

    const change = applyScore(before, puzzle.rating, score.score);
    return {
        scoring: {
            ...score,
            counted: true,
            puzzleRating: puzzle.rating,
            expected: change.expected,
            ratingBefore: before.rating,
            ratingAfter: change.after.rating,
            delta: change.delta,
        },
        member: change.after,
    };
}

/** What replaying a member's attempts needs from each one. */
export interface ReplayAttempt {
    puzzleId: string;
    finishedAt: string;
    abandoned: boolean;
    moves: MoveRecord[];
}

/**
 * Works a member's rating out again from their attempts, in the order they happened, against the
 * puzzle ratings as they are now. Use it after puzzle ratings are recalibrated, so a rating
 * reflects the new ratings and not the ones the puzzles had at the time.
 *
 * Only the first attempt at each puzzle counts, as when they were played. Attempts at puzzles that
 * no longer exist are left out.
 * @param anchor The member's Dojo normalized rating, which the rating starts from.
 */
export function replayRatings<T extends ReplayAttempt>(
    attempts: T[],
    puzzles: Record<string, { solutionPgn: string; rating: number; referenceMs?: number }>,
    anchor: number | undefined,
): { member: MemberRating | undefined; scored: { attempt: T; scoring: AttemptScoring }[] } {
    let member: MemberRating | undefined;
    const seen = new Set<string>();
    const scored: { attempt: T; scoring: AttemptScoring }[] = [];

    for (const attempt of [...attempts].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))) {
        const puzzle = puzzles[attempt.puzzleId];
        if (!puzzle) continue;
        const result = rateAttempt({
            attempt,
            puzzle,
            firstAttempt: !seen.has(attempt.puzzleId),
            member,
            anchor,
        });
        seen.add(attempt.puzzleId);
        member = result.member;
        scored.push({ attempt, scoring: result.scoring });
    }

    return { member: member && member.count > 0 ? member : undefined, scored };
}
