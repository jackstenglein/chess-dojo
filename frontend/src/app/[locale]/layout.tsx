import { MetaPixel } from '@/components/analytics/MetaPixel';
import { WebVitals } from '@/components/analytics/WebVitals';
import { getConfig } from '@/config';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import { StaticIntlClientProvider } from '@/i18n/StaticIntlClientProvider';
import { Layout } from '@/legacy/Layout';
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavigationGuardProvider } from 'next-navigation-guard';
import { notFound } from 'next/navigation';
import { defaultMetadata } from './(scoreboard)/defaultMetadata';

const config = getConfig();

// Pseudo is a QA artifact; never advertise it via hreflang.
const PUBLIC_LOCALES = LOCALE_CODES.filter((code) => code !== 'pseudo');

// Only pre-render the default locale; others render on-demand via
// dynamicParams: true to keep the build under Amplify's 230 MB limit.
export function generateStaticParams() {
    return [{ locale: DEFAULT_LOCALE }];
}

// Next forbids exporting both `metadata` and `generateMetadata` from the
// same segment, so we merge site-wide defaults here. Canonical is omitted
// because a layout-level canonical would point every page at the locale root.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const base = config.baseUrl.replace(/\/$/, '');

    // Under localePrefix: 'as-needed' the default locale lives at the bare
    // domain root; non-default locales keep their prefix. x-default and the
    // default-locale entry must both point at `base` to match the URL Google
    // actually crawls.
    const languages: Record<string, string> = {};
    for (const code of PUBLIC_LOCALES) {
        languages[code] = code === DEFAULT_LOCALE ? base : `${base}/${code}`;
    }
    languages['x-default'] = base;

    return {
        ...defaultMetadata,
        alternates: {
            languages,
        },
        openGraph: {
            ...(defaultMetadata.openGraph ?? {}),
            url: locale === DEFAULT_LOCALE ? base : `${base}/${locale}`,
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);

    return (
        <html lang={locale} suppressHydrationWarning className='dark'>
            <head>
                <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
            </head>
            <body>
                <NavigationGuardProvider>
                    <MetaPixel />
                    <WebVitals />
                    <div id='root'>
                        <StaticIntlClientProvider locale={locale}>
                            <Layout>{children}</Layout>
                        </StaticIntlClientProvider>
                    </div>
                </NavigationGuardProvider>
            </body>
        </html>
    );
}
