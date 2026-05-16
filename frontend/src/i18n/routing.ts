import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_CODES } from './locales';

export const routing = defineRouting({
    locales: LOCALE_CODES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: 'always',
    localeDetection: true,
    // Name + maxAge must match setLocaleCookie in locales.ts. Without an
    // explicit maxAge next-intl writes a session cookie that silently
    // downgrades the picker's 1-year cookie on every detection redirect.
    localeCookie: {
        name: 'locale',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    },
});
