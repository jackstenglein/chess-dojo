import { LOCALE_PREFIX_REGEX } from '@/i18n/locales';

/**
 * Pages that embed a cross-origin video outside the course table.
 * Course modules are decided from course content in the proxy instead.
 *
 * `:path*` matches the page itself and any deeper path. Keep this list
 * aligned with the iframes on those routes.
 */
export const STATIC_VIDEO_PAGE_SOURCES = [
    '/',
    '/profile/:path*',
    '/scoreboard/:path*',
    '/learn/guides',
    '/learn/live-classes',
    '/learn/live-classes/:path*',
    '/learn/sparring',
    '/live-classes',
    '/admin/courses/:path*',
    '/blog/:path*',
    '/admin/blog/:path*',
] as const;

const STATIC_VIDEO_PAGE_PATTERNS = STATIC_VIDEO_PAGE_SOURCES.map(sourceToRegExp);

/** Locale-stripped path without a query string or hash. */
export function canonicalPath(input: string): string {
    const path = input.split(/[?#]/)[0] || '/';
    const stripped = path.replace(LOCALE_PREFIX_REGEX, '') || '/';
    return stripped.length > 1 ? stripped.replace(/\/+$/, '') : stripped;
}

export function isStaticVideoPage(pathname: string): boolean {
    const canonical = canonicalPath(pathname);
    return STATIC_VIDEO_PAGE_PATTERNS.some((pattern) => pattern.test(canonical));
}

function sourceToRegExp(source: string): RegExp {
    if (source === '/') {
        return /^\/$/;
    }

    const body = source
        .split('/')
        .filter(Boolean)
        .map((segment) => {
            if (segment === ':path*') {
                return '(?:/.*)?';
            }
            return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
        })
        .join('');

    return new RegExp(`^${body}$`);
}
