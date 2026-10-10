import { ReaderPage } from '@/components/profile/trainingPlan/study/ReaderPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense>
            <ReaderPage />
        </Suspense>
    );
}
