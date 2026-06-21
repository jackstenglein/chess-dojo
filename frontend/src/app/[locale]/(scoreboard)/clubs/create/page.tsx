import { CreateClubPage } from '@/components/clubs/CreateClubPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense>
            <CreateClubPage id='' />
        </Suspense>
    );
}
