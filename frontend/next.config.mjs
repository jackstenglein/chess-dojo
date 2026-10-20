import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin();

// Keep in sync with SUPPORTED_LOCALES and LOCALE_PREFIX_REGEX in
// src/i18n/locales.ts. When a new locale lands, extend the alternation here or
// legacy redirects will silently stop matching the new locale's URLs.
const LOCALE_PATTERN = ':locale(en|pseudo|de|es|pt|fr|it)';

// chess-dojo-common is linked via file:../common. Turbopack only resolves
// files under this root, and outputFileTracingRoot must match turbopack.root.
const monorepoRoot = path.join(import.meta.dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: monorepoRoot,
    turbopack: {
        root: monorepoRoot,
    },
    transpilePackages: ['@jackstenglein/chess-dojo-common'],
    productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === 'true',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'th.bing.com',
                pathname: '/th/id/R.aa96dba2d64d799f0d1c6a02e4acdebb',
            },
            {
                protocol: 'https',
                hostname: 'chess-dojo-images.s3.amazonaws.com',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
                pathname: '/jalpp/DojoIcons/**',
            },
        ],
    },
    headers() {
        // COEP is chosen in src/proxy.ts. Headers from this file are applied
        // after the proxy and would overwrite a per-course value. /static
        // skips the proxy, so those assets keep require-corp here.
        return [
            {
                source: '/:path*',
                headers: COOP_HEADERS,
            },
            {
                source: '/static/:path*',
                headers: ENGINE_HEADERS.concat({
                    key: 'Cache-Control',
                    value: 'public, max-age=2592000, immutable',
                }),
            },
        ];
    },
    redirects: () => [
        // SEO: permanent redirect for default-locale prefix removal under
        // localePrefix: 'as-needed'. next-intl's middleware emits a 307
        // (temporary) for /en/foo -> /foo, which search engines do not
        // honour for canonicalization. A Next-level 308 transfers authority
        // and also cuts one middleware invocation per /en/... request.
        { source: '/en', destination: '/', permanent: true },
        { source: '/en/:path*', destination: '/:path*', permanent: true },

        // Each legacy redirect needs a bare AND a prefixed variant.
        { source: '/games/explorer', destination: '/games/analysis', permanent: true },
        {
            source: `/${LOCALE_PATTERN}/games/explorer`,
            destination: '/:locale/games/analysis',
            permanent: true,
        },
        { source: '/material/bots', destination: '/learn/guides', permanent: true },
        {
            source: `/${LOCALE_PATTERN}/material/bots`,
            destination: '/:locale/learn/guides',
            permanent: true,
        },
    ],
};

const COOP_HEADERS = [
    {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
    },
];

const ENGINE_HEADERS = [
    {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp',
    },
    ...COOP_HEADERS,
];

export default withNextIntl(nextConfig);
