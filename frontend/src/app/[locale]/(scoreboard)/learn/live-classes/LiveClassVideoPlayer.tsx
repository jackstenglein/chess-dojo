const VIDEO_STYLE = {
    width: '100%',
    height: '100%',
    aspectRatio: '16 / 9',
} as const;

/**
 * Renders an inline video player for a live class recording URL.
 */
export function LiveClassVideoPlayer({ url }: { url: string }) {
    if (url.includes('youtube.com')) {
        return (
            <iframe
                src={url}
                title='YouTube video player'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
                style={VIDEO_STYLE}
            />
        );
    }

    return <video autoPlay controls src={url} style={VIDEO_STYLE} />;
}
