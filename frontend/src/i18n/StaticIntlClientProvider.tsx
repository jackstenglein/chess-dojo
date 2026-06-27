'use client';

import { logger } from '@/logging/logger';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import deMessages from '../../messages/de.json';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import frMessages from '../../messages/fr.json';
import pseudoMessages from '../../messages/pseudo.json';
import ptMessages from '../../messages/pt.json';
import { getMessageFallback, onIntlError } from './clientErrorHandlers';
import { DEFAULT_LOCALE } from './locales';
import { stripMeta } from './stripMeta';

export const MESSAGES_BY_LOCALE: Record<string, AbstractIntlMessages> = {
    en: stripMeta(enMessages),
    pseudo: stripMeta(pseudoMessages),
    de: stripMeta(deMessages),
    fr: stripMeta(frMessages),
    es: stripMeta(esMessages),
    pt: stripMeta(ptMessages),
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
