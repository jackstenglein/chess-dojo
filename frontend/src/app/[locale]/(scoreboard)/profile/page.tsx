import { Suspense } from 'react';
import { ProfilePage } from './[username]/ProfilePage';

export default function Page() {
    return (
        <Suspense>
            <ProfilePage />
        </Suspense>
    );
}
