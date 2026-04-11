'use client';

import { DEFAULT_LOCALE, LOCALE_CODES } from '@/i18n/locales';
import { logger } from '@/logging/logger';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';
import enMessages from '../../messages/en.json';

function getLocaleCookie(): string {
    if (typeof document === 'undefined') return DEFAULT_LOCALE;
    const match = /(?:^|; )locale=([^;]*)/.exec(document.cookie);
    const value = match?.[1] ?? DEFAULT_LOCALE;
    return LOCALE_CODES.includes(value) ? value : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<string>(DEFAULT_LOCALE);
    const [messages, setMessages] = useState<AbstractIntlMessages>(
        enMessages as AbstractIntlMessages,
    );

    useEffect(() => {
        const cookieLocale = getLocaleCookie();
        if (cookieLocale !== locale) {
            import(`../../messages/${cookieLocale}.json`)
                .then((mod: { default: AbstractIntlMessages }) => {
                    setLocale(cookieLocale);
                    setMessages(mod.default);
                })
                .catch((err: unknown) => {
                    logger.error?.('Failed to load messages for locale:', cookieLocale, err);
                });
        }
    }, [locale]);

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
        </NextIntlClientProvider>
    );
}
