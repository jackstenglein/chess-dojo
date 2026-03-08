import { Timer, TimerContext } from '@/components/timer/TimerContext';
import { Timer as TimerIcon } from '@mui/icons-material';
import { IconButton, SxProps, Tooltip } from '@mui/material';
import { use } from 'react';

export function TaskTimerIconButton({ taskId }: { taskId: string }) {
    const timer = use(TimerContext);

    return (
        <Tooltip title={timer.getLabel(taskId)}>
            <IconButton
                sx={timerButtonStyle({
                    timer,
                    taskId: taskId,
                })}
                onClick={() => timer.onToggle(taskId)}
            >
                <TimerIcon />
            </IconButton>
        </Tooltip>
    );
}

function timerButtonStyle({ timer, taskId }: { timer: Timer; taskId: string }): SxProps {
    if (!timer.task) {
        return { color: 'text.secondary' };
    }

    if (timer.task.id === taskId) {
        if (timer.isRunning) {
            return { color: 'secondary.main' };
        }
        return { color: 'dojoOrange.main' };
    }
    return { color: 'error.main', opacity: 0.75 };
}
