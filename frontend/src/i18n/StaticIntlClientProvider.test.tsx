import { cleanup, render, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCALE_CODES } from './locales';
import { MESSAGES_BY_LOCALE, StaticIntlClientProvider } from './StaticIntlClientProvider';

function Consumer() {
    const t = useTranslations('common');
    return <div data-testid='timezone'>{t('timezone')}</div>;
}

describe('StaticIntlClientProvider', () => {
    afterEach(cleanup);

    it('renders en messages for locale="en"', () => {
        render(
            <StaticIntlClientProvider locale='en'>
                <Consumer />
            </StaticIntlClientProvider>,
        );
        expect(screen.getByTestId('timezone').textContent).toBe('Timezone');
    });

    it('renders pseudo messages for locale="pseudo"', () => {
        render(
            <StaticIntlClientProvider locale='pseudo'>
                <Consumer />
            </StaticIntlClientProvider>,
        );
        expect(screen.getByTestId('timezone').textContent).toBe('[T] Timezone');
    });

    it('falls back to the default locale for an unknown locale', () => {
        render(
            <StaticIntlClientProvider locale='zz'>
                <Consumer />
            </StaticIntlClientProvider>,
        );
        expect(screen.getByTestId('timezone').textContent).toBe('Timezone');
    });

    it('has a message bundle for every code in LOCALE_CODES', () => {
        const bundleKeys = Object.keys(MESSAGES_BY_LOCALE).sort();
        const localeKeys = [...LOCALE_CODES].sort();
        expect(bundleKeys).toEqual(localeKeys);
    });
});
