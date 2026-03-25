export const SUPPORTED_LOCALES = [{ code: 'en', label: 'English' }] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES: string[] = SUPPORTED_LOCALES.map((l) => l.code);

// TODO (#1997): This cookie is not read server-side yet. It will be used
// when locale-prefixed URLs are added via proxy.ts. For now it persists
// the user's preference in the browser for future use.
export function setLocaleCookie(locale: string) {
    if (!LOCALE_CODES.includes(locale)) return;
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
