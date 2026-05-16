export const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'pseudo', label: '[T] Pseudo' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code) as readonly LocaleCode[];

// The locale cookie is written when the user picks a language in their profile
// so that the next-intl middleware (proxy.ts) can redirect to the correct
// URL-prefixed locale on the next request.
export function setLocaleCookie(locale: string) {
    if (!(LOCALE_CODES as readonly string[]).includes(locale)) return;
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
