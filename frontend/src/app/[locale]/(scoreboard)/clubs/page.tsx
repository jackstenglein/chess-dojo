import { Suspense } from 'react';
import { ListClubsPage } from './ListClubsPage';

export default function Page() {
    return (
        <Suspense>
            <ListClubsPage />
        </Suspense>
    );
}
