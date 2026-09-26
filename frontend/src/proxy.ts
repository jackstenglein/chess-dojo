import { runWithAmplifyServerContext } from '@/auth/amplifyServerUtils';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_PREFIX_REGEX } from './i18n/locales';
import { routing } from './i18n/routing';
import { logger } from './logging/logger';

const intlMiddleware = createIntlMiddleware(routing);

// Under localePrefix: 'as-needed', the default locale is served at bare URLs
// (e.g. '/profile' for en). Non-default locales keep their prefix
// ('/pseudo/profile', '/de/profile'). Without this carve-out we'd emit '/en/...'
// and rely on next-intl to redirect it back to bare — one extra round-trip per
// auth gate or legacy-route redirect.
function buildPath(locale: string, path: string): string {
    if (path.startsWith('http')) return path;
    return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;
}

const publicPaths = [
    /^\/_next\/.*$/,
    /^\/static\/.*$/,
    /^\/donate$/,
    /^\/help.*/,
    /^\/tournaments$/,
    /^\/tournaments\/liga$/,
    /^\/tournaments\/open-classical$/,
    /^\/tournaments\/open-classical\/info$/,
    /^\/tournaments\/open-classical\/previous$/,
    /^\/courses$/,
    /^\/learn\/books$/,
    /^\/learn\/ratings$/,
    /^\/learn\/guides$/,
    /^\/blog\/?.*$/,
    /^\/coaching$/,
    /^\/dojodigest\/unsubscribe$/,
    /^\/prices$/,
    /^\/clubs$/,
    /^\/games\/.*\/.*$/,
    /^\/profile\/.*\/postmortem\/.*$/,
    /^\/calendar.*$/,
    /^\/live-classes$/,
    /^\/privacy-policy$/,
];

const unauthenticatedPaths = [
    /^\/$/,
    /^\/signin$/,
    /^\/signup$/,
    /^\/verify-email$/,
    /^\/forgot-password$/,
];

const authenticatedRedirects: [RegExp, string][] = [
    [/^\/dojodigest\/unsubscribe$/, '/profile/edit#notifications-email'],
];

const legacyRoutes = [
    { oldPath: '/books-by-rating', newPath: '/learn/books' },
    { oldPath: '/books', newPath: '/learn/books' },
    { oldPath: '/recommendations', newPath: '/learn/books' },
    { oldPath: '/training', newPath: '/profile' },
    { oldPath: '/home', newPath: '/profile' },
    { oldPath: '/plans-pricing', newPath: '/prices' },
    { oldPath: '/shop', newPath: 'https://www.chessdojo.shop/shop' },
    { oldPath: '/material/bots', newPath: '/material/guides' },
    { oldPath: '/material/live-classes', newPath: '/learn/live-classes' },
    { oldPath: '/material/books', newPath: '/learn/books' },
    { oldPath: '/material/sparring', newPath: '/learn/sparring' },
    { oldPath: '/material/modelgames', newPath: '/learn/modelgames' },
    { oldPath: '/material/memorizegames', newPath: '/learn/memorizegames' },
    { oldPath: '/material/guides', newPath: '/learn/guides' },
    { oldPath: '/material/ratings', newPath: '/learn/ratings' },
];

export async function proxy(request: NextRequest) {
    // next-intl answers a non-default locale with a redirect and the default
    // locale with a rewrite. The rewrite is forwarded onto whatever we return.
    let intlResponse: NextResponse | undefined;
    try {
        intlResponse = intlMiddleware(request);
        // Drop next-intl's Set-Cookie, or a prefixed URL becomes a stored preference.
        intlResponse.headers.delete('set-cookie');
    } catch (error) {
        logger.error?.('next-intl middleware threw; falling through', error);
    }
    if (intlResponse?.headers.get('location')) {
        return intlResponse;
    }

    // Forward next-intl's rewrite header, or Next 404s the bare default-locale URL.
    function forwardIntlHeaders(target: NextResponse): NextResponse {
        if (!intlResponse) return target;
        const headers = intlResponse.headers;
        const rewrite = headers.get('x-middleware-rewrite');
        // Not on redirects: a future Next honouring the header there would double-rewrite.
        if (rewrite && !target.headers.get('location')) {
            target.headers.set('x-middleware-rewrite', rewrite);
        }
        return target;
    }

    // Strip the locale prefix so the matchers below stay locale-agnostic.
    const localeMatch = LOCALE_PREFIX_REGEX.exec(request.nextUrl.pathname);
    const locale = localeMatch?.[1] ?? DEFAULT_LOCALE;
    const pathname = request.nextUrl.pathname.replace(LOCALE_PREFIX_REGEX, '') || '/';

    const response = NextResponse.next();

    for (const path of publicPaths) {
        if (pathname.match(path)) {
            return forwardIntlHeaders(response);
        }
    }

    for (const route of legacyRoutes) {
        if (pathname === route.oldPath) {
            return forwardIntlHeaders(
                NextResponse.redirect(new URL(buildPath(locale, route.newPath), request.url)),
            );
        }
    }

    const authenticated = await runWithAmplifyServerContext({
        nextServerContext: { request, response },
        operation: async (contextSpec) => {
            try {
                const session = await fetchAuthSession(contextSpec);
                return (
                    session.tokens?.accessToken !== undefined &&
                    session.tokens?.idToken !== undefined
                );
            } catch (error) {
                logger.error?.(error);
                return false;
            }
        },
    });

    if (authenticated) {
        for (const [path, redirect] of authenticatedRedirects) {
            if (pathname.match(path)) {
                return forwardIntlHeaders(
                    NextResponse.redirect(new URL(buildPath(locale, redirect), request.url)),
                );
            }
        }
    }

    let unauthenticatedPath = false;
    for (const path of unauthenticatedPaths) {
        if (pathname.match(path)) {
            unauthenticatedPath = true;
        }
    }

    if (authenticated !== unauthenticatedPath) {
        return forwardIntlHeaders(response);
    }

    if (authenticated) {
        return forwardIntlHeaders(
            NextResponse.redirect(new URL(buildPath(locale, '/profile'), request.url)),
        );
    }

    // Pass the unprefixed pathname + search so signin's router doesn't
    // double-prefix and the original query string survives the round-trip
    // (e.g. /games/import?source=lichess preserves ?source=lichess).
    // encodeURIComponent preserves '&' and '#' inside the redirect target
    // so the receiving signin route sees the full original path, not a
    // fragment cut off at the first query-string separator.
    const search = request.nextUrl.search;
    return forwardIntlHeaders(
        NextResponse.redirect(
            new URL(
                `${buildPath(locale, '/')}?redirectUri=${encodeURIComponent(pathname + search)}`,
                request.url,
            ),
        ),
    );
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|static|favicon.ico|manifest.json|opengraph-image.png|twitter-image.png).*)',
    ],
};
