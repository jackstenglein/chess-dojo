import { AuthContainer } from '@/components/auth/AuthContainer';
import { Suspense } from 'react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default function Page() {
    return (
        <AuthContainer>
            <Suspense>
                <ForgotPasswordForm />
            </Suspense>
        </AuthContainer>
    );
}
