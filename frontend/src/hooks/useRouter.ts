import { useRouter as useNextRouter, usePathname } from 'next/navigation';

export const pagesWithVideos = [
    /^\/$/,
    /\/profile.*/,
    /\/scoreboard\/.*/,
    /^\/learn\/guides$/,
    /^\/learn\/live-classes$/,

    // Blog
    /^\/admin\/blog/,
    /^\/blog/,

    // K+P Endings
    /^\/courses\/ENDGAME\/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0\/(1|2|4|5|6|7|8|9|10|11)\/1$/,
    /^\/courses\/ENDGAME\/34241b4d-3a8f-4d5f-9a15-b26cf718a0d0\/(3|4|5|7)\/2$/,

    // French Defense Starter
    /^\/courses\/OPENING\/0e144cc9-be12-48f2-a3b0-92596fa2559d(\/0\/0)?$/,

    // Aggressive e4 Repertoire
    /^\/courses\/OPENING\/2402cb47-d65a-4914-bc11-8f60eb32e41a(\/(0|1|2|3|5)\/0)?$/,

    // Caro Kann Starter
    /^\/courses\/OPENING\/37dd0c09-7622-4e87-b0df-7d3e6b37e410(\/0\/0)?$/,

    // Najdorf Starter
    /^\/courses\/OPENING\/b042a392-e285-4466-9bc0-deeecc2ce16c(\/0\/0)?$/,

    // KID Expert
    /^\/courses\/OPENING\/d30581c8-f2c4-4d1c-8a5e-f303a83cc193(\/[0-4]\/0)?$/,
];

/**
 * A hook that allows you to programmatically change routes inside client components.
 * If the route includes a video (and therefore needs headers to be reloaded), a
 * hard reload is used instead of client-side routing.
 */
export function useRouter() {
    const router = useNextRouter();
    const pathname = usePathname();

    const push = (href: string) => {
        let currentHasVideo = false;
        let newHasVideo = false;

        for (const page of pagesWithVideos) {
            if (!currentHasVideo && pathname.match(page)) {
                currentHasVideo = true;
            }
            if (!newHasVideo && href.match(page)) {
                newHasVideo = true;
            }
        }

        if (currentHasVideo === newHasVideo) {
            router.push(href);
        } else {
            window.location.href = href;
        }
    };

    return {
        ...router,
        push,
    };
}
