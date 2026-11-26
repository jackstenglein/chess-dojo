import { RushDemoAttempt, RushDemoRun } from './rushStorage';

/** The attempts that got a real answer. A puzzle the clock or "End run" cut off is left out. */
export function answeredAttempts(run: RushDemoRun): RushDemoAttempt[] {
    return run.endReason === 'strikes' ? run.attempts : run.attempts.slice(0, -1);
}

function average(values: number[]): number {
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * One sentence about the visitor's pace, from their own numbers: did the misses
 * come faster than the solves? Returns nothing when there is too little to compare.
 */
export function paceInsight(run: RushDemoRun): string | undefined {
    const attempts = answeredAttempts(run);
    const solved = attempts.filter((attempt) => attempt.result === 'win');
    const missed = attempts.filter((attempt) => attempt.result === 'loss');
    if (solved.length < 2) {
        return undefined;
    }

    const solveSeconds = average(solved.map((attempt) => attempt.seconds));
    if (missed.length === 0) {
        return `No misses, at ${solveSeconds}s a puzzle.`;
    }

    const missSeconds = average(missed.map((attempt) => attempt.seconds));
    if (missSeconds <= solveSeconds * 0.75) {
        return `Your misses took ${missSeconds}s on average and your solves took ${solveSeconds}s. The misses were the fast ones.`;
    }
    if (missSeconds >= solveSeconds * 1.5) {
        return `You spent ${missSeconds}s on the puzzles you missed and ${solveSeconds}s on the ones you solved. Those were hard for you, not rushed.`;
    }
    return `Your misses took ${missSeconds}s on average and your solves took ${solveSeconds}s. A steady pace.`;
}

/**
 * The band a puzzle rating falls in. The app converts puzzle ratings to the Dojo
 * scale by training cohort (scripts/lichess_puzzle_upload.py), so the bands are
 * the cohorts: 0-300, then every 100 points, then 2400+.
 */
export function ladderBand(rating: number): string {
    if (rating < 300) {
        return '0-300';
    }
    if (rating >= 2400) {
        return '2400+';
    }
    const floor = Math.floor(rating / 100) * 100;
    return `${floor}-${floor + 100}`;
}

/** Where the hardest solve of a run sits on the Dojo's ladder, with the honest caveat. */
export function bandLine(run: RushDemoRun): string | undefined {
    if (!run.highestSolved) {
        return undefined;
    }
    return `Hardest solve: ${run.highestSolved}. The Dojo files that puzzle under its ${ladderBand(run.highestSolved)} cohort. A rush score is not a rating, so your own cohort comes from your real one.`;
}

/** A result a visitor can paste anywhere: the score, then one square per puzzle. */
export function shareText(run: RushDemoRun, pageUrl: string): string {
    const squares = run.attempts
        .map((attempt) => (attempt.result === 'win' ? '\u{1F7E9}' : '\u{1F7E5}'))
        .join('');
    const lines = [
        `Dojo Rush: ${run.solved} solved, ${run.accuracy}% accuracy${run.highestSolved ? `, hardest ${run.highestSolved}` : ''}`,
        squares,
        `10 minutes, 3 strikes. ${pageUrl}`,
    ];
    return lines.filter(Boolean).join('\n');
}
