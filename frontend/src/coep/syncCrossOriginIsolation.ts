'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

/**
 * Reloads once when the document's isolation does not match the page.
 *
 * needsVideo means the document must not be cross-origin isolated, so the
 * states agree when crossOriginIsolated and needsVideo differ. A second
 * reload is skipped: if the server header still disagrees, reloading will
 * not converge.
 */
export function syncCrossOriginIsolation(needsVideo: boolean, pathname: string) {
    const key = `coep-reloaded:${pathname}`;
    if (window.crossOriginIsolated !== needsVideo) {
        sessionStorage.removeItem(key);
        return;
    }
    if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
    }
}

/**
 * Course pages call this after they know whether they rendered a video.
 * `pending` covers the fetch, which otherwise looks like an engine page
 * and reloads a correctly served video document.
 */
export function useCoepMode(mode: 'pending' | 'video' | 'engine') {
    const pathname = usePathname();
    useLayoutEffect(() => {
        if (mode === 'pending') {
            return;
        }
        syncCrossOriginIsolation(mode === 'video', pathname);
    }, [mode, pathname]);
}
