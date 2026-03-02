import { runWithAmplifyServerContext } from '@/auth/amplifyServerUtils';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logging/logger';

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
    const { pathname } = request.nextUrl;
    const response = NextResponse.next();

    for (const path of publicPaths) {
        if (pathname.match(path)) {
            return response;
        }
    }

    for (const route of legacyRoutes) {
        if (pathname === route.oldPath) {
            return NextResponse.redirect(new URL(route.newPath, request.url));
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
                return NextResponse.redirect(new URL(redirect, request.url));
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
        return NextResponse.redirect(new URL('/profile', request.url));
    }

    return NextResponse.redirect(new URL(`/?redirectUri=${pathname}`, request.url));
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - opengraph-image.png
         * - twitter-image.png
         */
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|opengraph-image.png|twitter-image.png).*)',
    ],
};
