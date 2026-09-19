import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALE_COOKIE_NAME } from './locales';

export const routing = defineRouting({
    locales: LOCALE_CODES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: 'as-needed',
    localeDetection: true,
    // Read by next-intl on bare-URL visits. proxy.ts drops next-intl's own write.
    localeCookie: {
        name: LOCALE_COOKIE_NAME,
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    },
});
