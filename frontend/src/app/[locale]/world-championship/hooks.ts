'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { ContestConfig } from './config';
import {
    EMPTY_DRAFT,
    hasResultsSignup,
    loadDraft,
    loadEntry,
    StoredDraft,
    StoredEntry,
    subscribeToStorage,
} from './prediction';

const subscribeToNothing = () => () => undefined;

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        subscribeToNothing,
        () => true,
        () => false,
    );
}

/** The page's query string, empty on the server. */
export function useSearch(): string {
    return useSyncExternalStore(
        subscribeToNothing,
        () => window.location.search,
        () => '',
    );
}

/** The picks in progress. Empty on the server, so the first question is in the HTML. */
export function useStoredDraft(): StoredDraft {
    return useSyncExternalStore(subscribeToStorage, loadDraft, () => EMPTY_DRAFT);
}

/** The visitor's submitted picks, if this browser has any. */
export function useStoredEntry(): StoredEntry | undefined {
    return useSyncExternalStore(subscribeToStorage, loadEntry, () => undefined);
}

export function useResultsSignup(): boolean {
    return useSyncExternalStore(subscribeToStorage, hasResultsSignup, () => false);
}

/** setTimeout overflows past 24.8 days, so moments further away are left to the interval. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

interface Clock {
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => number;
}

/** A clock that ticks on an interval and also wakes up exactly at the given moments. */
function createClock(intervalMs: number, moments: number[] = []): Clock {
    let now = Date.now();
    return {
        getSnapshot: () => now,
        subscribe: (listener) => {
            const tick = () => {
                now = Date.now();
                listener();
            };
            now = Date.now();
            const interval = window.setInterval(tick, intervalMs);
            const timeouts = moments
                .map((moment) => moment - now)
                .filter((delay) => delay > 0 && delay < MAX_TIMEOUT_MS)
                .map((delay) => window.setTimeout(tick, delay + 50));
            return () => {
                window.clearInterval(interval);
                timeouts.forEach((timeout) => window.clearTimeout(timeout));
            };
        },
    };
}

const secondsClock = createClock(1000);

/**
 * The time the page states are decided from. The first render uses the time the
 * server rendered the page, so hydration matches. After that it follows the
 * visitor's clock and wakes up when predictions lock or the offer window changes.
 */
export function useContestClock(
    serverNow: number,
    config: ContestConfig,
    frozenAt?: number,
): number {
    const clock = useMemo(
        () =>
            createClock(30 * 1000, [
                config.lockAt,
                Date.parse(config.offer.earlyAccessStartsAt),
                Date.parse(config.offer.startsAt),
                Date.parse(config.offer.endsAt),
            ]),
        [config],
    );
    const now = useSyncExternalStore(clock.subscribe, clock.getSnapshot, () => serverNow);
    return frozenAt ?? now;
}

/** Milliseconds until a moment, updated every second. Undefined until the browser's clock is read. */
export function useTimeLeft(target: number, frozenAt?: number): number | undefined {
    const now = useSyncExternalStore(
        secondsClock.subscribe,
        secondsClock.getSnapshot,
        () => undefined,
    );
    return now === undefined ? undefined : target - (frozenAt ?? now);
}
