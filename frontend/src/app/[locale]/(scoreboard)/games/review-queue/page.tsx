import { Suspense } from 'react';
import { ReviewQueuePage } from './ReviewQueuePage';

export default function Page() {
    return (
        <Suspense>
            <ReviewQueuePage />
        </Suspense>
    );
}
