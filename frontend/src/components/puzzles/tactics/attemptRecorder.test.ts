import {
    AttemptSubmissionSchema,
    summarizeAttempt,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { describe, expect, it } from 'vitest';
import { AttemptRecorder } from './attemptRecorder';

/** A clock the test moves by hand. */
function clock(start = Date.parse('2026-09-29T10:00:00.000Z')) {
    let t = start;
    return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('AttemptRecorder', () => {
    it('records a turn solved first time, with how long it took', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        c.advance(3500);
        r.recordCorrect('Nf7+');

        const attempt = r.finish();
        expect(attempt.moves).toEqual([
            {
                line: 0,
                ply: 0,
                expected: 'Nf7+',
                tries: [{ move: 'Nf7+', correct: true, ms: 3500 }],
                ms: 3500,
            },
        ]);
        expect(summarizeAttempt(attempt)).toMatchObject({ result: 'clean', movesFirstTry: 1 });
    });

    it('records every wrong move and when it was tried, from the start of the turn', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        c.advance(2000);
        r.recordWrong('Qh5');
        c.advance(1500);
        r.recordWrong('Qh5');
        c.advance(4000);
        r.recordCorrect('Nf7+', true);

        const [move] = r.finish().moves;
        expect(move.tries).toEqual([
            { move: 'Qh5', correct: false, ms: 2000 },
            { move: 'Qh5', correct: false, ms: 3500 },
            { move: 'Nf7+', correct: true, ms: 7500, revealed: true },
        ]);
        expect(move.ms).toBe(7500);
        expect(summarizeAttempt(r.finish())).toMatchObject({
            result: 'solved',
            mistakes: 2,
            revealed: 1,
            movesFirstTry: 0,
        });
    });

    it('times each turn from when it began, not from the start of the puzzle', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        c.advance(5000);
        r.recordCorrect('Nf7+');
        c.advance(650); // the opponent replies
        r.beginTurn(0, 2, 'Nxd8');
        c.advance(1200);
        r.recordCorrect('Nxd8');

        expect(r.finish().moves.map((m) => m.ms)).toEqual([5000, 1200]);
    });

    it('keeps the line and ply, so a second defense is told apart from the main line', () => {
        const c = clock();
        const r = new AttemptRecorder('002', c.now);
        r.beginTurn(0, 0, 'Bxg6');
        r.recordCorrect('Bxg6');
        r.beginTurn(0, 2, 'Qh6');
        r.recordCorrect('Qh6');
        r.beginTurn(1, 2, 'Qh8#');
        r.recordCorrect('Qh8#');

        expect(r.finish().moves.map((m) => [m.line, m.ply, m.expected])).toEqual([
            [0, 0, 'Bxg6'],
            [0, 2, 'Qh6'],
            [1, 2, 'Qh8#'],
        ]);
    });

    it('does not restart the clock when told to begin the turn that is already open', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        c.advance(3000);
        r.beginTurn(0, 0, 'Nf7+'); // the screen updated
        c.advance(1000);
        r.recordCorrect('Nf7+');
        expect(r.finish().moves[0].ms).toBe(4000);
    });

    it('keeps the wrong moves of a turn the solver walked away from', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        r.recordCorrect('Nf7+');
        r.beginTurn(0, 2, 'Nxd8');
        c.advance(2500);
        r.recordWrong('Kg1');

        const attempt = r.finish(true);
        expect(attempt.abandoned).toBe(true);
        expect(attempt.moves).toHaveLength(2);
        expect(attempt.moves[1].tries).toEqual([{ move: 'Kg1', correct: false, ms: 2500 }]);
        expect(summarizeAttempt(attempt)).toMatchObject({
            result: 'abandoned',
            moves: 1,
            mistakes: 1,
        });
    });

    it('drops an open turn with nothing tried on it', () => {
        const r = new AttemptRecorder('004', clock().now);
        r.beginTurn(0, 0, 'Nf7+');
        expect(r.finish(true).moves).toEqual([]);
    });

    it('knows whether there is anything worth saving', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        expect(r.hasActivity).toBe(false);
        r.beginTurn(0, 0, 'Nf7+');
        expect(r.hasActivity).toBe(false);
        r.recordWrong('Qh5');
        expect(r.hasActivity).toBe(true);
    });

    it('ignores moves recorded when no turn is open', () => {
        const r = new AttemptRecorder('004', clock().now);
        r.recordWrong('Qh5');
        r.recordCorrect('Nf7+');
        expect(r.finish().moves).toEqual([]);
    });

    it('stamps when the puzzle started and finished', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        c.advance(90_000);
        const attempt = r.finish();
        expect(attempt.startedAt).toBe('2026-09-29T10:00:00.000Z');
        expect(attempt.finishedAt).toBe('2026-09-29T10:01:30.000Z');
    });

    it('caps a time left running (a forgotten tab), so the server accepts it', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        c.advance(5 * 60 * 60 * 1000);
        r.recordCorrect('Nf7+');
        expect(r.finish().moves[0].ms).toBe(60 * 60 * 1000);
    });

    it('produces a record the server accepts', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Nf7+');
        c.advance(1000);
        r.recordWrong('Qh5');
        r.recordCorrect('Nf7+');
        expect(AttemptSubmissionSchema.safeParse(r.finish()).success).toBe(true);
    });
});

describe('AttemptRecorder alternates', () => {
    it('records an ALT2 nudge without costing the solver anything', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 0, 'Re1+');
        c.advance(1500);
        r.recordAlternate('Re2', 'alt2');
        c.advance(2500);
        r.recordCorrect('Re1+');

        const attempt = r.finish();
        expect(attempt.moves[0].tries).toEqual([
            { move: 'Re2', correct: false, alt: 'alt2', ms: 1500 },
            { move: 'Re1+', correct: true, ms: 4000 },
        ]);
        expect(AttemptSubmissionSchema.parse(attempt)).toBeTruthy();
        expect(summarizeAttempt(attempt)).toMatchObject({ result: 'clean', mistakes: 0 });
    });

    it('settles the turn on an ALT solution the solver moved on from', () => {
        const c = clock();
        const r = new AttemptRecorder('004', c.now);
        r.beginTurn(0, 2, 'Rb8');
        c.advance(3000);
        r.recordCorrect('f7', false, 'alt');

        const attempt = r.finish();
        expect(attempt.moves[0].tries).toEqual([
            { move: 'f7', correct: true, alt: 'alt', ms: 3000 },
        ]);
        expect(summarizeAttempt(attempt)).toMatchObject({ result: 'clean', movesFirstTry: 1 });
    });

    it('records nothing for an alternate when no turn is open', () => {
        const r = new AttemptRecorder('004', clock().now);
        r.recordAlternate('Re2', 'alt2');
        expect(r.hasActivity).toBe(false);
    });
});
