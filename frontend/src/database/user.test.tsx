import { stripMeta } from '@/i18n/stripMeta';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/ratingSystem';
import { renderHook } from '@testing-library/react';
import { AbstractIntlMessages, NextIntlClientProvider, useTranslations } from 'next-intl';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { formatRatingSystem } from './user';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawMessages = require('../../messages/en.json') as AbstractIntlMessages;
const messages = stripMeta(rawMessages);

function renderTFunction() {
    return renderHook(() => useTranslations('enums.ratingSystem'), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
            <NextIntlClientProvider locale='en' messages={messages}>
                {children}
            </NextIntlClientProvider>
        ),
    });
}

describe('formatRatingSystem', () => {
    it('returns the translated label for a known rating system', () => {
        const { result } = renderTFunction();
        expect(formatRatingSystem(RatingSystem.Chesscom, result.current)).toBe('Chess.com Rapid');
        expect(formatRatingSystem(RatingSystem.Lichess, result.current)).toBe('Lichess Classical');
        expect(formatRatingSystem(RatingSystem.Custom, result.current)).toBe('Custom');
    });

    it('falls back to the raw value when the key is missing from messages', () => {
        const { result } = renderTFunction();
        expect(formatRatingSystem('UNKNOWN_FUTURE_SYSTEM', result.current)).toBe(
            'UNKNOWN_FUTURE_SYSTEM',
        );
    });

    it('falls back to the empty string when given an empty string', () => {
        const { result } = renderTFunction();
        expect(formatRatingSystem('', result.current)).toBe('');
    });
});
