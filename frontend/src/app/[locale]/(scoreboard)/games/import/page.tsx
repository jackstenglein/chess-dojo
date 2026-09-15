import ImportGamePage from '@/games/import/ImportGamePage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense>
            <ImportGamePage />
        </Suspense>
    );
}
