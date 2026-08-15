import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// Keep in sync with SUPPORTED_LOCALES in src/i18n/locales.ts and the regexes
// in src/proxy.ts. When a new locale lands, extend the alternation here or
// legacy redirects and video-embed COEP headers will silently stop matching
// the new locale's URLs.
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
        const headers = [
            {
                source: '/play-bot/:path*',
                headers: ENGINE_HEADERS,
            },
            {
                source: '/:path*',
                headers: ENGINE_HEADERS,
            },
            {
                source: '/static/:path*',
                headers: ENGINE_HEADERS.concat({
                    key: 'Cache-Control',
                    value: 'public, max-age=2592000, immutable',
                }),
            },
        ];

        headers.push(
            ...pagesWithVideos.map((page) => ({
                source: page,
                headers: VIDEO_EMBED_HEADERS,
            })),
        );

        return headers;
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

const ENGINE_HEADERS = [
    {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp',
    },
    {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
    },
];

const VIDEO_EMBED_HEADERS = [
    {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'unsafe-none',
    },
];

const pagesWithVideosRaw = [
    '/',
    '/profile/:path*',
    '/scoreboard/:path*',
    '/learn/guides',
    '/learn/live-classes',
    '/learn/live-classes/:path*',
    '/learn/sparring',
    '/live-classes',

    // Blog
    '/blog/:path*',
    '/admin/blog/:path*',

    // K+P Endings
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/1/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/2/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/4/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/5/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/6/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/7/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/8/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/9/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/10/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/11/1',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/3/2',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/4/2',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/5/2',
    '/courses/ENDGAME/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0/7/2',

    // French Defense Starter
    '/courses/OPENING/0e144cc9-be12-48f2-a3b0-92596fa2559d',
    '/courses/OPENING/0e144cc9-be12-48f2-a3b0-92596fa2559d/0/0',

    // Aggressive e4 Repertoire
    '/courses/OPENING/2402cb47-d65a-4914-bc11-8f60eb32e41a',
    '/courses/OPENING/2402cb47-d65a-4914-bc11-8f60eb32e41a/0/0',
    '/courses/OPENING/2402cb47-d65a-4914-bc11-8f60eb32e41a/1/0',
    '/courses/OPENING/2402cb47-d65a-4914-bc11-8f60eb32e41a/2/0',
    '/courses/OPENING/2402cb47-d65a-4914-bc11-8f60eb32e41a/3/0',
    '/courses/OPENING/2402cb47-d65a-4914-bc11-8f60eb32e41a/5/0',

    // Caro Kann Starter
    '/courses/OPENING/37dd0c09-7622-4e87-b0df-7d3e6b37e410',
    '/courses/OPENING/37dd0c09-7622-4e87-b0df-7d3e6b37e410/0/0',

    // Najdorf Sicilian Starter
    '/courses/OPENING/b042a392-e285-4466-9bc0-deeecc2ce16c',
    '/courses/OPENING/b042a392-e285-4466-9bc0-deeecc2ce16c/0/0',

    // KID Expert
    '/courses/OPENING/d30581c8-f2c4-4d1c-8a5e-f303a83cc193',
    '/courses/OPENING/d30581c8-f2c4-4d1c-8a5e-f303a83cc193/0/0',
    '/courses/OPENING/d30581c8-f2c4-4d1c-8a5e-f303a83cc193/1/0',
    '/courses/OPENING/d30581c8-f2c4-4d1c-8a5e-f303a83cc193/2/0',
    '/courses/OPENING/d30581c8-f2c4-4d1c-8a5e-f303a83cc193/3/0',

    // Play against the caro kann
    '/courses/OPENING/179bf457-05fa-4405-9b61-4c12b6687932/0/1',
    '/courses/OPENING/179bf457-05fa-4405-9b61-4c12b6687932/0/2',

    // Basic Board Visualization
    '/courses/WORKSHOP/6746ee1a-d029-4ff0-89e2-962a5c64a6b6/:path*',
];

// Under localePrefix: 'as-needed', default-locale URLs are bare ('/profile',
// '/blog/...'). Emit BOTH bare and prefixed variants so COEP overrides land
// for English visitors as well — otherwise bare URLs fall through to the
// catch-all '/:path*' ENGINE_HEADERS rule (require-corp), breaking video
// embeds and the stockfish engine.
const pagesWithVideos = pagesWithVideosRaw.flatMap((p) => {
    const prefixed = p === '/' ? `/${LOCALE_PATTERN}` : `/${LOCALE_PATTERN}${p}`;
    return [p, prefixed];
});

export default withNextIntl(nextConfig);
