import { TimelineEntry } from '@/database/timeline';
import { categoryTextColor } from '@/style/categoryText';
import { DojoPointsIcon } from '@/style/DojoPointsIcon';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

/** The softly tinted box an entry's activity sits in, set apart from who posted it. */
export function ActivityPanel({ children }: { children: ReactNode }) {
    return (
        <Stack
            sx={{
                gap: 1.25,
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'action.hover',
                minWidth: 0,
            }}
        >
            {children}
        </Stack>
    );
}

/**
 * The top of an activity panel: an icon on a tile of its category's colour, the
 * title with a subtitle in that colour under it, and anything that belongs on the
 * right.
 */
export function ActivityHeading({
    icon,
    color,
    title,
    subtitle,
    aside,
}: {
    icon: ReactNode;
    color?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    aside?: ReactNode;
}) {
    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box
                sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    fontSize: '1.15rem',
                    backgroundColor: color
                        ? `color-mix(in srgb, ${color} 18%, transparent)`
                        : 'action.selected',
                    ...categoryTextColor(theme, color),
                })}
            >
                {icon}
            </Box>
            <Stack sx={{ flexGrow: 1, minWidth: 0, gap: 0.25 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3 }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant='caption'
                        sx={(theme) => ({
                            color: 'text.secondary',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            ...categoryTextColor(theme, color),
                        })}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Stack>
            {aside}
        </Stack>
    );
}

/**
 * The Dojo points the entry earned, as the coin and "+0.05". The words are in the
 * tooltip and for screen readers.
 */
export function DojoPointsChange({ entry }: { entry: TimelineEntry }) {
    const t = useTranslations('newsfeed');
    const points = Math.round(100 * entry.dojoPoints) / 100;
    const label = t('dojoPointsGained', { count: points });
    return (
        <Tooltip title={label}>
            <Stack
                direction='row'
                aria-label={label}
                sx={{
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    gap: 0.5,
                    color: 'text.secondary',
                }}
                data-testid='entry-dojo-points'
            >
                <DojoPointsIcon size='0.95rem' />
                <Typography
                    variant='caption'
                    aria-hidden
                    sx={{ color: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                >
                    +{points}
                </Typography>
            </Stack>
        </Tooltip>
    );
}
