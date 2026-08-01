import { TimeControl } from '@jackstenglein/chess';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { formatTime } from './ClockUsage';

export function TimeControlDescription({ timeControls }: { timeControls: TimeControl[] }) {
    const t = useTranslations('analysisBoard.underboard.clock');

    if (timeControls.length === 0) {
        return t('unknownTimeControl');
    }

    if (timeControls.length === 1) {
        const tc = timeControls[0];
        return (
            <Typography>
                {formatTime(tc.seconds || 0)}{' '}
                {tc.increment
                    ? t('incrementSuffix', { increment: tc.increment })
                    : tc.delay
                      ? t('delaySuffix', { delay: tc.delay })
                      : ''}
                {tc.moves &&
                    (tc.moves === 1
                        ? t('everyMoveSingular')
                        : t('everyMovesPlural', { count: tc.moves }))}
            </Typography>
        );
    }

    let currentMove = 1;
    const items = [];
    for (let i = 0; i < timeControls.length; i++) {
        const tc = timeControls[i];
        const moveLabel = tc.moves
            ? t('moveRange', {
                  start: currentMove,
                  end: (currentMove += tc.moves || 0) - 1,
              })
            : t('moveRangeOpen', { start: currentMove });
        items.push(
            <Typography key={i}>
                <Typography
                    variant='subtitle2'
                    component='span'
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {moveLabel}
                </Typography>{' '}
                {formatTime(tc.seconds || 0)}{' '}
                {tc.increment
                    ? t('incrementSuffix', { increment: tc.increment })
                    : tc.delay
                      ? t('delaySuffix', { delay: tc.delay })
                      : ''}
            </Typography>,
        );
    }

    return <Stack>{items}</Stack>;
}
