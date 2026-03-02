import { TimeControl } from '@jackstenglein/chess';
import { Stack, Typography } from '@mui/material';
import { formatTime } from './ClockUsage';

export function TimeControlDescription({ timeControls }: { timeControls: TimeControl[] }) {
    if (timeControls.length === 0) {
        return 'Unknown';
    }

    if (timeControls.length === 1) {
        const tc = timeControls[0];
        return (
            <Typography>
                {formatTime(tc.seconds || 0)}{' '}
                {tc.increment
                    ? ` + ${tc.increment} sec increment`
                    : tc.delay
                      ? ` + ${tc.delay} sec delay`
                      : ''}
                {tc.moves && `every ${tc.moves === 1 ? 'move' : `${tc.moves} moves`}`}
            </Typography>
        );
    }

    let currentMove = 1;
    const items = [];
    for (let i = 0; i < timeControls.length; i++) {
        const tc = timeControls[i];
        items.push(
            <Typography key={i}>
                <Typography variant='subtitle2' component='span' color='text.secondary'>
                    {tc.moves
                        ? `Moves ${currentMove}–${(currentMove += tc.moves || 0) - 1}`
                        : `Moves ${currentMove}+`}
                    :
                </Typography>{' '}
                {formatTime(tc.seconds || 0)}{' '}
                {tc.increment
                    ? ` + ${tc.increment} sec increment`
                    : tc.delay
                      ? ` + ${tc.delay} sec delay`
                      : ''}
            </Typography>,
        );
    }

    return <Stack>{items}</Stack>;
}
