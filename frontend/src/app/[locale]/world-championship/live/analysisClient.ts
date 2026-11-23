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

async function getAnalysis(roundId: string): Promise<WcAnalysis> {
    const resp = await axiosService.get<WcAnalysis>(`/wc-live/rounds/${roundId}/analysis`, {
        functionName: 'wcLiveGetAnalysis',
        ...localRequestConfig(),
    });
    return resp.data;
}

async function putAnalysis(request: WcAnalysisRequest): Promise<WcAnalysis> {
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
    error?: string;
}

/**
 * The senseis' shared analysis of a game. Only senseis call this: for anyone
 * else it does nothing and the page shows the live position.
 *
 * Changes show at once on this sensei's board, and poll results are ignored
 * while a change is being saved, so the board does not jump back.
 */
export function useAnalysis(
    roundId: string | undefined,
    enabled: boolean,
    /** The same change the API makes, to show it before the API answers. */
    apply: (current: WcAnalysis, request: WcAnalysisRequest) => WcAnalysis,
): AnalysisApi {
    const [analysis, setAnalysis] = useState<WcAnalysis>();
    const [error, setError] = useState<string>();
    const pending = useRef(0);
    const selectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        setAnalysis(undefined);
        if (!roundId || !enabled) {
            return;
        }
        let cancelled = false;
        const load = () =>
            getAnalysis(roundId)
                .then((a) => {
                    if (!cancelled && pending.current === 0) {
                        setAnalysis(a);
                    }
                })
                .catch(() => undefined);
        void load();
        const timer = setInterval(() => void load(), POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
            clearTimeout(selectTimer.current);
        };
    }, [roundId, enabled]);

    const send = useCallback((request: WcAnalysisRequest) => {
        pending.current++;
        setError(undefined);
        putAnalysis(request)
            .then((saved) => setAnalysis(saved))
            .catch(() => setError('The analysis was not saved. Try again.'))
            .finally(() => {
                pending.current--;
            });
    }, []);

    const change = useCallback(
        (request: WcAnalysisRequest, delay = 0) => {
            // Show it here at once.
            setAnalysis((current) =>
                apply(current ?? { roundId: request.roundId, lines: [], version: 0 }, request),
            );
            clearTimeout(selectTimer.current);
            if (delay) {
                pending.current++;
                selectTimer.current = setTimeout(() => {
                    pending.current--;
                    send(request);
                }, delay);
            } else {
                send(request);
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
    };
}
