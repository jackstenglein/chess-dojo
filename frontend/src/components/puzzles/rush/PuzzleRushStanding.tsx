'use client';

import {
    PuzzleRushBests as PuzzleRushBestScores,
    PuzzleRushStanding,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

/** Renders the player's all-time, weekly, and daily best solved-puzzle counts. */
export function PuzzleRushBests({ bests }: { bests: PuzzleRushBestScores }) {
    const t = useTranslations('puzzles.rush');

    return (
        <Stack
            direction='row'
            data-testid='puzzle-rush-bests'
            sx={{
                justifyContent: 'center',
                flexWrap: 'wrap',
                columnGap: 4,
                rowGap: 2,
            }}
        >
            <Stat label={t('bestAllTime')} value={bests.allTime?.score ?? '—'} />
            <Stat label={t('bestThisWeek')} value={bests.week?.score ?? '—'} />
            <Stat label={t('bestToday')} value={bests.day?.score ?? '—'} />
        </Stack>
    );
}

/** Renders where a run's solved-puzzle count sits among the player's own runs. */
export function PuzzleRushIndexes({ standing }: { standing: PuzzleRushStanding }) {
    const t = useTranslations('puzzles.rush');

    return (
        <Stack
            direction='row'
            data-testid='puzzle-rush-indexes'
            sx={{
                justifyContent: 'center',
                flexWrap: 'wrap',
                columnGap: 4,
                rowGap: 2,
            }}
        >
            <Stat
                label={standing.newBest.allTime ? t('newBestAllTime') : t('indexAllTime')}
                value={t('scoreIndex', { index: standing.index.allTime })}
                highlight={standing.newBest.allTime}
            />
            <Stat
                label={standing.newBest.week ? t('newBestThisWeek') : t('indexThisWeek')}
                value={t('scoreIndex', { index: standing.index.week })}
                highlight={standing.newBest.week}
            />
            <Stat
                label={standing.newBest.day ? t('newBestToday') : t('indexToday')}
                value={t('scoreIndex', { index: standing.index.day })}
                highlight={standing.newBest.day}
            />
        </Stack>
    );
}

function Stat({
    label,
    value,
    highlight,
}: {
    label: ReactNode;
    value: string | number;
    highlight?: boolean;
}) {
    return (
        <Stack sx={{ alignItems: 'center', minWidth: 110 }}>
            <Typography
                variant='h4'
                sx={{
                    fontWeight: 'bold',
                    color: highlight ? 'primary.main' : 'text.primary',
                }}
            >
                {value}
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    color: 'text.secondary',
                }}
            >
                {label}
            </Typography>
        </Stack>
    );
}
