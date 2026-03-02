/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: import.meta.dirname,
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
        {
            source: '/games/explorer',
            destination: '/games/analysis',
            permanent: true,
        },
        {
            source: '/material/bots',
            destination: '/learn/guides',
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

const pagesWithVideos = [
    '/',
    '/profile/:path*',
    '/scoreboard/:path*',
    '/learn/guides',
    '/learn/live-classes',

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
];

export default nextConfig;
