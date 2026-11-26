'use client';

import { Box } from '@mui/material';
import Image from 'next/image';
import gukeshPhoto from '../assets/gukesh.webp';
import sindarovPhoto from '../assets/sindarov.webp';
import { CrossPlayer, playerOf } from './crosstable';
import { PHONE_LANDSCAPE } from './liveLayout';

const PHOTOS: Record<CrossPlayer, typeof gukeshPhoto> = {
    gukesh: gukeshPhoto,
    sindarov: sindarovPhoto,
};

/**
 * A square photo of Gukesh or Sindarov, from the photos the World Championship
 * page already uses. Renders nothing for anyone else, such as the players of
 * the test game.
 */
export function PlayerPhoto({
    name,
    size,
    hiddenOnPhoneOnItsSide,
}: {
    name: string | undefined;
    size: number;
    /** For a place that has no room for the photo on a phone on its side. */
    hiddenOnPhoneOnItsSide?: boolean;
}) {
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
                ...(hiddenOnPhoneOnItsSide && { [PHONE_LANDSCAPE]: { display: 'none' } }),
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
