import { describe, expect, it } from 'vitest';
import { PuzzlebasePuzzle } from './api';
import {
    addCounters,
    AttemptSubmission,
    AttemptSubmissionSchema,
    averageMs,
    cleanRate,
    continuesSession,
    countersForAttempt,
    emptyCounters,
    firstTryRate,
    groupIntoSessions,
    hasPuzzles,
    MoveRecord,
    pickTrainingPuzzles,
    SESSION_GAP_MS,
    statKeys,
    statsFromAttempts,
    summarizeAttempt,
    toPuzzleAttempt,
    trainingTagSets,
    TrainRequestSchema,
} from './runs';

const T0 = '2026-09-29T10:00:00.000Z';
const T1 = '2026-09-29T10:01:30.000Z';

/** A turn in which the solver got it right first time. */
const right = (ply: number, expected: string, ms = 2000, line = 0): MoveRecord => ({
    line,
    ply,
    expected,
    tries: [{ move: expected, correct: true, ms }],
    ms,
});

/** A turn in which the solver missed first and then found the move. */
const missedThenRight = (ply: number, expected: string): MoveRecord => ({
    line: 0,
    ply,
    expected,
    tries: [
        { move: 'Qh5', correct: false, ms: 3000 },
        { move: expected, correct: true, ms: 7000 },
    ],
    ms: 7000,
});

const attempt = (
    moves: MoveRecord[],
    over: Partial<AttemptSubmission> = {},
): AttemptSubmission => ({
    puzzleId: '004',
    startedAt: T0,
    finishedAt: T1,
    abandoned: false,
    moves,
    ...over,
});

describe('summarizeAttempt', () => {
    it('is clean when every move was right first time', () => {
        expect(summarizeAttempt(attempt([right(0, 'Nf7+'), right(2, 'Nxd8')]))).toEqual({
            result: 'clean',
            moves: 2,
            movesFirstTry: 2,
            mistakes: 0,
            revealed: 0,
            totalMs: 90_000,
        });
    });

    it('is solved, not clean, if any move needed a second try', () => {
        expect(
            summarizeAttempt(attempt([right(0, 'Nf7+'), missedThenRight(2, 'Nxd8')])),
        ).toMatchObject({ result: 'solved', moves: 2, movesFirstTry: 1, mistakes: 1 });
    });

    it('keeps every wrong move, so the same mistake twice counts twice', () => {
        const move: MoveRecord = {
            line: 0,
            ply: 0,
            expected: 'Nf7+',
            tries: [
                { move: 'Qh5', correct: false, ms: 1000 },
                { move: 'Qh5', correct: false, ms: 2000 },
                { move: 'Nf7+', correct: true, ms: 2500, revealed: true },
            ],
            ms: 2500,
        };
        expect(summarizeAttempt(attempt([move]))).toMatchObject({
            result: 'solved',
            mistakes: 2,
            revealed: 1,
            movesFirstTry: 0,
        });
    });

    it('does not call a revealed move a first-try move', () => {
        const move: MoveRecord = {
            line: 0,
            ply: 0,
            expected: 'Nf7+',
            tries: [{ move: 'Nf7+', correct: true, ms: 100, revealed: true }],
            ms: 100,
        };
        expect(summarizeAttempt(attempt([move])).movesFirstTry).toBe(0);
    });

    it('does not count an ALT2 nudge as a mistake or as losing the first try', () => {
        const move: MoveRecord = {
            line: 0,
            ply: 0,
            expected: 'Re1+',
            tries: [
                { move: 'Re2', correct: false, alt: 'alt2', ms: 1500 },
                { move: 'Re1+', correct: true, ms: 4000 },
            ],
            ms: 4000,
        };
        expect(summarizeAttempt(attempt([move]))).toMatchObject({
            result: 'clean',
            moves: 1,
            movesFirstTry: 1,
            mistakes: 0,
        });
    });

    it('still counts a real mistake made after an ALT2 nudge', () => {
        const move: MoveRecord = {
            line: 0,
            ply: 0,
            expected: 'Re1+',
            tries: [
                { move: 'Re2', correct: false, alt: 'alt2', ms: 1500 },
                { move: 'Qh5', correct: false, ms: 2500 },
                { move: 'Re1+', correct: true, ms: 4000 },
            ],
            ms: 4000,
        };
        expect(summarizeAttempt(attempt([move]))).toMatchObject({
            result: 'solved',
            movesFirstTry: 0,
            mistakes: 1,
        });
    });

    it('gives full credit for an ALT move, whether they tried again or asked to see the next move', () => {
        const shown: MoveRecord = {
            line: 0,
            ply: 2,
            expected: 'Rb8',
            tries: [{ move: 'f7', correct: true, alt: 'alt', ms: 3000 }],
            ms: 3000,
        };
        const triedAgain: MoveRecord = {
            line: 0,
            ply: 2,
            expected: 'Rb8',
            tries: [
                { move: 'f7', correct: false, alt: 'alt', ms: 3000 },
                { move: 'Rb8', correct: true, ms: 5000 },
            ],
            ms: 5000,
        };
        for (const move of [shown, triedAgain]) {
            expect(summarizeAttempt(attempt([move]))).toMatchObject({
                result: 'clean',
                movesFirstTry: 1,
                mistakes: 0,
            });
        }
    });

    it('is abandoned when the solver left, and only counts moves that were settled', () => {
        const unfinished: MoveRecord = {
            line: 0,
            ply: 2,
            expected: 'Nxd8',
            tries: [{ move: 'Qh5', correct: false, ms: 4000 }],
            ms: 4000,
        };
        expect(
            summarizeAttempt(attempt([right(0, 'Nf7+'), unfinished], { abandoned: true })),
        ).toMatchObject({ result: 'abandoned', moves: 1, movesFirstTry: 1, mistakes: 1 });
    });

    it('handles an attempt with no moves at all', () => {
        expect(summarizeAttempt(attempt([], { abandoned: true }))).toMatchObject({
            result: 'abandoned',
            moves: 0,
        });
    });

    it('never reports a negative or absurdly long time', () => {
        expect(summarizeAttempt(attempt([], { startedAt: T1, finishedAt: T0 })).totalMs).toBe(0);
        expect(
            summarizeAttempt(attempt([], { startedAt: T0, finishedAt: '2026-09-30T10:00:00.000Z' }))
                .totalMs,
        ).toBe(60 * 60 * 1000);
    });
});

