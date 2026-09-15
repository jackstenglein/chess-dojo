import { z } from 'zod';

/**
 * Validates a locale code (ISO 639-1, optionally with region).
 * Also accepts `pseudo`, the non-translating QA locale retained indefinitely
 * on nonprod so the DB-translation fetch path stays exercised end-to-end.
 */
const localeSchema = z.string().regex(/^(pseudo|[a-z]{2}(-[A-Z]{2})?)$/, 'Invalid locale code');

export const TranslationContentTypeSchema = z.enum(['REQUIREMENT', 'COURSE']);
export const TranslationContentTypes = TranslationContentTypeSchema.enum;
export type TranslationContentType = z.infer<typeof TranslationContentTypeSchema>;

export const RequirementTranslationSchema = z.object({
    contentType: z.literal('REQUIREMENT'),
    locale: localeSchema,
    contentKey: z.string().regex(/^REQUIREMENT#.+$/, 'contentKey must be REQUIREMENT#<id>'),
    name: z.string(),
    shortName: z.string(),
    dailyName: z.string(),
    description: z.string(),
    freeDescription: z.string(),
    progressBarSuffix: z.string(),
    positions: z.array(z.string()).optional(),
    updatedAt: z.string(),
    updatedBy: z.string(),
});

export type RequirementTranslation = z.infer<typeof RequirementTranslationSchema>;

export const CourseTranslationSchema = z.object({
    contentType: z.literal('COURSE'),
    locale: localeSchema,
    contentKey: z.string().regex(/^COURSE#.+$/, 'contentKey must be COURSE#<id>'),
    name: z.string(),
    description: z.string(),
    whatsIncluded: z.array(z.string()),
    chapters: z.array(
        z.object({
            name: z.string(),
            modules: z.array(
                z.object({
                    name: z.string(),
                }),
            ),
        }),
    ),
    updatedAt: z.string(),
    updatedBy: z.string(),
});

export type CourseTranslation = z.infer<typeof CourseTranslationSchema>;

export const ListTranslationsRequestSchema = z.object({
    locale: localeSchema,
    contentType: TranslationContentTypeSchema,
    limit: z.coerce.number().int().min(1).max(100).optional(),
    startKey: z.string().optional(),
});

export type ListTranslationsRequest = z.infer<typeof ListTranslationsRequestSchema>;

export const SetTranslationRequestSchema = z.discriminatedUnion('contentType', [
    RequirementTranslationSchema.omit({ updatedAt: true, updatedBy: true }),
    CourseTranslationSchema.omit({ updatedAt: true, updatedBy: true }),
]);

export type SetTranslationRequest = z.infer<typeof SetTranslationRequestSchema>;
