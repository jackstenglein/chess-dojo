'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import AuthenticatedHelp from './AuthenticatedHelp';
import UnauthenticatedHelp from './UnauthenticatedHelp';

export default function HelpPage() {
    const { status } = useAuth();

    switch (status) {
        case AuthStatus.Loading:
            return <LoadingPage />;
        case AuthStatus.Authenticated:
            return <AuthenticatedHelp />;
        case AuthStatus.Unauthenticated:
            return <UnauthenticatedHelp />;
    }
}
