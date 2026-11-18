'use client';

import { Box } from '@mui/material';
import Image from 'next/image';
import gukeshPhoto from '../assets/gukesh.webp';
import sindarovPhoto from '../assets/sindarov.webp';
import { PlayerId, PLAYERS } from '../config';

type StyleObject = Record<string, string | number | object | undefined>;

/** Both files are 4:5 head-and-shoulders crops. Credits are in PHOTO_CREDITS and the footer. */
const PHOTOS: Record<PlayerId, typeof gukeshPhoto> = {
    gukesh: gukeshPhoto,
    sindarov: sindarovPhoto,
};

/**
 * A player photo that fills its parent, which has to be positioned. Leave
 * `named` off where the name is already next to the photo.
 */
export function PlayerPhoto({
    player,
    sizes,
    named = false,
    priority = false,
    sx,
}: {
    player: PlayerId;
    /** How wide the photo is drawn, for the image loader. */
    sizes: string;
    named?: boolean;
    priority?: boolean;
    sx?: StyleObject;
}) {
    return (
        <Box
            aria-hidden={named ? undefined : true}
            sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...sx }}
        >
            <Image
                src={PHOTOS[player]}
                alt={named ? PLAYERS[player].fullName : ''}
                fill
                sizes={sizes}
                priority={priority}
                style={{ objectFit: 'cover', objectPosition: '50% 22%' }}
            />
        </Box>
    );
}
