import { Suspense } from 'react';
import DetailsPage from './DetailsPage';

export default function Page() {
    return (
        <Suspense>
            <DetailsPage />
        </Suspense>
    );
}
