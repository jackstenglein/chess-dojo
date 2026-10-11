import { Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

/** Bold number style shared by the puzzlebase stats. Matches the profile stats cards. */
export const statNumberSx = {
    fontSize: '1.5rem',
    letterSpacing: '-0.01em',
    lineHeight: 1,
    fontWeight: 'bold',
    fontVariantNumeric: 'tabular-nums',
} as const;

/** A small overline label above a bold value, like the profile rating card header stats. */
export function HeaderStat({
    label,
    children,
    align = 'flex-start',
}: {
    label: string;
    children: ReactNode;
    align?: 'flex-start' | 'center' | 'flex-end';
}) {
    return (
        <Stack sx={{ alignItems: align }}>
            <Typography
                variant='overline'
                sx={{ color: 'text.secondary', lineHeight: 1.4, whiteSpace: 'nowrap' }}
            >
                {label}
            </Typography>
            {typeof children === 'string' || typeof children === 'number' ? (
                <Typography component='span' sx={statNumberSx}>
                    {children}
                </Typography>
            ) : (
                children
            )}
        </Stack>
    );
}
