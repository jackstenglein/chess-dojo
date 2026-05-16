'use client';

import { Course } from '@/database/course';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { logger } from '@/logging/logger';
import { TranslationContentTypes } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { useMemo } from 'react';
import { useTranslationContext } from './TranslationContext';

/**
 * Returns `course` with DB-overlay fields (and nested chapter/module
 * names) substituted. The default locale short-circuits with the same
 * reference.
 */
export function useTranslatedCourse(course: Course | undefined): Course | undefined {
    const { translations, locale } = useTranslationContext();
    const translation = course ? translations.get(`COURSE#${course.id}`) : undefined;

    return useMemo(() => {
        if (!course || locale === DEFAULT_LOCALE || !translation) {
            return course;
        }
        if (translation.contentType !== TranslationContentTypes.COURSE) {
            logger.error(
                'translation.contentTypeMismatch: expected COURSE, got',
                translation.contentType,
                'for key COURSE#',
                course.id,
            );
            return course;
        }
        return {
            ...course,
            name: translation.name || course.name,
            description: translation.description || course.description,
            whatsIncluded: course.whatsIncluded?.map(
                (src, i) => translation.whatsIncluded[i] || src,
            ),
            chapters: course.chapters?.map((chapter, i) => {
                const chapterT = translation.chapters[i];
                if (!chapterT) return chapter;
                return {
                    ...chapter,
                    name: chapterT.name || chapter.name,
                    modules: chapter.modules.map((module, j) => {
                        const moduleT = chapterT.modules[j];
                        if (!moduleT) return module;
                        return {
                            ...module,
                            name: moduleT.name || module.name,
                        };
                    }),
                };
            }),
        };
    }, [course, translation, locale]);
}
