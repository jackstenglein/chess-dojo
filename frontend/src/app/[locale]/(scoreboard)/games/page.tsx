import ListGamesPage from '@/games/list/ListGamesPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense>
            <ListGamesPage />
        </Suspense>
    );
}
