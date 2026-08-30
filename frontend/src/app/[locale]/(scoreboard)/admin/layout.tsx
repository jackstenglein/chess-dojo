'use client';

import { useEffect } from 'react';
import { AuthStatus, useAuth } from 'src/auth/Auth';
import { useRouter } from 'src/hooks/useRouter';
import LoadingPage from 'src/loading/LoadingPage';

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
