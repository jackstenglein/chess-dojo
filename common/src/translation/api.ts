import { z } from 'zod';

/** Validates a locale code (ISO 639-1, optionally with region). */
const localeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid locale code');

/** The type of content being translated. */
export const TranslationContentTypeSchema = z.enum(['REQUIREMENT', 'COURSE']);
/** Translation content type values. */
export const TranslationContentTypes = TranslationContentTypeSchema.enum;
/** Translation content type. */
export type TranslationContentType = z.infer<typeof TranslationContentTypeSchema>;

/** Verifies the shape of a requirement translation. */
export const RequirementTranslationSchema = z.object({
    /** Discriminator: identifies this as a requirement translation. */
    contentType: z.literal('REQUIREMENT'),
    /** The locale code (e.g. "de", "es"). */
    locale: localeSchema,
    /** The content key, formatted as "REQUIREMENT#<requirementId>". */
    contentKey: z.string().startsWith('REQUIREMENT#'),
    /** The translated requirement name. */
    name: z.string(),
    /** The translated short name. */
    shortName: z.string(),
    /** The translated daily-view name. */
    dailyName: z.string(),
    /** The translated description (HTML or markdown). */
    description: z.string(),
    /** The translated free-tier description. */
    freeDescription: z.string(),
    /** The translated progress bar suffix (e.g. "games played"). */
    progressBarSuffix: z.string(),
    /** When the translation was last updated (ISO date string). */
    updatedAt: z.string(),
    /** The username of the admin who last updated this translation. */
    updatedBy: z.string(),
});

/** A requirement translation. */
export type RequirementTranslation = z.infer<typeof RequirementTranslationSchema>;

/** Verifies the shape of a course translation. */
export const CourseTranslationSchema = z.object({
    /** Discriminator: identifies this as a course translation. */
    contentType: z.literal('COURSE'),
    /** The locale code (e.g. "de", "es"). */
    locale: localeSchema,
    /** The content key, formatted as "COURSE#<courseId>". */
    contentKey: z.string().startsWith('COURSE#'),
    /** The translated course name. */
    name: z.string(),
    /** The translated course description. */
    description: z.string(),
    /** The translated "what's included" bullet points. */
    whatsIncluded: z.array(z.string()),
    /** The translated chapter structure. */
    chapters: z.array(
        z.object({
            /** The translated chapter name. */
            name: z.string(),
            /** The translated modules within the chapter. */
            modules: z.array(
                z.object({
                    /** The translated module name. */
                    name: z.string(),
                }),
            ),
        }),
    ),
    /** When the translation was last updated (ISO date string). */
    updatedAt: z.string(),
    /** The username of the admin who last updated this translation. */
    updatedBy: z.string(),
});

/** A course translation. */
export type CourseTranslation = z.infer<typeof CourseTranslationSchema>;

/** Verifies the type of a request to list translations for a locale and content type. */
export const ListTranslationsRequestSchema = z.object({
    /** The locale code to fetch translations for (path param). */
    locale: localeSchema,
    /** The content type to fetch translations for (path param). */
    contentType: TranslationContentTypeSchema,
    /** Optional limit on the number of items to return. */
    limit: z.coerce.number().int().min(1).max(100).optional(),
    /** Optional pagination token (opaque string from previous response). */
    startKey: z.string().optional(),
});

/** A request to list translations by locale and content type. */
export type ListTranslationsRequest = z.infer<typeof ListTranslationsRequestSchema>;

/** Verifies the type of a request to create or update a translation. */
export const SetTranslationRequestSchema = z.discriminatedUnion('contentType', [
    RequirementTranslationSchema.omit({ updatedAt: true, updatedBy: true }),
    CourseTranslationSchema.omit({ updatedAt: true, updatedBy: true }),
]);

/** A request to create or update a translation. */
export type SetTranslationRequest = z.infer<typeof SetTranslationRequestSchema>;
