import { LOCALE_CODES } from './locales';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

// Normalize a ?redirectUri= query param before handing it to next-intl's
// auto-prefixing router. Strips any stale locale prefix so
// router.push('/en/profile') doesn't end up at /en/en/profile, and
// rejects external URLs so a crafted redirectUri=https://evil.com can't
// bounce the user off-site after signin.
export function sanitizeRedirectUri(raw: string | null | undefined, fallback = '/profile'): string {
    if (!raw) return fallback;
    let decoded: string;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        return fallback;
    }
    if (decoded.startsWith('http') || decoded.startsWith('//')) {
        return fallback;
    }
    return decoded.replace(LOCALE_PREFIX_REGEX, '') || '/';
}
