'use client';

import { axiosService } from '@/api/axiosService';
import {
    WcAnalysis,
    WcAnalysisRequest,
} from '@jackstenglein/chess-dojo-common/src/wcLive/analysis';
import { useCallback, useEffect, useRef, useState } from 'react';
import { localRequestConfig } from './localTesting';

/** Senseis see each other's moves this quickly. */
const POLL_MS = 2000;
/** Stepping through moves sends one "select" after the last step, not one per step. */
const SELECT_DELAY_MS = 250;

async function getAnalysis(roundId: string, guestToken?: string): Promise<WcAnalysis> {
    if (guestToken) {
        const resp = await axiosService.post<WcAnalysis>(
            '/public/wc-live/guest/analysis/read',
            { token: guestToken, roundId },
            { functionName: 'wcLiveGuestGetAnalysis', ...localRequestConfig() },
        );
        return resp.data;
    }
    const resp = await axiosService.get<WcAnalysis>(`/wc-live/rounds/${roundId}/analysis`, {
        functionName: 'wcLiveGetAnalysis',
        ...localRequestConfig(),
    });
    return resp.data;
}

async function putAnalysis(request: WcAnalysisRequest, guestToken?: string): Promise<WcAnalysis> {
    if (guestToken) {
        const resp = await axiosService.put<WcAnalysis>(
            '/public/wc-live/guest/analysis',
            { token: guestToken, request },
            { functionName: 'wcLiveGuestPutAnalysis', ...localRequestConfig() },
        );
        return resp.data;
    }
    const resp = await axiosService.put<WcAnalysis>('/wc-live/analysis', request, {
        functionName: 'wcLivePutAnalysis',
        ...localRequestConfig(),
    });
    return resp.data;
}

export interface AnalysisApi {
    analysis?: WcAnalysis;
    /** Plays a move on the shared board: path ends with the move. */
    move: (path: string[]) => void;
    /** Shows a position to the other senseis. */
    select: (path: string[]) => void;
    /** Deletes the variation from the move at the end of the path. */
    remove: (path: string[]) => void;
    /** Moves the variation through the move at the end of the path up among its alternatives. */
    promote: (path: string[]) => void;
    error?: string;
}

/**
 * The senseis' shared analysis of a game. Only senseis call this: for anyone
 * else it does nothing and the page shows the live position.
 *
 * Changes show at once on this sensei's board. Every local change gets a
 * number, and an answer from the API (a save or a poll) is only shown if no
 * newer change was made here after its request went out. Otherwise a slow
 * answer would put the board back a move and then forward again.
 */
export function useAnalysis(
    roundId: string | undefined,
    enabled: boolean,
    /** The same change the API makes, to show it before the API answers. */
    apply: (current: WcAnalysis, request: WcAnalysisRequest) => WcAnalysis,
    /** A guest sensei's link token: their calls go through the guest routes. */
    guestToken?: string,
): AnalysisApi {
    const [analysis, setAnalysis] = useState<WcAnalysis>();
    const [error, setError] = useState<string>();
    /** Saves on their way, including a select still waiting to be sent. */
    const pending = useRef(0);
    /** Bumped by every local change. */
    const generation = useRef(0);
    const selectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    /** Whether selectTimer holds a select not sent yet (counted in pending). */
    const selectWaiting = useRef(false);

    useEffect(() => {
        setAnalysis(undefined);
        if (!roundId || !enabled) {
            return;
        }
        let cancelled = false;
        const load = () => {
            const sentAt = generation.current;
            getAnalysis(roundId, guestToken)
                .then((a) => {
                    if (!cancelled && pending.current === 0 && generation.current === sentAt) {
                        setAnalysis(a);
                    }
                })
                .catch(() => undefined);
        };
        load();
        const timer = setInterval(load, POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
            clearTimeout(selectTimer.current);
            if (selectWaiting.current) {
                selectWaiting.current = false;
                pending.current--;
            }
        };
    }, [roundId, enabled, guestToken]);

    const send = useCallback(
        (request: WcAnalysisRequest, sentAt: number) => {
            pending.current++;
            setError(undefined);
            putAnalysis(request, guestToken)
                .then((saved) => {
                    // A newer change made here since shows already; its own save follows.
                    if (generation.current === sentAt) {
                        setAnalysis(saved);
                    }
                })
                .catch(() => setError('The analysis was not saved. Try again.'))
                .finally(() => {
                    pending.current--;
                });
        },
        [guestToken],
    );

    const change = useCallback(
        (request: WcAnalysisRequest, delay = 0) => {
            // Show it here at once.
            setAnalysis((current) =>
                apply(current ?? { roundId: request.roundId, lines: [], version: 0 }, request),
            );
            const sentAt = ++generation.current;
            // A select still waiting is replaced by this change.
            clearTimeout(selectTimer.current);
            if (selectWaiting.current) {
                selectWaiting.current = false;
                pending.current--;
            }
            if (delay) {
                pending.current++;
                selectWaiting.current = true;
                selectTimer.current = setTimeout(() => {
                    selectWaiting.current = false;
                    pending.current--;
                    send(request, sentAt);
                }, delay);
            } else {
                send(request, sentAt);
            }
        },
        [apply, send],
    );

    const withRound = (fn: (id: string) => void) => {
        if (roundId) {
            fn(roundId);
        }
    };

    return {
        analysis,
        error,
        move: (path) => withRound((id) => change({ action: 'move', roundId: id, path })),
        select: (path) =>
            withRound((id) => change({ action: 'select', roundId: id, path }, SELECT_DELAY_MS)),
        remove: (path) => withRound((id) => change({ action: 'delete', roundId: id, path })),
        promote: (path) => withRound((id) => change({ action: 'promote', roundId: id, path })),
    };
}
