import { LOCALE_CODES } from './locales';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

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
