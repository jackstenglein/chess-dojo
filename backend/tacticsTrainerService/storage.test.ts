import { randomBytes } from 'crypto';
import { describe, expect, it } from 'vitest';
import { packProgress, ProgressTooLargeError, unpackProgress } from './storage';

/** A session of `n` attempts, each with per-move timing that doesn't compress well. */
function session(id: number, n: number) {
    return {
        id,
        attempts: Array.from({ length: n }, (_, i) => [
            'fork',
            800,
            1,
            5000,
            `p${id}_${i}`,
            { run: id, at: id, moves: [[randomBytes(24).toString('hex'), 1200, 1]] },
        ]),
        sets: [],
    };
}

describe('packProgress', () => {
    it('round-trips small progress unchanged', () => {
        const progress = {
            xp: 120,
            themes: { fork: { stars: { 0: 3 } } },
            sessions: [session(1, 3)],
        };
        const { packed, trimmedSessions } = packProgress(progress);
        expect(trimmedSessions).toBe(0);
        expect(unpackProgress(packed)).toEqual(progress);
    });

    it('drops per-move timing from the oldest sessions first to fit', () => {
        const progress = { xp: 1, sessions: Array.from({ length: 20 }, (_, i) => session(i, 50)) };
        const full = packProgress(progress, 10_000_000).packed.length;
        const { packed, trimmedSessions } = packProgress(progress, Math.floor(full * 0.6));

        const out = unpackProgress(packed) as { sessions: { attempts: unknown[][] }[] };
        expect(trimmedSessions).toBeGreaterThan(0);
        expect(trimmedSessions).toBeLessThan(20);
        const moves = (s: number) => (out.sessions[s].attempts[0][5] as { moves?: unknown }).moves;
        expect(moves(0)).toBeUndefined(); // oldest trimmed
        expect(moves(19)).toBeDefined(); // newest kept
        expect(out.sessions[0].attempts).toHaveLength(50); // attempts themselves are kept
        expect(progress.sessions[0].attempts[0][5]).toHaveProperty('moves'); // input untouched
    });

    it('throws when even the trimmed progress is too large', () => {
        const progress = { blob: randomBytes(50_000).toString('hex'), sessions: [session(1, 2)] };
        expect(() => packProgress(progress, 1_000)).toThrow(ProgressTooLargeError);
    });
});