describe('AttemptSubmissionSchema', () => {
    it('accepts a well-formed record and defaults abandoned to false', () => {
        const parsed = AttemptSubmissionSchema.parse({
            puzzleId: '004',
            startedAt: T0,
            finishedAt: T1,
            moves: [right(0, 'Nf7+')],
        });
        expect(parsed.abandoned).toBe(false);
    });

    it('rejects records that are malformed or absurd', () => {
        const base = { puzzleId: '004', startedAt: T0, finishedAt: T1, moves: [] };
        expect(AttemptSubmissionSchema.safeParse({ ...base, startedAt: 'yesterday' }).success).toBe(
            false,
        );
        expect(AttemptSubmissionSchema.safeParse({ ...base, puzzleId: '' }).success).toBe(false);
        expect(
            AttemptSubmissionSchema.safeParse({
                ...base,
                moves: [{ ...right(0, 'Nf7+'), tries: [] }],
            }).success,
        ).toBe(false);
        expect(
            AttemptSubmissionSchema.safeParse({
                ...base,
                moves: [right(0, 'Nf7+', -5)],
            }).success,
        ).toBe(false);
        expect(
            AttemptSubmissionSchema.safeParse({
                ...base,
                moves: Array.from({ length: 201 }, (_, i) => right(0, 'Nf7+', 1, i % 90)),
            }).success,
        ).toBe(false);
    });
});

describe('toPuzzleAttempt', () => {
    it('stores what the server knows about the puzzle, not what the client says', () => {
        const stored = toPuzzleAttempt(attempt([right(0, 'Nf7+')]), {
            fen: 'FEN',
            rating: 800,
            buckets: ['Tactics'],
            themes: ['Fork'],
        });
        expect(stored).toMatchObject({
            puzzleId: '004',
            fen: 'FEN',
            puzzleRating: 800,
            buckets: ['Tactics'],
            themes: ['Fork'],
            summary: { result: 'clean' },
        });
        expect(stored).not.toHaveProperty('abandoned');
    });
});

