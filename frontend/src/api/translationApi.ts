import { logger } from '@/logging/logger';
import {
    CourseTranslation,
    CourseTranslationSchema,
    RequirementTranslation,
    RequirementTranslationSchema,
    TranslationContentType,
    TranslationContentTypes,
} from '@jackstenglein/chess-dojo-common/src/translation/api';
import { axiosService } from './axiosService';

/** A translated Requirement or Course entry from the backend translation table. */
export type Translation = RequirementTranslation | CourseTranslation;

interface ListTranslationsResponse {
    translations: Record<string, unknown>[];
    lastEvaluatedKey?: string;
}

/**
 * Fetches every translation for a given locale and content type, following
 * the paginated list endpoint until exhausted. Each raw item is validated
 * against its Zod schema; malformed items are dropped with a warning rather
 * than throwing.
 * @param locale The locale code to fetch translations for (e.g. "de").
 * @param contentType REQUIREMENT or COURSE.
 * @returns An array of validated translations. Empty if none exist.
 */
export async function listTranslations(
    locale: string,
    contentType: TranslationContentType,
): Promise<Translation[]> {
    const schema =
        contentType === TranslationContentTypes.REQUIREMENT
            ? RequirementTranslationSchema
            : CourseTranslationSchema;

    const params: { startKey?: string } = {};
    const result: Translation[] = [];

    do {
        const resp = await axiosService.get<ListTranslationsResponse>(
            `/public/translations/${locale}/${contentType}`,
            {
                params,
                functionName: 'listTranslations',
            },
        );

        for (const raw of resp.data.translations) {
            const parsed = schema.safeParse(raw);
            if (parsed.success) {
                result.push(parsed.data);
            } else {
                logger.warn(
                    `Dropped invalid translation for ${locale}/${contentType}:`,
                    parsed.error.issues,
                );
            }
        }

        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}
