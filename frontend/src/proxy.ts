import { runWithAmplifyServerContext } from '@/auth/amplifyServerUtils';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_CODES } from './i18n/locales';
import { routing } from './i18n/routing';
import { logger } from './logging/logger';

const intlMiddleware = createIntlMiddleware(routing);

// Derived from LOCALE_CODES so adding a locale in locales.ts covers every
// matcher site. A hard-coded alternation here would silently strip new
// locales and emit wrong-prefix redirects.
if (LOCALE_CODES.length === 0) {
    throw new Error('proxy: LOCALE_CODES is empty; SUPPORTED_LOCALES must have at least one entry');
}
const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

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
    // Run next-intl first. For non-default locales it returns a redirect
    // (Location header); for the default locale under as-needed it returns
    // a rewrite (x-middleware-rewrite) with no Location. If it's a redirect,
    // short-circuit now. Otherwise fall through and forward its rewrite +
    // cookie headers onto whatever the auth/legacy logic decides to return.
    let intlResponse: NextResponse | undefined;
    try {
        intlResponse = intlMiddleware(request);
    } catch (error) {
        logger.error?.('next-intl middleware threw; falling through', error);
    }
    if (intlResponse?.headers.get('location')) {
        return intlResponse;
    }

    // Under as-needed, next-intl rewrites bare default-locale URLs internally
    // via x-middleware-rewrite (no Location header) and sets a Set-Cookie on
    // first visits. We must forward both onto our own response or Next will
    // 404 the bare URL (no [locale] segment match) and the locale cookie will
    // be lost forever. getSetCookie() returns each cookie separately; fall
    // back to get('set-cookie') for runtimes that don't expose it.
    function forwardIntlHeaders(target: NextResponse): NextResponse {
        if (!intlResponse) return target;
        const headers = intlResponse.headers;
        const rewrite = headers.get('x-middleware-rewrite');
        // x-middleware-rewrite is meaningless on a redirect response and Next
        // currently ignores it there, but a future version honouring it would
        // double-rewrite. Gate to pass-through responses only.
        if (rewrite && !target.headers.get('location')) {
            target.headers.set('x-middleware-rewrite', rewrite);
        }

        const cookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
        if (cookies.length > 0) {
            for (const cookie of cookies) {
                target.headers.append('set-cookie', cookie);
            }
        } else {
            const single = headers.get('set-cookie');
            if (single) target.headers.append('set-cookie', single);
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