describe('counters', () => {
    const summary = summarizeAttempt(attempt([right(0, 'Nf7+'), missedThenRight(2, 'Nxd8')]));

    it('counts one attempt', () => {
        expect(countersForAttempt(summary)).toEqual({
            attempts: 1,
            clean: 0,
            solved: 1,
            abandoned: 0,
            moves: 2,
            movesFirstTry: 1,
            mistakes: 1,
            totalMs: 90_000,
        });
    });

    it('adds up', () => {
        const clean = summarizeAttempt(attempt([right(0, 'Nf7+')]));
        const total = addCounters(countersForAttempt(summary), countersForAttempt(clean));
        expect(total).toMatchObject({
            attempts: 2,
            clean: 1,
            solved: 1,
            moves: 3,
            movesFirstTry: 2,
        });
        expect(addCounters(emptyCounters(), total)).toEqual(total);
    });

    it('works out rates, and says nothing when there is nothing to rate', () => {
        const total = addCounters(
            countersForAttempt(summary),
            countersForAttempt(summarizeAttempt(attempt([right(0, 'Nf7+')]))),
        );
        expect(firstTryRate(total)).toBeCloseTo(2 / 3);
        expect(cleanRate(total)).toBe(0.5);
        expect(averageMs(total)).toBe(90_000);

        const nothing = emptyCounters();
        expect(firstTryRate(nothing)).toBeUndefined();
        expect(cleanRate(nothing)).toBeUndefined();
        expect(averageMs(nothing)).toBeUndefined();
    });

    it('leaves abandoned attempts out of the clean rate', () => {
        const abandoned = countersForAttempt(
            summarizeAttempt(attempt([right(0, 'Nf7+')], { abandoned: true })),
        );
        expect(cleanRate(abandoned)).toBeUndefined();
        expect(abandoned.abandoned).toBe(1);
    });
});

describe('statKeys', () => {
    it('counts an attempt overall, and towards each bucket and theme', () => {
        expect(statKeys({ buckets: ['Tactics', 'Endgame'], themes: ['Fork'] })).toEqual([
            'TOTAL',
            'BUCKET#Tactics',
            'BUCKET#Endgame',
            'THEME#Fork',
        ]);
        expect(statKeys({ buckets: [], themes: [] })).toEqual(['TOTAL']);
    });
});

describe('sessions', () => {
    it('continues a session when the break was under 30 minutes', () => {
        expect(continuesSession(T0, '2026-09-29T10:29:59.000Z')).toBe(true);
        expect(continuesSession(T0, '2026-09-29T10:30:00.000Z')).toBe(false);
        expect(SESSION_GAP_MS).toBe(30 * 60 * 1000);
    });

    it('starts a new session after a longer break', () => {
        expect(continuesSession(T0, '2026-09-29T14:00:00.000Z')).toBe(false);
    });
});

describe('pickTrainingPuzzles', () => {
    const puzzle = (id: string, rating: number, buckets: string[], themes: string[]) =>
        ({ id, rating, buckets, themes }) as PuzzlebasePuzzle;
    const all = [
        puzzle('001', 500, ['Tactics'], ['Fork']),
        puzzle('002', 900, ['Tactics'], ['Pin']),
        puzzle('003', 1300, ['Endgame'], ['Passed pawn']),
        puzzle('004', 1700, ['Tactics', 'Endgame'], ['Fork', 'Passed pawn']),
    ];
    const ids = (r: PuzzlebasePuzzle[]) => r.map((p) => p.id).sort();
    const noShuffle = () => 0.999;
    const request = (over: object = {}) => TrainRequestSchema.parse(over);

    it('offers everything when nothing is asked for', () => {
        expect(ids(pickTrainingPuzzles(all, request(), noShuffle))).toEqual([
            '001',
            '002',
            '003',
            '004',
        ]);
    });

    it('keeps to a rating range, ends included', () => {
        expect(
            ids(pickTrainingPuzzles(all, request({ minRating: 900, maxRating: 1300 }), noShuffle)),
        ).toEqual(['002', '003']);
    });

    it('keeps to puzzles of one of the types and one of the phases asked for', () => {
        const all = [
            puzzle('001', 1000, ['Tactics', 'Opening'], []),
            puzzle('002', 1000, ['Tactics', 'Endgame'], []),
            puzzle('003', 1000, ['Strategy', 'Endgame'], []),
            puzzle('004', 1000, ['Strategy', 'Middlegame'], []),
        ];
        const ids = (request: Record<string, string>) =>
            pickTrainingPuzzles(all, TrainRequestSchema.parse(request), () => 0)
                .map((p) => p.id)
                .sort();
        expect(ids({ types: 'Tactics' })).toEqual(['001', '002']);
        expect(ids({ types: 'Tactics,Strategy' })).toEqual(['001', '002', '003', '004']);
        expect(ids({ types: 'Strategy', phases: 'Endgame,Opening' })).toEqual(['003']);
        expect(ids({ phases: 'Middlegame,Opening' })).toEqual(['001', '004']);
    });

    it('keeps to puzzles that have every bucket asked for', () => {
        const mixed = [
            puzzle('001', 1000, ['Tactics', 'Endgame'], []),
            puzzle('002', 1000, ['Tactics', 'Middlegame'], []),
            puzzle('003', 1000, ['Strategy', 'Endgame'], []),
        ];
        const ids = (bucket: string) =>
            pickTrainingPuzzles(mixed, TrainRequestSchema.parse({ bucket }), () => 0)
                .map((p) => p.id)
                .sort();
        expect(ids('Tactics,Endgame')).toEqual(['001']);
        expect(ids('Endgame')).toEqual(['001', '003']);
    });

    it('keeps to a bucket or a theme', () => {
        expect(ids(pickTrainingPuzzles(all, request({ bucket: 'Endgame' }), noShuffle))).toEqual([
            '003',
            '004',
        ]);
        expect(ids(pickTrainingPuzzles(all, request({ theme: 'Fork' }), noShuffle))).toEqual([
            '001',
            '004',
        ]);
        expect(
            ids(
                pickTrainingPuzzles(
                    all,
                    request({ bucket: 'Tactics', theme: 'Passed pawn' }),
                    noShuffle,
                ),
            ),
        ).toEqual(['004']);
    });

    it('leaves out puzzles already seen', () => {
        expect(ids(pickTrainingPuzzles(all, request({ exclude: '001,003' }), noShuffle))).toEqual([
            '002',
            '004',
        ]);
    });

    it('stops at the count', () => {
        expect(pickTrainingPuzzles(all, request({ count: '2' }), noShuffle)).toHaveLength(2);
    });

    it('does not change the list it is given, and shuffles', () => {
        const before = all.map((p) => p.id);
        const picked = pickTrainingPuzzles(all, request(), () => 0);
        expect(all.map((p) => p.id)).toEqual(before);
        expect(picked.map((p) => p.id)).not.toEqual(before);
    });

    it('returns nothing when nothing matches', () => {
        expect(pickTrainingPuzzles(all, request({ minRating: 3000 }), noShuffle)).toEqual([]);
    });

    it('reads numbers from a query string, and caps the count', () => {
        expect(request({ minRating: '900', count: '5' })).toMatchObject({
            minRating: 900,
            count: 5,
        });
        expect(TrainRequestSchema.safeParse({ count: '100' }).success).toBe(false);
        expect(TrainRequestSchema.safeParse({ minRating: '-1' }).success).toBe(false);
    });
});

