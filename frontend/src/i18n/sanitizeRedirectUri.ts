import { LOCALE_CODES } from './locales';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

// Normalize a ?redirectUri= query param before handing it to next-intl's
// auto-prefixing router. Strips any stale locale prefix so
// router.push('/en/profile') doesn't end up at /en/en/profile, and rejects
// anything that isn't a same-origin absolute path. Allow-list rather than
// deny-list: '/\\evil.com' and '\\evil.com' are protocol-relative in
// browsers that normalize backslashes, so a deny-list against 'http' and
// '//' alone would let those through.
export function sanitizeRedirectUri(raw: string | null | undefined, fallback = '/profile'): string {
    if (!raw) return fallback;
    let decoded: string;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        return fallback;
    }
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) {
        return fallback;
    }
    return decoded.replace(LOCALE_PREFIX_REGEX, '') || '/';
}
