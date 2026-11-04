'use client';

import { useApi } from '@/api/Api';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Course } from '@/database/course';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { getCheckoutSessionId } from '../../localStorage';
import { CoursePage } from './[chapter]/[module]/CoursePage';
import PurchaseCoursePage from './[chapter]/[module]/PurchaseCoursePage';

/**
 * Public sales page. The first render includes the course title, coach, and
 * description so logged-out visitors and bots receive them in the HTML.
 * It does not wait on auth and does not redirect. A purchased checkout, or a
 * session the server did not see, swaps in the member viewer after load.
 */
export function PublicCourseLanding({ course }: { course: Course }) {
    const [showCourse, setShowCourse] = useState(false);
    const onUnlock = useCallback(() => setShowCourse(true), []);

    if (showCourse) {
        return <CoursePage params={{ type: course.type, id: course.id }} />;
    }

    return (
        <>
            <PurchaseCoursePage course={course} isFreeTier />
            <Suspense fallback={null}>
                <CourseAccessUpgrade course={course} onUnlock={onUnlock} />
            </Suspense>
        </>
    );
}

function readStoredCheckoutId(courseId: string): string {
    try {
        return getCheckoutSessionId(courseId);
    } catch {
        return '';
    }
}

function CourseAccessUpgrade({ course, onUnlock }: { course: Course; onUnlock: () => void }) {
    const auth = useAuth();
    const api = useApi();
    const searchParams = useSearchParams();
    const checkoutFromUrl = searchParams.get('checkout') || '';

    useEffect(() => {
        if (auth.status === AuthStatus.Loading) {
            return;
        }

        const checkoutId =
            auth.status === AuthStatus.Authenticated
                ? ''
                : checkoutFromUrl || readStoredCheckoutId(course.id);

        if (auth.status === AuthStatus.Unauthenticated && !checkoutId) {
            return;
        }

        let cancelled = false;
        api.getCourse(course.type, course.id, checkoutId || undefined)
            .then((resp) => {
                if (!cancelled && !resp.data.isBlocked) {
                    onUnlock();
                }
            })
            .catch(() => {
                // Keep the public landing. Do not send the visitor to sign-in.
            });

        return () => {
            cancelled = true;
        };
    }, [api, auth.status, checkoutFromUrl, course.id, course.type, onUnlock]);

    return null;
}
