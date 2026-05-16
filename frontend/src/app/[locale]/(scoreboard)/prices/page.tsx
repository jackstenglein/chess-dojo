import { Suspense } from 'react';
import PricingPage from './PricingPage';

export default function Page() {
    return (
        <Suspense>
            <PricingPage />
        </Suspense>
    );
}
