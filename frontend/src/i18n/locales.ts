export const SUPPORTED_LOCALES = [{ code: 'en', label: 'English' }] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES: string[] = SUPPORTED_LOCALES.map((l) => l.code);

// The locale cookie is read client-side by I18nProvider to switch locale
// after server-rendered English. For server-side locale detection,
// see Phase C plan (locale-prefixed URLs via proxy.ts).
export function setLocaleCookie(locale: string) {
    if (!LOCALE_CODES.includes(locale)) return;
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
