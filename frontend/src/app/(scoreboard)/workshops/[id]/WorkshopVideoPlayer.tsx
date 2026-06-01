import { Box } from '@mui/material';
import React from 'react';

/**
 * Renders the responsive embedded Vimeo player for a workshop recording.
 * @param {{ videoUrl?: string; title: string }} props
 * @returns {React.JSX.Element | null}
 */
export default function WorkshopVideoPlayer({
    videoUrl,
    title,
}: {
    videoUrl?: string;
    title: string;
}): React.JSX.Element | null {
    if (!videoUrl) return null;

    return (
        <Box
            sx={{
                width: {
                    xs: 1,
                    sm: 0.7,
                    lg: 0.6,
                },
                mt: 1,
                mb: 3,
                aspectRatio: '16/9',
            }}
        >
            <iframe
                src={videoUrl}
                title={title}
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                allowFullScreen={true}
                style={{ width: '100%', height: '100%' }}
                frameBorder={0}
                data-testid='workshop-video-player'
            />
        </Box>
    );
}
