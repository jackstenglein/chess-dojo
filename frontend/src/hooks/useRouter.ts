import { isStaticVideoPage } from '@/coep/staticVideoPages';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/i18n/locales';
import { useRouter as useNextRouter, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

function isAbsoluteUrl(href: string): boolean {
    return /^[a-z]+:/i.test(href) || href.startsWith('//');
}

/**
 * A hook that allows you to programmatically change routes inside client components.
 * Crossing between a static video page and an engine page reloads the document so
 * COEP changes. Course pages stay on client-side routing; CoursePage reloads after
 * it knows whether the rendered module embeds a video. Must be invoked inside
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

        const currentHasVideo = isStaticVideoPage(pathname);
        const newHasVideo = isStaticVideoPage(normalized);

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
