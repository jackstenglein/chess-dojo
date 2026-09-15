import { AuthContainer } from '@/components/auth/AuthContainer';
import { Suspense } from 'react';
import { SignInForm } from './SignInForm';

export default function Page() {
    return (
        <AuthContainer>
            <Suspense>
                <SignInForm />
            </Suspense>
        </AuthContainer>
    );
}
