'use client';

import {
    getTacticsForgerLeaderboard,
    getTacticsForgerProgress,
    saveTacticsForgerProgress,
} from '@/api/puzzleApi';
import { useAuth } from '@/auth/Auth';
import { SaveTacticsForgerProgressRequest } from '@jackstenglein/chess-dojo-common/src/tacticsTrainer/api';
import { Box } from '@mui/material';
import { AxiosError } from 'axios';
import { useEffect, useRef } from 'react';

/** Messages the embedded app sends. Each one gets a reply with the same id. */
type ForgerRequest =
    | { source: 'tactics-forger'; id: number; type: 'hello' }
    | { source: 'tactics-forger'; id: number; type: 'load' }
    | { source: 'tactics-forger'; id: number; type: 'save'; body: SaveTacticsForgerProgressRequest }
    | { source: 'tactics-forger'; id: number; type: 'leaderboard' };

/**
 * Shows the static Tactics Forger app in a full-height frame and lets it load and save the
 * signed-in user's progress. The app runs in a same-origin iframe and asks over postMessage;
 * this component makes the authenticated API calls and replies with the result (or the HTTP
 * status, so the app can handle 409 conflicts).
 */
export function TacticsForgerFrame({ src }: { src: string }) {
    const frame = useRef<HTMLIFrameElement>(null);
    const { user } = useAuth();

    useEffect(() => {
        const onMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.source !== frame.current?.contentWindow) return;
            const msg = event.data as ForgerRequest;
            if (msg?.source !== 'tactics-forger' || typeof msg.id !== 'number') return;

            const reply = (payload: Record<string, unknown>) =>
                frame.current?.contentWindow?.postMessage(
                    { source: 'tactics-forger-host', id: msg.id, ...payload },
                    window.location.origin,
                );
            try {
                switch (msg.type) {
                    case 'hello':
                        // The app says hello until this listener is up, then starts loading.
                        // The cohort lets it suggest where to start.
                        reply({ ok: true, username: user?.username, cohort: user?.dojoCohort });
                        break;
                    case 'load': {
                        const res = await getTacticsForgerProgress();
                        reply({
                            ok: true,
                            data: res.data,
                            username: user?.username,
                            cohort: user?.dojoCohort,
                        });
                        break;
                    }
                    case 'save': {
                        const res = await saveTacticsForgerProgress(msg.body);
                        reply({ ok: true, data: res.data });
                        break;
                    }
                    case 'leaderboard': {
                        const res = await getTacticsForgerLeaderboard();
                        reply({ ok: true, data: res.data, username: user?.username });
                        break;
                    }
                }
            } catch (err) {
                reply({ ok: false, status: (err as AxiosError).response?.status ?? 0 });
            }
        };
        const listener = (event: MessageEvent) => void onMessage(event);
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, [user?.username]);

    return (
        <Box
            component='iframe'
            ref={frame}
            title='Dojo Tactics Forger'
            src={src}
            sx={{
                display: 'block',
                width: 1,
                height: 'calc(100dvh - var(--navbar-height))',
                border: 0,
            }}
        />
    );
}
