import { defaultMetadata } from '@/app/[locale]/(scoreboard)/defaultMetadata';
import { hasAuthSession } from '@/auth/hasAuthSession';
import { isCoursePublished } from '@/database/course';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CoursePage } from './[chapter]/[module]/CoursePage';
import { courseLandingMetadata, getPublicCourse, publicCourseView } from './courseLanding';
import { PublicCourseLanding } from './PublicCourseLanding';

// Auth cookies choose the member viewer vs the public landing, so this cannot
// be a static shell. Logged-out responses include the course HTML.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
    const { type, id } = await params;
    const response = await getPublicCourse(type, id);
    if (!response?.course || !isCoursePublished(response.course)) {
        return defaultMetadata;
    }
    return courseLandingMetadata(response.course);
}

export default async function Page(props: { params: Promise<{ type: string; id: string }> }) {
    const params = await props.params;

    if (await hasAuthSession()) {
        return (
            <Suspense>
                <CoursePage params={params} />
            </Suspense>
        );
    }

    const response = await getPublicCourse(params.type, params.id);
    if (!response?.course || !isCoursePublished(response.course)) {
        notFound();
    }

    return <PublicCourseLanding course={publicCourseView(response.course)} />;
}
