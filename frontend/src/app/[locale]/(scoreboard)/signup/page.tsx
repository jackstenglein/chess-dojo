import { AuthContainer } from '@/components/auth/AuthContainer';
import { Suspense } from 'react';
import { SignUpForm } from './SignUpForm';

export default function Page() {
    return (
        <AuthContainer>
            <Suspense>
                <SignUpForm />
            </Suspense>
        </AuthContainer>
    );
}
