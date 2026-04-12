import { MetaPixel } from '@/components/analytics/MetaPixel';
import { WebVitals } from '@/components/analytics/WebVitals';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getLocale } from 'next-intl/server';
import { NavigationGuardProvider } from 'next-navigation-guard';
import { defaultMetadata } from './(scoreboard)/defaultMetadata';

export const metadata = defaultMetadata;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();

    return (
        <html lang={locale} suppressHydrationWarning className='dark'>
            <head>
                <link rel='apple-touch-icon' href='/android-chome-192x192.png' />
                <link rel='manifest' href='/manifest.json' />
            </head>
            <body>
                <I18nProvider>
                    <NavigationGuardProvider>
                        <MetaPixel />
                        <WebVitals />
                        <div id='root'>{children}</div>
                    </NavigationGuardProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
