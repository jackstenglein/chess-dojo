import { getConfig } from '@/config';
import { Metadata } from 'next';

const config = getConfig();

export const defaultMetadata: Metadata = {
    metadataBase: new URL(config.baseUrl),
    title: 'ChessDojo Training Program',
    description:
        'The ChessDojo Training Program offers structured training plans for all levels 0-2500, along with an active and supportive community',
    openGraph: {
        type: 'website',
        url: config.baseUrl,
        siteName: 'ChessDojo.club',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@chessdojo',
    },
};
