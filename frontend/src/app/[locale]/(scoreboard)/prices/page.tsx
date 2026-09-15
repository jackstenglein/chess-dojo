import type { Metadata } from 'next';
import { Suspense } from 'react';
import PricingPage from './PricingPage';

export const metadata: Metadata = {
    title: 'ChessDojo Pricing',
    description:
        'Membership plans for ChessDojo — train with the structure used by titled players.',
};

export default function Page() {
    return (
        <Suspense>
            <PricingPage />
        </Suspense>
    );
}
