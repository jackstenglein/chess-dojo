import { Translation } from '@/api/translationApi';
import {
    CustomTask,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { RequirementTranslation } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { TranslationContext, TranslationContextValue } from './TranslationContext';
import { useTranslatedRequirement } from './useTranslatedRequirement';

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

const requirement: Requirement = {
    id: 'req-1',
    status: RequirementStatus.Active,
    category: RequirementCategory.Games,
    name: 'Play {{count}} classical games',
    shortName: 'Classical Games',
    dailyName: 'Classical',
    description: 'Play slow games against strong opposition.',
    freeDescription: 'Play at least one slow game.',
    counts: { '1500-1600': 10 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 1,
    totalScore: 0,
    scoreboardDisplay: ScoreboardDisplay.ProgressBar,
    progressBarSuffix: 'games',
    updatedAt: '2026-04-14',
    sortPriority: '10',
    expirationDays: -1,
    isFree: true,
    atomic: false,
    expectedMinutes: 120,
};

const customTask: CustomTask = {
    id: 'ct-1',
    owner: 'alice',
    name: 'Read articles',
    description: 'User-owned task',
    counts: { '1500-1600': 1 },
    scoreboardDisplay: ScoreboardDisplay.NonDojo,
    category: RequirementCategory.Games,
    updatedAt: '2026-04-14',
    numberOfCohorts: -1,
    progressBarSuffix: '',
};

const fullTranslation: RequirementTranslation = {
    contentType: 'REQUIREMENT',
    locale: 'pseudo',
    contentKey: 'REQUIREMENT#req-1',
    name: '[T] Play {{count}} classical games',
    shortName: '[T] Classical Games',
    dailyName: '[T] Classical',
    description: '[T] Play slow games',
    freeDescription: '[T] Play at least one slow game',
    progressBarSuffix: '[T] games',
    updatedAt: '2026-04-14',
    updatedBy: 'admin',
};

const requirementWithPositions: Requirement = {
    ...requirement,
    positions: [
        {
            title: 'Minors Promoting Pawns #1',
            fen: '8/8/8/8/8/8/8/8 w - - 0 1',
            limitSeconds: 180,
            incrementSeconds: 0,
            result: 'win',
        },
        {
            title: 'Minors Promoting Pawns #2',
            fen: '8/8/8/8/8/8/8/8 b - - 0 1',
            limitSeconds: 180,
            incrementSeconds: 0,
            result: 'win',
        },
    ],
};

const translationWithPositions: RequirementTranslation = {
    ...fullTranslation,
    positions: ['[T] Minors Promoting Pawns #1', '[T] Minors Promoting Pawns #2'],
};

describe('useTranslatedRequirement', () => {
    it('returns the source object identity-equal for English locale', () => {
        const { result } = renderHook(() => useTranslatedRequirement(requirement), {
            wrapper: makeWrapper(makeContext('en', [fullTranslation])),
        });
        expect(result.current).toBe(requirement);
    });

    it('overlays all translated fields for non-English locale with full translation', () => {
        const { result } = renderHook(() => useTranslatedRequirement(requirement), {
            wrapper: makeWrapper(makeContext('pseudo', [fullTranslation])),
        });
        expect(result.current?.name).toBe(fullTranslation.name);
        expect(result.current?.shortName).toBe(fullTranslation.shortName);
        expect(result.current?.dailyName).toBe(fullTranslation.dailyName);
        expect(result.current?.description).toBe(fullTranslation.description);
        expect(result.current?.freeDescription).toBe(fullTranslation.freeDescription);
        expect(result.current?.progressBarSuffix).toBe(fullTranslation.progressBarSuffix);
    });

    it('falls back per field when translation fields are empty strings', () => {
        const partial: RequirementTranslation = {
            ...fullTranslation,
            shortName: '',
            dailyName: '',
            description: '',
            freeDescription: '',
            progressBarSuffix: '',
        };
        const { result } = renderHook(() => useTranslatedRequirement(requirement), {
            wrapper: makeWrapper(makeContext('pseudo', [partial])),
        });
        expect(result.current?.name).toBe(partial.name);
        expect(result.current?.shortName).toBe(requirement.shortName);
        expect(result.current?.dailyName).toBe(requirement.dailyName);
        expect(result.current?.description).toBe(requirement.description);
        expect(result.current?.freeDescription).toBe(requirement.freeDescription);
        expect(result.current?.progressBarSuffix).toBe(requirement.progressBarSuffix);
    });

    it('returns the source object when no translation exists for the id', () => {
        const { result } = renderHook(() => useTranslatedRequirement(requirement), {
            wrapper: makeWrapper(makeContext('pseudo', [])),
        });
        expect(result.current).toBe(requirement);
    });

    it('preserves the {{count}} placeholder in the translated name', () => {
        const { result } = renderHook(() => useTranslatedRequirement(requirement), {
            wrapper: makeWrapper(makeContext('pseudo', [fullTranslation])),
        });
        expect(result.current?.name).toContain('{{count}}');
    });

    it('returns undefined when given undefined input', () => {
        const { result } = renderHook(
            () => useTranslatedRequirement(undefined as Requirement | undefined),
            {
                wrapper: makeWrapper(makeContext('pseudo', [fullTranslation])),
            },
        );
        expect(result.current).toBeUndefined();
    });

    it('returns CustomTasks unchanged even when locale is non-English', () => {
        const { result } = renderHook(() => useTranslatedRequirement(customTask), {
            wrapper: makeWrapper(makeContext('pseudo', [fullTranslation])),
        });
        expect(result.current).toBe(customTask);
    });

    it('returns a stable reference across re-renders with unchanged inputs', () => {
        const context = makeContext('pseudo', [fullTranslation]);
        const { result, rerender } = renderHook(() => useTranslatedRequirement(requirement), {
            wrapper: makeWrapper(context),
        });
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });

    it('overlays position titles when counts match', () => {
        const { result } = renderHook(() => useTranslatedRequirement(requirementWithPositions), {
            wrapper: makeWrapper(makeContext('pseudo', [translationWithPositions])),
        });
        expect(result.current?.positions?.map((p) => p.title)).toEqual([
            '[T] Minors Promoting Pawns #1',
            '[T] Minors Promoting Pawns #2',
        ]);
        expect(result.current?.positions?.[0].fen).toBe(
            requirementWithPositions.positions?.[0].fen,
        );
    });

    it('falls back to the English title per index when a translated title is empty', () => {
        const partial: RequirementTranslation = {
            ...translationWithPositions,
            positions: ['[T] Minors Promoting Pawns #1', ''],
        };
        const { result } = renderHook(() => useTranslatedRequirement(requirementWithPositions), {
            wrapper: makeWrapper(makeContext('pseudo', [partial])),
        });
        expect(result.current?.positions?.map((p) => p.title)).toEqual([
            '[T] Minors Promoting Pawns #1',
            'Minors Promoting Pawns #2',
        ]);
    });

    it('leaves positions untouched when translation count does not match', () => {
        const mismatched: RequirementTranslation = {
            ...translationWithPositions,
            positions: ['[T] only one'],
        };
        const { result } = renderHook(() => useTranslatedRequirement(requirementWithPositions), {
            wrapper: makeWrapper(makeContext('pseudo', [mismatched])),
        });
        expect(result.current?.positions).toBe(requirementWithPositions.positions);
    });

    it('leaves positions untouched when the translation has no positions', () => {
        const { result } = renderHook(() => useTranslatedRequirement(requirementWithPositions), {
            wrapper: makeWrapper(makeContext('pseudo', [fullTranslation])),
        });
        expect(result.current?.positions).toBe(requirementWithPositions.positions);
    });
});
