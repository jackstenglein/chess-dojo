import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet, mockWarn } = vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockWarn: vi.fn(),
}));
vi.mock('./axiosService', () => ({ axiosService: { get: mockGet } }));
vi.mock('@/logging/logger', () => ({ logger: { warn: mockWarn } }));

import { TranslationContentTypes } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { listTranslations } from './translationApi';

const validRequirement = {
    contentType: 'REQUIREMENT',
    locale: 'pseudo',
    contentKey: 'REQUIREMENT#abc-123',
    name: '[T] Play 10 classical games',
    shortName: '[T] Classical Games',
    dailyName: '[T] Classical',
    description: '[T] Description',
    freeDescription: '[T] Free description',
    progressBarSuffix: '[T] games',
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: 'admin',
};

const validCourse = {
    contentType: 'COURSE',
    locale: 'pseudo',
    contentKey: 'COURSE#xyz-789',
    name: '[T] Endgame Course',
    description: '[T] Master endgames',
    whatsIncluded: ['[T] Chapter 1', '[T] Chapter 2'],
    chapters: [{ name: '[T] Intro', modules: [{ name: '[T] Module 1' }] }],
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: 'admin',
};

describe('translationApi', () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockWarn.mockReset();
    });

    describe('listTranslations', () => {
        it('returns an empty array when the backend has no translations', async () => {
            mockGet.mockResolvedValueOnce({ data: { translations: [] } });
            const result = await listTranslations('pseudo', TranslationContentTypes.REQUIREMENT);
            expect(result).toEqual([]);
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledWith(
                '/public/translations/pseudo/REQUIREMENT',
                expect.objectContaining({ functionName: 'listTranslations' }),
            );
        });

        it('concatenates pages when the backend returns a pagination token', async () => {
            mockGet
                .mockResolvedValueOnce({
                    data: {
                        translations: [{ ...validRequirement, contentKey: 'REQUIREMENT#1' }],
                        lastEvaluatedKey: 'page2',
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        translations: [{ ...validRequirement, contentKey: 'REQUIREMENT#2' }],
                    },
                });
            const result = await listTranslations('pseudo', TranslationContentTypes.REQUIREMENT);
            expect(result).toHaveLength(2);
            expect(result[0].contentKey).toBe('REQUIREMENT#1');
            expect(result[1].contentKey).toBe('REQUIREMENT#2');
            expect(mockGet).toHaveBeenCalledTimes(2);
        });

        it('drops items that fail Zod validation and warns', async () => {
            mockGet.mockResolvedValueOnce({
                data: {
                    translations: [
                        validRequirement,
                        { contentType: 'REQUIREMENT', contentKey: 'REQUIREMENT#bad' }, // missing required fields
                    ],
                },
            });
            const result = await listTranslations('pseudo', TranslationContentTypes.REQUIREMENT);
            expect(result).toHaveLength(1);
            expect(result[0].contentKey).toBe(validRequirement.contentKey);
            expect(mockWarn).toHaveBeenCalledTimes(1);
        });

        it('validates course translations against the course schema', async () => {
            mockGet.mockResolvedValueOnce({ data: { translations: [validCourse] } });
            const result = await listTranslations('pseudo', TranslationContentTypes.COURSE);
            expect(result).toHaveLength(1);
            expect(result[0].contentKey).toBe(validCourse.contentKey);
            expect(mockGet).toHaveBeenCalledWith(
                '/public/translations/pseudo/COURSE',
                expect.any(Object),
            );
        });

        it('drops a course item that arrives on the REQUIREMENT channel (schema mismatch)', async () => {
            // If the backend ever returns a COURSE on a REQUIREMENT query the guard rejects it.
            mockGet.mockResolvedValueOnce({ data: { translations: [validCourse] } });
            const result = await listTranslations('pseudo', TranslationContentTypes.REQUIREMENT);
            expect(result).toEqual([]);
            expect(mockWarn).toHaveBeenCalledTimes(1);
        });
    });
});
