import { Suspense } from 'react';
import CoachingPage from './CoachingPage';

export default function Page() {
    return (
        <Suspense>
            <CoachingPage />
        </Suspense>
    );
}
