import type { Metadata } from 'next';
import { COUPON } from './content';
import { DojoRushLandingPage } from './DojoRushLandingPage';

const title = 'Dojo Rush: 10 minutes, 3 strikes | ChessDojo';
const description = `Play Dojo Rush right here, no account needed. Three runs, then ${COUPON.percentOff}% off a ChessDojo membership.`;

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: '/rush' },
    openGraph: {
        title,
        description,
        url: '/rush',
        type: 'website',
        siteName: 'ChessDojo.club',
    },
    twitter: {
        card: 'summary',
        site: '@chessdojo',
        title,
        description,
    },
};

export default function Page() {
    return <DojoRushLandingPage />;
}
