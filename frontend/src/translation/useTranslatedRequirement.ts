'use client';

import { CustomTask, isRequirement, Requirement } from '@/database/requirement';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { logger } from '@/logging/logger';
import { TranslationContentTypes } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { useMemo } from 'react';
import { useTranslationContext } from './TranslationContext';

/**
 * Returns `req` with DB-overlay fields substituted. CustomTasks and the
 * default locale short-circuit with the same reference.
 */
export function useTranslatedRequirement<T extends Requirement | CustomTask>(
    req: T | undefined,
): T | undefined {
    const { translations, locale } = useTranslationContext();
    const translation = req ? translations.get(`REQUIREMENT#${req.id}`) : undefined;

    return useMemo(() => {
        if (!req || locale === DEFAULT_LOCALE || !translation || !isRequirement(req)) {
            return req;
        }
        if (translation.contentType !== TranslationContentTypes.REQUIREMENT) {
            logger.error(
                'translation.contentTypeMismatch: expected REQUIREMENT, got',
                translation.contentType,
                'for key REQUIREMENT#',
                req.id,
            );
            return req;
        }
        const translatedPositions = translation.positions;
        return {
            ...req,
            name: translation.name || req.name,
            shortName: translation.shortName || req.shortName,
            dailyName: translation.dailyName || req.dailyName,
            description: translation.description || req.description,
            freeDescription: translation.freeDescription || req.freeDescription,
            progressBarSuffix: translation.progressBarSuffix || req.progressBarSuffix,
            positions:
                req.positions && translatedPositions?.length === req.positions.length
                    ? req.positions.map((p, i) => {
                          const t = translatedPositions?.[i];
                          return t ? { ...p, title: t } : p;
                      })
                    : req.positions,
        };
    }, [req, translation, locale]);
}
