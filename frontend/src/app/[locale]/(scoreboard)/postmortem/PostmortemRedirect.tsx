'use client';

import { useAuth } from '@/auth/Auth';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { useEffect } from 'react';

export function PostmortemRedirect() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.replace(`/profile/${user.username}/postmortem/2025`);
        }
    }, [user, router]);

    return <LoadingPage />;
}
