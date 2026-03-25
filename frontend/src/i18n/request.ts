import { AbstractIntlMessages, hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const locales = ['en'] as const;

export default getRequestConfig(async () => {
    const store = await cookies();
    const requested = store.get('locale')?.value;
    const locale = hasLocale(locales, requested) ? requested : 'en';

    let messages: AbstractIntlMessages = {};
    try {
        const imported = (await import(`../../messages/${locale}.json`)) as {
            default: AbstractIntlMessages;
        };
        messages = imported.default;
    } catch {
        // If the messages file fails to load, the app renders with empty messages.
        // Translation keys will display as-is, which is better than a white page.
    }

    return {
        locale,
        messages,
    };
});
