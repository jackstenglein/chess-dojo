import { DEFAULT_LOCALE, LOCALE_CODES } from '@/i18n/locales';
import { useRouter as useNextRouter, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

function isAbsoluteUrl(href: string): boolean {
    return /^[a-z]+:/i.test(href) || href.startsWith('//');
}

// Regexes match the locale-stripped pathname returned by next-intl's
// usePathname(). Do NOT prefix with /${locale} — next.config.mjs handles
// COEP-header source matching separately via its own flatMap that emits
// both bare and prefixed variants.
export const pagesWithVideos = [
    /^\/$/,
    /\/profile.*/,
    /\/scoreboard\/.*/,
    /^\/learn\/guides$/,
    /^\/learn\/live-classes$/,
    /^\/learn\/live-classes\/.+$/,
    /^\/live-classes$/,
    /^\/admin\/courses/,

    // Blog
    /^\/admin\/blog/,
    /^\/blog/,

    // K+P Endings
    /^\/courses\/ENDGAME\/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0\/(1|2|4|5|6|7|8|9|10|11)\/1$/,
    /^\/courses\/ENDGAME\/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0\/(3|4|5|7)\/2$/,

    // French Defense Starter
    /^\/courses\/OPENING\/0e144cc9-be12-48f2-a3b0-92596fa2559d(\/0\/0)?$/,

    // Aggressive e4 Repertoire
    /^\/courses\/OPENING\/2402cb47-d65a-4914-bc11-8f60eb32e41a(\/(0|1|2|3|5)\/0)?$/,

    // Caro Kann Starter
    /^\/courses\/OPENING\/37dd0c09-7622-4e87-b0df-7d3e6b37e410(\/0\/0)?$/,

    // Najdorf Starter
    /^\/courses\/OPENING\/b042a392-e285-4466-9bc0-deeecc2ce16c(\/0\/0)?$/,

    // KID Expert
    /^\/courses\/OPENING\/d30581c8-f2c4-4d1c-8a5e-f303a83cc193(\/[0-4]\/0)?$/,

    // Basic Board Visualization
    /^\/courses\/WORKSHOP\/6746ee1a-d029-4ff0-89e2-962a5c64a6b6/,

    // Endgame Fundamentals
    /^\/courses\/WORKSHOP\/7ab589de-becd-4450-932e-dfc8a1f45a1b/,

    // Logical Chess Move by Move
    /^\/courses\/WORKSHOP\/d461daae-a554-460a-83e5-54d53b93c4de/,

    // Calculation Training
    /^\/courses\/WORKSHOP\/acc594b7-f2fa-4b84-b53d-76c5a6bc14c2$/,
    /^\/courses\/WORKSHOP\/acc594b7-f2fa-4b84-b53d-76c5a6bc14c2\/0\/0/,
    /^\/courses\/WORKSHOP\/acc594b7-f2fa-4b84-b53d-76c5a6bc14c2\/.+\/1/,
];

/**
 * A hook that allows you to programmatically change routes inside client components.
 * If the route includes a video (and therefore needs headers to be reloaded), a
 * hard reload is used instead of client-side routing. Must be invoked inside
 * NextIntlClientProvider (guaranteed by app/[locale]/layout.tsx).
 */
export function useRouter() {
    const router = useNextRouter();
    const pathname = usePathname();
    const locale = useLocale();

    const push = (href: string, options?: { scroll?: boolean; locale?: string }) => {
        // Absolute URLs (Stripe checkout, OAuth callbacks, etc.) skip both
        // locale-prefixing and video-boundary logic.
        if (isAbsoluteUrl(href)) {
            window.location.href = href;
            return;
        }

        // Strip any stale locale prefix so soft-push doesn't double-prefix and
        // the video regex matches against the canonical unprefixed form.
        const normalized = href.replace(LOCALE_PREFIX_REGEX, '') || '/';
        const targetLocale = options?.locale ?? locale;

        let currentHasVideo = false;
        let newHasVideo = false;

        for (const page of pagesWithVideos) {
            if (!currentHasVideo && pathname.match(page)) {
                currentHasVideo = true;
            }
            if (!newHasVideo && normalized.match(page)) {
                newHasVideo = true;
            }
        }

        if (currentHasVideo === newHasVideo) {
            router.push(normalized, options);
        } else if (targetLocale === DEFAULT_LOCALE) {
            window.location.href = normalized;
        } else {
            window.location.href = `/${targetLocale}${normalized}`;
        }
    };

    return {
        ...router,
        push,
    };
}
