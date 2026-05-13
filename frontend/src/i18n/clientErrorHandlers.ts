'use client';

import { logger } from '@/logging/logger';
import { IntlErrorCode, type IntlError } from 'next-intl';

interface MessageFallbackContext {
    error: IntlError;
    key: string;
    namespace?: string;
}

export function onIntlError(error: IntlError): void {
    if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        logger.warn('i18n missing message:', error.message);
    } else {
        logger.error('i18n error:', error);
    }
}

export function getMessageFallback({ namespace, key }: MessageFallbackContext): string {
    return [namespace, key].filter(Boolean).join('.');
}
