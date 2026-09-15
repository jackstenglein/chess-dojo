import type { Metadata } from 'next';
import { Suspense } from 'react';
import CoachingPage from './CoachingPage';

export const metadata: Metadata = {
    title: 'ChessDojo Coaching',
    description: 'Work with titled coaches from the ChessDojo to accelerate your improvement.',
};

export default function Page() {
    return (
        <Suspense>
            <CoachingPage />
        </Suspense>
    );
}
