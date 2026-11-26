import type { Metadata } from 'next';
import { PAGE_PATH } from './config';
import { META } from './content';
import { WorldChampionshipPage } from './WorldChampionshipPage';

export const metadata: Metadata = {
    title: META.title,
    description: META.description,
    alternates: { canonical: PAGE_PATH },
    openGraph: {
        type: 'website',
        url: PAGE_PATH,
        siteName: 'ChessDojo.club',
        title: META.title,
        description: META.description,
    },
    twitter: {
        card: 'summary_large_image',
        site: '@chessdojo',
        title: META.title,
        description: META.description,
    },
};

/**
 * The page changes state when Game 1 starts, so the HTML is rebuilt at most a
 * minute after that moment. The browser's clock makes the switch on time for
 * anyone who already has the page open.
 */
export const revalidate = 60;

export default function Page() {
    // eslint-disable-next-line react-hooks/purity -- Read once per server render. The browser keeps its own clock.
    return <WorldChampionshipPage serverNow={Date.now()} />;
}
