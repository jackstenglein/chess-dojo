import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_CODES } from './locales';

export const routing = defineRouting({
    locales: LOCALE_CODES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: 'always',
    localeDetection: true,
    localeCookie: {
        name: 'locale',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    },
});
