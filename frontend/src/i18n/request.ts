import { logger } from '@/logging/logger';
import { AbstractIntlMessages, hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE } from './locales';
import { routing } from './routing';
import { stripMeta } from './stripMeta';

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    let locale: string;
    if (hasLocale(routing.locales, requested)) {
        locale = requested;
    } else {
        if (requested !== undefined) {
            logger.warn(
                `[i18n] requestLocale "${requested}" not in routing.locales; falling back to ${DEFAULT_LOCALE}.`,
            );
        }
        locale = DEFAULT_LOCALE;
    }

    let messages: AbstractIntlMessages = {};
    try {
        const imported = (await import(`../../messages/${locale}.json`)) as {
            default: AbstractIntlMessages;
        };
        messages = stripMeta(imported.default);
    } catch (err) {
        logger.error(`[i18n] Failed to load messages for locale "${locale}".`, err);
    }

    return {
        locale,
        messages,
    };
});
