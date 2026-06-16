export const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'pseudo', label: '[T] Pseudo' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code) as readonly LocaleCode[];

export function setLocaleCookie(locale: string) {
    if (!(LOCALE_CODES as readonly string[]).includes(locale)) return;
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
