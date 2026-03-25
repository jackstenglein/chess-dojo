import { AbstractIntlMessages, hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_CODES } from './locales';

export default getRequestConfig(async ({ requestLocale }) => {
    // Use next-intl's requestLocale first (from middleware/routing, if configured).
    // Fall back to cookie, then default. The try-catch around cookies() prevents
    // DYNAMIC_SERVER_USAGE errors during static generation.
    let requested = await requestLocale;
    if (!requested) {
        try {
            const store = await cookies();
            requested = store.get('locale')?.value;
        } catch {
            // cookies() throws during static generation - fall back to default
        }
    }
    const locale = hasLocale(LOCALE_CODES, requested) ? requested : DEFAULT_LOCALE;

    let messages: AbstractIntlMessages = {};
    try {
        const imported = (await import(`../../messages/${locale}.json`)) as {
            default: AbstractIntlMessages;
        };
        messages = imported.default;
    } catch (err) {
        // Fall back to empty messages so translation keys display as-is
        // (better than a white page), but log so we can detect the problem.
        // eslint-disable-next-line no-console
        console.error(`[i18n] Failed to load messages for locale "${locale}".`, err);
    }

    return {
        locale,
        messages,
    };
});