describe('groupIntoSessions and statsFromAttempts', () => {
    const make = (puzzleId: string, finishedAt: string, moves: MoveRecord[]) =>
        toPuzzleAttempt(
            attempt(moves, {
                puzzleId,
                startedAt: new Date(Date.parse(finishedAt) - 60_000).toISOString(),
                finishedAt,
            }),
            { fen: 'F', rating: 800, buckets: ['Tactics'], themes: ['Fork'] },
        );
    const attempts = [
        make('a', '2026-09-29T09:00:00.000Z', [right(0, 'Nf7+')]),
        make('b', '2026-09-29T09:10:00.000Z', [missedThenRight(0, 'Nf7+')]),
        make('c', '2026-09-29T15:00:00.000Z', [right(0, 'Nf7+')]),
    ];

    it('splits attempts into sessions at breaks of 30 minutes, newest first', () => {
        const sessions = groupIntoSessions(attempts);
        expect(sessions.map((s) => s.attempts)).toEqual([1, 2]);
        expect(sessions[1]).toMatchObject({
            startedAt: '2026-09-29T08:59:00.000Z',
            lastActiveAt: '2026-09-29T09:10:00.000Z',
            clean: 1,
            solved: 1,
            mistakes: 1,
        });
    });

    it('does not depend on the order the attempts are given in', () => {
        expect(groupIntoSessions([...attempts].reverse())).toEqual(groupIntoSessions(attempts));
    });

    it('adds up stats overall and by tag', () => {
        const stats = statsFromAttempts(attempts);
        expect(stats.total).toMatchObject({ attempts: 3, clean: 2, solved: 1, mistakes: 1 });
        expect(stats.buckets.Tactics.attempts).toBe(3);
        expect(stats.themes.Fork).toMatchObject({ attempts: 3, moves: 3, movesFirstTry: 2 });
    });

    it('says nothing for no attempts', () => {
        expect(groupIntoSessions([])).toEqual([]);
        expect(statsFromAttempts([]).total.attempts).toBe(0);
    });
});

