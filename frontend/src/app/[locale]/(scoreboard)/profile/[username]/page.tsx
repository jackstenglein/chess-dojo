import { Suspense } from 'react';
import { ProfilePage } from './ProfilePage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ username: string }> }) {
    const params = await props.params;

    const { username } = params;

    return (
        <Suspense>
            <ProfilePage username={username} />
        </Suspense>
    );
}
