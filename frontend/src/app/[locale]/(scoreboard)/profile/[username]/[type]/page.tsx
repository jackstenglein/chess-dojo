import { Suspense } from 'react';
import FollowersPage from './FollowersPage';

export function generateStaticParams() {
    return [{ type: 'followers' }, { type: 'following' }];
}

export default async function Page(props: {
    params: Promise<{ username: string; type: 'followers' | 'following' }>;
}) {
    const params = await props.params;

    const { username, type } = params;

    return (
        <Suspense>
            <FollowersPage username={username} type={type} />
        </Suspense>
    );
}
