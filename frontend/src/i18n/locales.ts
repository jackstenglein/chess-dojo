export const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'pseudo', label: '[T] Pseudo' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'pt', label: 'Português' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code) as readonly LocaleCode[];

export const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

/** Strips the locale prefix from an absolute URL. Copied links must not carry the reader's language. */
export function stripLocalePrefixFromUrl(href: string): string {
    const url = new URL(href);
    url.pathname = url.pathname.replace(LOCALE_PREFIX_REGEX, '');
    return url.href;
}

export const LOCALE_COOKIE_NAME = 'locale';

/** Stores the chosen locale. The middleware reads it on bare-URL visits. The server never writes it. */
export function setLocaleCookie(locale: string) {
    if (!(LOCALE_CODES as readonly string[]).includes(locale)) return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
}
