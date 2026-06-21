'use client';

import { LandingPage } from '@/components/landing/LandingPage';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense>
            <LandingPage />
        </Suspense>
    );
}
