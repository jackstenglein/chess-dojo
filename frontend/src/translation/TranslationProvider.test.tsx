import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockListTranslations } = vi.hoisted(() => ({
    mockListTranslations: vi.fn(),
}));
vi.mock('@/api/translationApi', () => ({
    listTranslations: mockListTranslations,
}));

const { mockLogger } = vi.hoisted(() => ({
    mockLogger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/logging/logger', () => ({ logger: mockLogger }));

import { useTranslationContext } from './TranslationContext';
import { TranslationProvider } from './TranslationProvider';

function Consumer() {
    const { translations, fetchFailed } = useTranslationContext();
    return (
        <div>
            <div data-testid='count'>{translations.size}</div>
            <div data-testid='failed'>{String(fetchFailed)}</div>
        </div>
    );
}

function renderWithLocale(locale: string) {
    return render(
        <NextIntlClientProvider locale={locale} messages={{}}>
            <TranslationProvider>
                <Consumer />
            </TranslationProvider>
        </NextIntlClientProvider>,
    );
}

describe('TranslationProvider', () => {
    beforeEach(() => {
        mockListTranslations.mockReset();
        mockLogger.debug.mockReset();
        mockLogger.warn.mockReset();
        mockLogger.error.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('makes no API calls on the default locale', async () => {
        renderWithLocale('en');
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(mockListTranslations).not.toHaveBeenCalled();
        expect(screen.getByTestId('count').textContent).toBe('0');
        expect(screen.getByTestId('failed').textContent).toBe('false');
    });

    it('fetches both content types and merges results when locale is non-default', async () => {
        mockListTranslations.mockImplementation((_locale: string, contentType: string) => {
            if (contentType === 'REQUIREMENT') {
                return Promise.resolve([
                    {
                        contentType: 'REQUIREMENT',
                        contentKey: 'REQUIREMENT#r1',
                        locale: 'pseudo',
                        name: '[T] Req 1',
                        shortName: '[T] Short 1',
                        dailyName: '[T] Daily 1',
                        description: '[T] Desc 1',
                        freeDescription: '[T] Free 1',
                        progressBarSuffix: '[T] Suffix 1',
                        updatedAt: '2026-04-14',
                        updatedBy: 'admin',
                    },
                ]);
            }
            return Promise.resolve([
                {
                    contentType: 'COURSE',
                    contentKey: 'COURSE#c1',
                    locale: 'pseudo',
                    name: '[T] Course 1',
                    description: '[T] Course desc',
                    whatsIncluded: [],
                    chapters: [],
                    updatedAt: '2026-04-14',
                    updatedBy: 'admin',
                },
            ]);
        });

        renderWithLocale('de');

        await waitFor(() => {
            expect(screen.getByTestId('count').textContent).toBe('2');
        });
        expect(mockListTranslations).toHaveBeenCalledWith('de', 'REQUIREMENT');
        expect(mockListTranslations).toHaveBeenCalledWith('de', 'COURSE');
        expect(screen.getByTestId('failed').textContent).toBe('false');
    });

    it('sets fetchFailed and logs when both channels fail', async () => {
        mockListTranslations.mockRejectedValue(new Error('network down'));

        renderWithLocale('de');

        await waitFor(() => {
            expect(screen.getByTestId('failed').textContent).toBe('true');
        });
        expect(
            await screen.findByText('Failed to load translations. Showing English.'),
        ).toBeInTheDocument();
        expect(mockLogger.error).toHaveBeenCalled();
    });

    it('keeps fulfilled channel data and flags partial failure when only one channel rejects', async () => {
        mockListTranslations.mockImplementation((_locale: string, contentType: string) => {
            if (contentType === 'REQUIREMENT') {
                return Promise.resolve([
                    {
                        contentType: 'REQUIREMENT',
                        contentKey: 'REQUIREMENT#r1',
                        locale: 'pseudo',
                        name: '[T] Req 1',
                        shortName: '[T] Short 1',
                        dailyName: '[T] Daily 1',
                        description: '[T] Desc 1',
                        freeDescription: '[T] Free 1',
                        progressBarSuffix: '[T] Suffix 1',
                        updatedAt: '2026-04-14',
                        updatedBy: 'admin',
                    },
                ]);
            }
            return Promise.reject(new Error('COURSE channel down'));
        });

        renderWithLocale('de');

        await waitFor(() => {
            expect(screen.getByTestId('count').textContent).toBe('1');
        });
        expect(screen.getByTestId('failed').textContent).toBe('true');
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Course translation fetch failed for locale',
            'de',
            expect.any(Error),
        );
    });

    it('fetches translations for pseudo (DB-overlay canary locale)', async () => {
        mockListTranslations.mockImplementation((_locale: string, contentType: string) => {
            if (contentType === 'REQUIREMENT') {
                return Promise.resolve([
                    {
                        contentType: 'REQUIREMENT',
                        contentKey: 'REQUIREMENT#r1',
                        locale: 'pseudo',
                        name: '[T] Req 1',
                        shortName: '[T] Short 1',
                        dailyName: '[T] Daily 1',
                        description: '[T] Desc 1',
                        freeDescription: '[T] Free 1',
                        progressBarSuffix: '[T] Suffix 1',
                        updatedAt: '2026-04-14',
                        updatedBy: 'admin',
                    },
                ]);
            }
            return Promise.resolve([]);
        });

        renderWithLocale('pseudo');

        await waitFor(() => {
            expect(screen.getByTestId('count').textContent).toBe('1');
        });
        expect(mockListTranslations).toHaveBeenCalledWith('pseudo', 'REQUIREMENT');
        expect(mockListTranslations).toHaveBeenCalledWith('pseudo', 'COURSE');
        expect(screen.getByTestId('failed').textContent).toBe('false');
    });
});
