export const SUPPORTED_LOCALES = [{ code: 'en', label: 'English' }] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

/** Sets the locale cookie so next-intl picks it up on SSR. */
export function setLocaleCookie(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
