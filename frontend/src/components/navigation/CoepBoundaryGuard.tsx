'use client';

import { pagesWithVideos } from '@/hooks/useRouter';
import { LOCALE_CODES } from '@/i18n/locales';
// next/navigation, not @/i18n/navigation, so this can mount above the intl provider.
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

function canonicalPath(input: string): string {
    const noQuery = input.split('?')[0].split('#')[0];
    return noQuery.replace(LOCALE_PREFIX_REGEX, '') || '/';
}

function isVideoPage(pathname: string): boolean {
    return pagesWithVideos.some((page) => pathname.match(page));
}

/**
 * Reloads the page when its cross-origin-isolation state doesn't match the
 * route. Engine pages need isolation (COEP require-corp) for Stockfish; video
 * pages need it off (unsafe-none) for cross-origin iframes. A soft navigation
 * across that boundary keeps the previous page's headers, breaking videos on
 * `/profile` etc. (#2315). We let navigation proceed — preserving page-level
 * unsaved-changes prompts — then hard reload to fetch the correct headers.
 */
export function CoepBoundaryGuard() {
    const pathname = usePathname();

    useEffect(() => {
        const needsVideo = isVideoPage(canonicalPath(pathname));
        const key = `coep-reloaded:${pathname}`;

        if (window.crossOriginIsolated !== needsVideo) {
            sessionStorage.removeItem(key);
            return;
        }

        // Reload once per path: a stuck marker means the server headers disagree
        // with pagesWithVideos, where reloading again would never converge.
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
        }
    }, [pathname]);

    return null;
}
