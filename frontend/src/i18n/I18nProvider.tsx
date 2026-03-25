'use client';

import { DEFAULT_LOCALE, LOCALE_CODES } from '@/i18n/locales';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';

function getLocaleCookie(): string {
    if (typeof document === 'undefined') return DEFAULT_LOCALE;
    const match = /(?:^|; )locale=([^;]*)/.exec(document.cookie);
    const value = match?.[1] ?? DEFAULT_LOCALE;
    return LOCALE_CODES.includes(value) ? value : DEFAULT_LOCALE;
}

export function I18nProvider({
    defaultLocale,
    defaultMessages,
    children,
}: {
    defaultLocale: string;
    defaultMessages: AbstractIntlMessages;
    children: React.ReactNode;
}) {
    const [locale, setLocale] = useState(defaultLocale);
    const [messages, setMessages] = useState(defaultMessages);

    useEffect(() => {
        const cookieLocale = getLocaleCookie();
        if (cookieLocale !== locale) {
            import(`../../messages/${cookieLocale}.json`)
                .then((mod: { default: AbstractIntlMessages }) => {
                    setLocale(cookieLocale);
                    setMessages(mod.default);
                })
                .catch(() => {
                    // Failed to load messages for this locale, stay on current
                });
        }
    }, [locale]);

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
        </NextIntlClientProvider>
    );
}
