import type { Metadata } from 'next';
import { ClassLandingPage } from './ClassLandingPage';

export const metadata: Metadata = {
    title: 'Watch a Free ChessDojo Class',
    description:
        'Watch a real live class with GM Jesse Kraai for free, then see how ChessDojo members train with GMs and IMs every week.',
};

export default function Page() {
    return <ClassLandingPage />;
}
