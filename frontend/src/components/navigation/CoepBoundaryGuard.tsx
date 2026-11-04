'use client';

import { isCourseContentPath } from '@/coep/courseCoep';
import { canonicalPath, isStaticVideoPage } from '@/coep/staticVideoPages';
import { syncCrossOriginIsolation } from '@/coep/syncCrossOriginIsolation';
// next/navigation, not @/i18n/navigation, so this can mount above the intl provider.
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Reloads the page when its cross-origin-isolation state doesn't match the
 * route. Engine pages need isolation (COEP require-corp) for Stockfish; static
 * video pages need it off (unsafe-none) for cross-origin iframes. A soft
 * navigation across that boundary keeps the previous page's headers.
 *
 * Course URLs are skipped. The course body loads after first paint, and
 * CoursePage reloads once it knows whether that body embeds a video.
 */
export function CoepBoundaryGuard() {
    const pathname = usePathname();

    useEffect(() => {
        const canonical = canonicalPath(pathname);
        if (isCourseContentPath(canonical)) {
            return;
        }
        syncCrossOriginIsolation(isStaticVideoPage(canonical), pathname);
    }, [pathname]);

    return null;
}
