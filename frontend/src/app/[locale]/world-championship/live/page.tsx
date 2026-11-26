import type { Metadata } from 'next';
import { LiveMatchPage } from './LiveMatchPage';

const TITLE = 'Gukesh vs Sindarov Live | ChessDojo';
const DESCRIPTION =
    'Follow the 2026 World Championship live with the ChessDojo senseis, guess every move and climb "Who\'s a GM today".';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/world-championship/live' },
    openGraph: {
        type: 'website',
        url: '/world-championship/live',
        siteName: 'ChessDojo.club',
        title: TITLE,
        description: DESCRIPTION,
    },
};

export default function Page() {
    return <LiveMatchPage />;
}