describe('pickTrainingPuzzles: what to show next', () => {
    const puzzle = (id: string) => ({ id, rating: 1000, buckets: [], themes: [] }) as never;
    const all = ['001', '002', '003', '004', '005', '006'].map(puzzle);
    const request = (over: object = {}) => TrainRequestSchema.parse(over);
    const idsOf = (r: { id: string }[]) => r.map((p) => p.id);

    it('puts puzzles never seen before the ones that were', () => {
        const lastSeen = { '001': '2026-09-01T00:00:00Z', '002': '2026-09-02T00:00:00Z' };
        const picked = idsOf(
            pickTrainingPuzzles(all, request({ count: 4 }), Math.random, lastSeen),
        );
        expect(picked.sort()).toEqual(['003', '004', '005', '006']);
    });

    it('shuffles the unseen ones, so a run is not the same every time', () => {
        const orders = new Set(
            Array.from({ length: 30 }, () =>
                idsOf(pickTrainingPuzzles(all, request(), Math.random, {})).join(),
            ),
        );
        expect(orders.size).toBeGreaterThan(5);
    });

    it('goes through the whole collection before a seen puzzle comes back', () => {
        const seen: Record<string, string> = {};
        const played: string[] = [];
        for (let run = 0; run < 3; run++) {
            const picked = idsOf(
                pickTrainingPuzzles(all, request({ count: 2 }), Math.random, seen),
            );
            played.push(...picked);
            picked.forEach((id, i) => (seen[id] = `2026-09-0${run + 1}T00:0${i}:00Z`));
        }
        expect(new Set(played).size).toBe(6);
    });

    it('once everything is seen, offers the longest ago first', () => {
        const lastSeen = {
            '001': '2026-09-05T00:00:00Z',
            '002': '2026-09-01T00:00:00Z',
            '003': '2026-09-03T00:00:00Z',
            '004': '2026-09-02T00:00:00Z',
            '005': '2026-09-06T00:00:00Z',
            '006': '2026-09-04T00:00:00Z',
        };
        expect(
            idsOf(pickTrainingPuzzles(all, request({ count: 3 }), Math.random, lastSeen)),
        ).toEqual(['002', '004', '003']);
    });

    it('still keeps to the rating range and the exclusions', () => {
        const picked = pickTrainingPuzzles(all, request({ exclude: '001,002' }), Math.random, {});
        expect(idsOf(picked).sort()).toEqual(['003', '004', '005', '006']);
    });
});

describe('pickTrainingPuzzles with a theme listed under several buckets', () => {
    const puzzle = (id: string, buckets: string[], themes: string[]) =>
        ({ id, rating: 1000, buckets, themes }) as PuzzlebasePuzzle;
    const all = [
        puzzle('001', ['Tactics'], ['Attack on the king']),
        puzzle('002', ['Endgame'], ['Attack on the king']),
        puzzle('003', ['Endgame'], ['Passed pawn']),
    ];

    it('offers the puzzles with the theme from every bucket', () => {
        const picked = pickTrainingPuzzles(
            all,
            TrainRequestSchema.parse({ theme: 'Attack on the king' }),
        );
        expect(picked.map((p) => p.id).sort()).toEqual(['001', '002']);
    });

    it('still narrows to one bucket when a bucket is asked for too', () => {
        const picked = pickTrainingPuzzles(
            all,
            TrainRequestSchema.parse({ theme: 'Attack on the king', bucket: 'Endgame' }),
        );
        expect(picked.map((p) => p.id)).toEqual(['002']);
    });
});

describe('what there are puzzles for', () => {
    const puzzles = [
        { buckets: ['Tactics', 'Endgame'], themes: ['Fork'] },
        { buckets: ['Endgame', 'Tactics'], themes: ['Fork'] },
        { buckets: ['Strategy', 'Middlegame'], themes: ['Outpost'] },
    ];

    it('counts puzzles with the same tags together, whatever order they are in', () => {
        expect(trainingTagSets(puzzles)).toEqual([
            { buckets: ['Endgame', 'Tactics'], themes: ['Fork'], count: 2 },
            { buckets: ['Middlegame', 'Strategy'], themes: ['Outpost'], count: 1 },
        ]);
    });

    it('knows whether a type, phase and theme find anything', () => {
        const sets = trainingTagSets(puzzles);
        expect(hasPuzzles(sets, { buckets: ['Tactics'], theme: 'Fork' })).toBe(true);
        expect(hasPuzzles(sets, { buckets: ['Strategy'], theme: 'Fork' })).toBe(false);
        expect(hasPuzzles(sets, { buckets: ['Tactics', 'Middlegame'] })).toBe(false);
        expect(hasPuzzles(sets, {})).toBe(true);
        expect(
            hasPuzzles(sets, { types: ['Strategy', 'Tactics'], phases: ['Opening', 'Endgame'] }),
        ).toBe(true);
        expect(hasPuzzles(sets, { types: ['Strategy'], phases: ['Endgame'] })).toBe(false);
        expect(hasPuzzles([], {})).toBe(false);
    });
});
