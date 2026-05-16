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

function withPrefix(prefix: string, path: string): string {
    if (path.startsWith('http')) return path;
    return `${prefix}${path}`;
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
    // Run next-intl first so bare URLs get redirected to /<locale>/<path>
    // before auth/legacy matchers see them. Try/catch keeps a library throw
    // from 500'ing every page.
    let intlResponse: NextResponse | undefined;
    try {
        intlResponse = intlMiddleware(request);
    } catch (error) {
        logger.error?.('next-intl middleware threw; falling through', error);
    }
    if (intlResponse?.headers.get('location')) {
        return intlResponse;
    }

    // Strip the locale prefix so the matchers below stay locale-agnostic.
    const localeMatch = LOCALE_PREFIX_REGEX.exec(request.nextUrl.pathname);
    const locale = localeMatch?.[1] ?? DEFAULT_LOCALE;
    const prefix = `/${locale}`;
    const pathname = request.nextUrl.pathname.replace(LOCALE_PREFIX_REGEX, '') || '/';

    const response = NextResponse.next();

    for (const path of publicPaths) {
        if (pathname.match(path)) {
            return response;
        }
    }

    for (const route of legacyRoutes) {
        if (pathname === route.oldPath) {
            return NextResponse.redirect(new URL(withPrefix(prefix, route.newPath), request.url));
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
                return NextResponse.redirect(new URL(withPrefix(prefix, redirect), request.url));
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
        return response;
    }

    if (authenticated) {
        return NextResponse.redirect(new URL(`${prefix}/profile`, request.url));
    }

    // Pass the unprefixed pathname so signin's router doesn't double-prefix.
    return NextResponse.redirect(new URL(`${prefix}/?redirectUri=${pathname}`, request.url));
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|opengraph-image.png|twitter-image.png).*)',
    ],
};
