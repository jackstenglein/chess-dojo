import { Suspense } from 'react';
import { RoundRobinPage } from './RoundRobinPage';

export default function Page() {
    return (
        <Suspense>
            <RoundRobinPage />
        </Suspense>
    );
}
