'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (auth.status !== AuthStatus.Loading && !auth.user?.isAdmin) {
            router.replace('/profile');
        }
    }, [auth.status, auth.user?.isAdmin, router]);

    if (auth.status === AuthStatus.Loading || !auth.user?.isAdmin) {
        return <LoadingPage />;
    }

    return <>{children}</>;
}
