'use client';

import {
    GUEST_LINK_PARAM,
    guestToken,
    WcGuestMe,
} from '@jackstenglein/chess-dojo-common/src/wcLive/guests';
import { useCallback, useEffect, useState } from 'react';
import { guestMe } from './wcLiveApi';

/** Where this browser keeps a guest link, so a refresh keeps guest mode. */
const STORAGE_KEY = 'wcLive.guestToken';

function readStored(): string | undefined {
    try {
        return localStorage.getItem(STORAGE_KEY) ?? undefined;
    } catch {
        return undefined;
    }
}

function store(token: string | undefined) {
    try {
        if (token) {
            localStorage.setItem(STORAGE_KEY, token);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Private windows can refuse storage; guest mode then lasts until a refresh.
    }
}

export interface GuestAccess {
    /** The guest this browser acts as, once the link is checked. */
    guest?: WcGuestMe;
    token?: string;
    /** Set when the link no longer works. */
    error?: string;
    /** Leaves guest mode in this browser. */
    leave: () => void;
}

/**
 * Guest mode, from a sensei's guest link (?guest=<token>). The token is kept
 * in this browser and taken out of the address bar, so it does not show on
 * screen or on stream. The API checks it on every request.
 */
export function useGuestAccess(): GuestAccess {
    const [token, setToken] = useState<string>();
    const [guest, setGuest] = useState<WcGuestMe>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        const url = new URL(window.location.href);
        const fromLink = url.searchParams.get(GUEST_LINK_PARAM);
        if (fromLink !== null) {
            url.searchParams.delete(GUEST_LINK_PARAM);
            // The form Next.js documents, so its router takes the new address as
            // its own and does not put the token back later.
            window.history.replaceState(null, '', url.toString());
        }
        const candidate = fromLink ?? readStored();
        if (!candidate) {
            return;
        }
        if (!guestToken.safeParse(candidate).success) {
            store(undefined);
            setError('This guest link is not complete. Copy the whole link and try again.');
            return;
        }
        store(candidate);
        setToken(candidate);
    }, []);

    useEffect(() => {
        if (!token) {
            return;
        }
        let cancelled = false;
        guestMe(token)
            .then((me) => {
                if (!cancelled) {
                    setGuest(me);
                    setError(undefined);
                }
            })
            .catch((err: { response?: { status?: number } }) => {
                if (cancelled) {
                    return;
                }
                if (err.response?.status === 403 || err.response?.status === 400) {
                    store(undefined);
                    setToken(undefined);
                    setGuest(undefined);
                    setError('This guest link no longer works. Ask a sensei for a new one.');
                } else {
                    setError('Could not check the guest link. Refresh to try again.');
                }
            });
        return () => {
            cancelled = true;
        };
    }, [token]);

    const leave = useCallback(() => {
        store(undefined);
        setToken(undefined);
        setGuest(undefined);
        setError(undefined);
    }, []);

    return { guest, token: guest ? token : undefined, error, leave };
}
