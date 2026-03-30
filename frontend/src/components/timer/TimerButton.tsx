import { useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { TimelineProvider } from '@/components/profile/activity/useTimeline';
import { TaskDialog, TaskDialogView } from '@/components/profile/trainingPlan/TaskDialog';
import { CustomTask, isRequirement, Requirement } from '@/database/requirement';
import { NotInterested, Pause, PlayArrow, Timer as TimerIcon } from '@mui/icons-material';
import {
    Box,
    Button,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { use, useState } from 'react';
import { Timer, TimerContext } from './TimerContext';

/**
 * Renders a timer icon button. When clicked, the button opens a menu
 * which shows the current value of the timer and controls for starting/stopping
 * the timer.
 */
export function TimerButton() {
    const { user } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    if (!user) {
        return null;
    }

    const timer = use(TimerContext);
    const { timerSeconds, isRunning, isPaused, task, onStart, onPause, onClear } = timer;

    return (
        <>
            <Tooltip title='Timer'>
                <IconButton
                    data-testid='Timer'
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    color={isPaused ? 'dojoOrange' : 'secondary'}
                    sx={{ color: !isPaused && !isRunning ? 'white' : undefined }}
                >
                    <TimerIcon />
                </IconButton>
            </Tooltip>
            {anchorEl && (
                <Menu
                    id='timer-menu'
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Box sx={{ px: 2 }}>
                        <Stack direction='row' alignItems='center' gap={3}>
                            <Typography variant='subtitle1' fontWeight='bold' color='textSecondary'>
                                {task ? getTaskName(task) : 'Work Timer'}
                            </Typography>
                            <Typography fontWeight='bold'>{formatTime(timerSeconds)}</Typography>
                        </Stack>

                        <Stack direction='row' gap={2} mt={1}>
                            {isRunning ? (
                                <Button
                                    startIcon={<Pause />}
                                    onClick={() => onPause(undefined, true)}
                                >
                                    Pause
                                </Button>
                            ) : (
                                <Button startIcon={<PlayArrow />} onClick={() => onStart()}>
                                    Start
                                </Button>
                            )}
                            <Button
                                startIcon={<NotInterested />}
                                onClick={onClear}
                                sx={{ visibility: isPaused ? 'visible' : 'hidden' }}
                                color='error'
                            >
                                Reset
                            </Button>
                        </Stack>
                    </Box>
                </Menu>
            )}
            <TimerTaskDialog timer={timer} />
        </>
    );
}

/**
 * Returns the short name or full name of a task.
 * @param task The task to get the name for.
 */
function getTaskName(task: Requirement | CustomTask): string {
    if (isRequirement(task)) {
        return task.shortName || task.name;
    }
    return task.name;
}

/**
 * Renders a timer menu item. It shows the current value of the timer and controls
 * for starting/stopping the timer. It does not link anywhere.
 */
export function TimerMenuItem() {
    const timer = use(TimerContext);
    const { timerSeconds, isRunning, isPaused, onStart, onPause, onClear } = timer;

    return (
        <MenuItem onClick={isRunning ? () => onPause(undefined, true) : () => onStart()}>
            <ListItemIcon>
                <TimerIcon color={isPaused ? 'warning' : isRunning ? 'secondary' : undefined} />
            </ListItemIcon>

            <Stack width={1} direction='row' alignItems='center' gap={1}>
                <Typography>Timer</Typography>
                <Typography fontWeight='bold' sx={{ minWidth: '42px' }}>
                    {formatTime(timerSeconds)}
                </Typography>
                <Tooltip title='Reset'>
                    <IconButton
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClear();
                        }}
                        sx={{ visibility: isPaused ? 'visible' : 'hidden' }}
                        color='error'
                    >
                        <NotInterested />
                    </IconButton>
                </Tooltip>
            </Stack>
            <TimerTaskDialog timer={timer} />
        </MenuItem>
    );
}

/**
 * Renders the task dialog for the given timer task.
 * @param timer The timer to render the dialog for.
 */
function TimerTaskDialog({ timer }: { timer: Timer }) {
    const { user } = useAuth();
    const { task, showTask, setShowTask } = timer;

    if (!user || !task || !showTask) return null;

    return (
        <TimelineProvider owner={user.username}>
            <TaskDialog
                open={true}
                onClose={() => setShowTask(false)}
                task={task}
                initialView={TaskDialogView.Progress}
                progress={user.progress?.[task.id]}
                cohort={user.dojoCohort || ''}
            />
        </TimelineProvider>
    );
}
