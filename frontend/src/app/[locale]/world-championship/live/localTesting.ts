'use client';

import { useEffect, useState } from 'react';

/**
 * Local testing only. NEXT_PUBLIC_WC_LIVE_API_URL is set by the local launcher,
 * which points the page at the local wcLive server. It is never set on the
 * real site, so nothing here does anything there.
 */
export const LOCAL_API_URL = process.env.NEXT_PUBLIC_WC_LIVE_API_URL;

const USERNAME = /^[A-Za-z0-9_.@+-]{1,64}$/;

/**
 * ?as=<username> on a local run: the page acts as that user, and the local
 * server believes it. This is how senseis are tested locally, since the dev
 * site cannot sign in with production accounts.
 */
export function readActAs(): string | undefined {
    if (!LOCAL_API_URL || typeof window === 'undefined') {
        return undefined;
    }
    const as = new URLSearchParams(window.location.search).get('as');
    return as && USERNAME.test(as) ? as : undefined;
}

export function useActAs(): string | undefined {
    const [actAs, setActAs] = useState<string>();
    useEffect(() => setActAs(readActAs()), []);
    return actAs;
}

/** Axios options for the wcLive calls: the local server, and who to act as. */
export function localRequestConfig(): { baseURL?: string; headers?: Record<string, string> } {
    if (!LOCAL_API_URL) {
        return {};
    }
    const as = readActAs();
    return { baseURL: LOCAL_API_URL, ...(as ? { headers: { 'X-Wc-Live-As': as } } : {}) };
}
