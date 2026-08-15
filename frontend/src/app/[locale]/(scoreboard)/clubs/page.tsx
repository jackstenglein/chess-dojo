import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListClubsPage } from './ListClubsPage';

export const metadata: Metadata = {
    title: 'ChessDojo Clubs',
    description: 'Find or create chess clubs within the ChessDojo community.',
};

export default function Page() {
    return (
        <Suspense>
            <ListClubsPage />
        </Suspense>
    );
}
