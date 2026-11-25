'use client';

import { Box } from '@mui/material';
import { Oswald } from 'next/font/google';

const oswald = Oswald({ weight: '600', subsets: ['latin'], display: 'swap' });

/** The clock font, for the sx of whatever holds a ClockText. */
export const clockFontFamily = oswald.style.fontFamily;

/**
 * A clock reading in Oswald. Oswald's digits differ in width (a 1 is much
 * narrower than a 0), so each digit sits in a slot as wide as the widest one.
 * Without the slots the time would shift sideways as it counts down.
 */
export function ClockText({ text }: { text: string }) {
    return (
        <Box component='span' sx={{ fontFamily: clockFontFamily, whiteSpace: 'nowrap' }}>
            {(text.match(/./g) ?? []).map((ch, i) =>
                /\d/.test(ch) ? (
                    <Box
                        key={i}
                        component='span'
                        sx={{ display: 'inline-block', width: '0.55em', textAlign: 'center' }}
                    >
                        {ch}
                    </Box>
                ) : (
                    <span key={i}>{ch}</span>
                ),
            )}
        </Box>
    );
}
