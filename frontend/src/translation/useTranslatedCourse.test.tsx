import { Translation } from '@/api/translationApi';
import { Course, CourseModuleType, CourseType } from '@/database/course';
import { CourseTranslation } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { TranslationContext, TranslationContextValue } from './TranslationContext';
import { useTranslatedCourse } from './useTranslatedCourse';

function makeWrapper(value: TranslationContextValue) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
    }
    return Wrapper;
}

function makeContext(locale: string, entries: Translation[] = []): TranslationContextValue {
    const translations = new Map<string, Translation>();
    for (const t of entries) translations.set(t.contentKey, t);
    return {
        translations,
        locale,
        fetchFailed: false,
    };
}

const course: Course = {
    owner: 'jesse',
    ownerDisplayName: 'Jesse',
    stripeId: 'acct_xxx',
    type: CourseType.Endgame,
    id: 'course-1',
    name: 'Rook Endgames',
    description: 'Master rook endgames',
    whatsIncluded: ['Video lessons', 'Practice exercises'],
    color: 'white',
    cohorts: ['1500-1600'],
    cohortRange: '1500-1800',
    includedWithSubscription: true,
    availableForFreeUsers: false,
    chapters: [
        {
            name: 'Basic Positions',
            modules: [
                {
                    id: 'm1',
                    name: 'Lucena Position',
                    type: CourseModuleType.Video,
                    description: '',
                    postscript: '',
                    videoUrls: [],
                    pgns: [],
                    coach: '',
                    positions: [],
                    boardOrientation: 'white',
                },
            ],
        },
    ],
};

const translation: CourseTranslation = {
    contentType: 'COURSE',
    locale: 'pseudo',
    contentKey: 'COURSE#course-1',
    name: '[T] Rook Endgames',
    description: '[T] Master rook endgames',
    whatsIncluded: ['[T] Video lessons', '[T] Practice exercises'],
    chapters: [
        {
            name: '[T] Basic Positions',
            modules: [{ name: '[T] Lucena Position' }],
        },
    ],
    updatedAt: '2026-04-14',
    updatedBy: 'admin',
};

describe('useTranslatedCourse', () => {
    it('returns the source course identity-equal for English locale', () => {
        const { result } = renderHook(() => useTranslatedCourse(course), {
            wrapper: makeWrapper(makeContext('en', [translation])),
        });
        expect(result.current).toBe(course);
    });

    it('overlays course name, description, whatsIncluded, and nested chapter/module names', () => {
        const { result } = renderHook(() => useTranslatedCourse(course), {
            wrapper: makeWrapper(makeContext('pseudo', [translation])),
        });
        expect(result.current?.name).toBe('[T] Rook Endgames');
        expect(result.current?.description).toBe('[T] Master rook endgames');
        expect(result.current?.whatsIncluded).toEqual([
            '[T] Video lessons',
            '[T] Practice exercises',
        ]);
        expect(result.current?.chapters?.[0].name).toBe('[T] Basic Positions');
        expect(result.current?.chapters?.[0].modules[0].name).toBe('[T] Lucena Position');
    });

    it('falls back per-index when the translated whatsIncluded is shorter than source', () => {
        const partial: CourseTranslation = {
            ...translation,
            whatsIncluded: ['[T] Video lessons'],
        };
        const { result } = renderHook(() => useTranslatedCourse(course), {
            wrapper: makeWrapper(makeContext('pseudo', [partial])),
        });
        expect(result.current?.whatsIncluded).toEqual(['[T] Video lessons', 'Practice exercises']);
    });

    it('falls back per-index when the translated chapters array is shorter', () => {
        const firstChapter = course.chapters?.[0];
        if (!firstChapter) throw new Error('fixture missing chapter');
        const doubleCourse: Course = {
            ...course,
            chapters: [
                firstChapter,
                {
                    name: 'Advanced Positions',
                    modules: [],
                },
            ],
        };
        const { result } = renderHook(() => useTranslatedCourse(doubleCourse), {
            wrapper: makeWrapper(makeContext('pseudo', [translation])),
        });
        expect(result.current?.chapters?.[0].name).toBe('[T] Basic Positions');
        expect(result.current?.chapters?.[1].name).toBe('Advanced Positions');
    });

    it('returns undefined when given undefined input', () => {
        const { result } = renderHook(() => useTranslatedCourse(undefined), {
            wrapper: makeWrapper(makeContext('pseudo', [translation])),
        });
        expect(result.current).toBeUndefined();
    });

    it('returns the source course when no translation exists for the id', () => {
        const { result } = renderHook(() => useTranslatedCourse(course), {
            wrapper: makeWrapper(makeContext('pseudo', [])),
        });
        expect(result.current).toBe(course);
    });

    it('returns a stable reference across re-renders with unchanged inputs', () => {
        const context = makeContext('pseudo', [translation]);
        const { result, rerender } = renderHook(() => useTranslatedCourse(course), {
            wrapper: makeWrapper(context),
        });
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });
});
