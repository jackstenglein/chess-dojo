import { Suspense } from 'react';
import LiveClassesPage from './LiveClassesPage';

export default function Page() {
    return (
        <Suspense>
            <LiveClassesPage />
        </Suspense>
    );
}
