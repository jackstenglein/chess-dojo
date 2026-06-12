import type { Metadata } from 'next';
import { Suspense } from 'react';
import LiveClassesPage from './LiveClassesPage';

export const metadata: Metadata = {
    title: 'ChessDojo Live Classes',
    description: 'Live chess classes streamed weekly by the ChessDojo senseis.',
};

export default function Page() {
    return (
        <Suspense>
            <LiveClassesPage />
        </Suspense>
    );
}
