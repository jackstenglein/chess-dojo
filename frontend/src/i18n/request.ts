import { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE } from './locales';

export default getRequestConfig(async () => {
    // TODO (#1997): When locale-prefixed URLs are added (e.g. /de/blog),
    // read the locale from requestLocale or proxy.ts instead of hardcoding.
    // Currently hardcoded because accessing requestLocale triggers headers()
    // internally in next-intl, which forces all pages into dynamic rendering
    // and breaks static generation (DYNAMIC_SERVER_USAGE errors in CI).
    const locale = DEFAULT_LOCALE;

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
