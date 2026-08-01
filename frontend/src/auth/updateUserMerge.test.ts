import { describe, expect, it } from 'vitest';

/**
 * Mirrors AuthProvider.updateUser's merge behavior. Progress updates followed by
 * a timer clear previously used a stale user closure and wiped progress; the
 * functional merge must apply the timer patch onto the latest user.
 */
function mergeUserUpdate<T extends Record<string, unknown>>(
    previous: T | undefined,
    update: Partial<T>,
): T | undefined {
    return previous ? { ...previous, ...update } : previous;
}

describe('updateUser merge', () => {
    it('preserves progress when a later timer clear merges onto the latest user', () => {
        const beforeProgress = {
            username: 'player',
            progress: { taskA: { counts: { ALL_COHORTS: 9 } } },
            timerSeconds: 120,
            timerTaskId: 'taskA',
        };
        const afterProgress = {
            ...beforeProgress,
            progress: { taskA: { counts: { ALL_COHORTS: 10 } } },
        };

        // Progress save lands first.
        let current: typeof beforeProgress | undefined = mergeUserUpdate(
            beforeProgress,
            afterProgress,
        );

        // Timer clear must not resurrect the pre-progress user.
        current = mergeUserUpdate(current, {
            timerSeconds: 0,
            timerStartedAt: '',
            timerTaskId: '',
        });

        expect(current?.progress.taskA.counts.ALL_COHORTS).toBe(10);
        expect(current?.timerSeconds).toBe(0);
        expect(current?.timerTaskId).toBe('');
    });

    it('demonstrates the stale-closure bug that dropped progress', () => {
        const beforeProgress = {
            username: 'player',
            progress: { taskA: { counts: { ALL_COHORTS: 9 } } },
            timerSeconds: 120,
            timerTaskId: 'taskA',
        };
        const afterProgress = {
            ...beforeProgress,
            progress: { taskA: { counts: { ALL_COHORTS: 10 } } },
        };

        // Stale clear closed over `beforeProgress` instead of the latest user.
        const clobbered = mergeUserUpdate(beforeProgress, {
            timerSeconds: 0,
            timerStartedAt: '',
            timerTaskId: '',
        });
        // Progress save was already applied in another setState, but the stale
        // write wins when both are non-functional updates.
        const lastWriteWins = clobbered;

        expect(lastWriteWins?.progress.taskA.counts.ALL_COHORTS).toBe(9);
        expect(mergeUserUpdate(afterProgress, { timerSeconds: 0 })?.progress.taskA.counts
            .ALL_COHORTS).toBe(10);
    });
});
