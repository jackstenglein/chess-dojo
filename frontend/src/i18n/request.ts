import { AbstractIntlMessages, hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_CODES } from './locales';

export default getRequestConfig(async () => {
    const store = await cookies();
    const requested = store.get('locale')?.value;
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
