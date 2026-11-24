'use client';

import { Box } from '@mui/material';
import Image from 'next/image';
import gukeshPhoto from '../assets/gukesh.webp';
import sindarovPhoto from '../assets/sindarov.webp';
import { CrossPlayer, playerOf } from './crosstable';

const PHOTOS: Record<CrossPlayer, typeof gukeshPhoto> = {
    gukesh: gukeshPhoto,
    sindarov: sindarovPhoto,
};

/**
 * A square photo of Gukesh or Sindarov, from the photos the World Championship
 * page already uses. Renders nothing for anyone else, such as the players of
 * the test game.
 */
export function PlayerPhoto({ name, size }: { name: string | undefined; size: number }) {
    const player = playerOf(name);
    if (!player) {
        return null;
    }
    return (
        <Box
            data-testid={`player-photo-${player}`}
            sx={{
                position: 'relative',
                width: size,
                height: size,
                flexShrink: 0,
                borderRadius: 0.5,
                overflow: 'hidden',
                bgcolor: 'action.hover',
            }}
        >
            <Image
                src={PHOTOS[player]}
                alt=''
                fill
                sizes={`${size * 2}px`}
                style={{ objectFit: 'cover', objectPosition: 'top' }}
            />
        </Box>
    );
}
