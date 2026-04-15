'use client';

import { logger } from '@/logging/logger';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import enMessages from '../../messages/en.json';
import pseudoMessages from '../../messages/pseudo.json';
import { getMessageFallback, onIntlError } from './clientErrorHandlers';
import { DEFAULT_LOCALE } from './locales';
import { stripMeta } from './stripMeta';

// Ship messages via static import so they live in a shared client JS chunk.
// Passing `messages` as a prop from a server component forces next-intl to
// serialize the full bundle into every page's RSC payload, inflating the
// build past Amplify's 230 MB limit.
export const MESSAGES_BY_LOCALE: Record<string, AbstractIntlMessages> = {
    en: stripMeta(enMessages as AbstractIntlMessages),
    pseudo: stripMeta(pseudoMessages as AbstractIntlMessages),
};

export function StaticIntlClientProvider({
    locale,
    children,
}: {
    locale: string;
    children: ReactNode;
}) {
    const bundle = MESSAGES_BY_LOCALE[locale];
    if (!bundle) {
        logger.warn(
            `[i18n] StaticIntlClientProvider: no bundle for locale "${locale}"; falling back to ${DEFAULT_LOCALE}.`,
        );
    }
    const messages = bundle ?? MESSAGES_BY_LOCALE[DEFAULT_LOCALE];
    return (
        <NextIntlClientProvider
            locale={locale}
            messages={messages}
            onError={onIntlError}
            getMessageFallback={getMessageFallback}
        >
            {children}
        </NextIntlClientProvider>
    );
}
