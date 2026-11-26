import { axiosService } from '@/api/axiosService';
import { GetCourseResponse } from '@/api/courseApi';
import { defaultMetadata } from '@/app/[locale]/(scoreboard)/defaultMetadata';
import { Course } from '@/database/course';
import { logger } from '@/logging/logger';
import { isAxiosError } from 'axios';
import { Metadata } from 'next';
import { cache } from 'react';

/** Fetches the public course payload. Paid chapter content is omitted by the API. */
export const getPublicCourse = cache(
    async (type: string, id: string): Promise<GetCourseResponse | null> => {
        try {
            const response = await axiosService.get<GetCourseResponse>(
                `/public/courses/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
                { functionName: 'getPublicCourse' },
            );
            return response.data;
        } catch (err) {
            if (!isAxiosError(err) || err.response?.status !== 404) {
                logger.error?.('getPublicCourse failed', err);
            }
            return null;
        }
    },
);

/** Drops chapter content so the public HTML cannot include paid modules. */
export function publicCourseView(course: Course): Course {
    const { chapters: _chapters, ...rest } = course;
    return rest;
}

/** Preview title, e.g. "Accelerated Dragon w/ GM Eugene Perelshteyn". */
export function coursePreviewTitle(course: Pick<Course, 'name' | 'ownerDisplayName'>): string {
    const name = course.name.trim() || 'ChessDojo Course';
    const coach = course.ownerDisplayName.trim();
    if (!coach) {
        return name;
    }
    return `${name} w/ ${coach}`;
}

/** Title, description, and Open Graph / Twitter tags for a public course URL. */
export function courseLandingMetadata(course: Course): Metadata {
    const title = coursePreviewTitle(course);
    const description = course.description.trim() || defaultMetadata.description || undefined;
    const image = course.imageUrl?.trim();
    const url = `/courses/${course.type}/${course.id}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            ...defaultMetadata.openGraph,
            title,
            description,
            url,
            ...(image ? { images: [{ url: image, alt: title }] } : {}),
        },
        twitter: {
            ...defaultMetadata.twitter,
            title,
            description,
            ...(image ? { images: [image] } : {}),
        },
    };
}
