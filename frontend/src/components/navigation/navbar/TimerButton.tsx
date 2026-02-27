import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { TaskDialog, TaskDialogView } from '@/components/profile/trainingPlan/TaskDialog';
import { CustomTask, Requirement } from '@/database/requirement';
import { User } from '@/database/user';
import { NotInterested, Pause, PlayArrow, Timer } from '@mui/icons-material';
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
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterLuxon } from '@mui/x-date-pickers-pro/AdapterLuxon';
import { useEffect, useState } from 'react';

/** Regex which matches the timer in the title of the page */
const TIMER_TITLE_REGEX = /^[\d:]+ - /;

/**
 * Renders a timer icon button. When clicked, the button opens a menu
 * which shows the current value of the timer and controls for starting/stopping
 * the timer.
 */
export function TimerButton() {
    const { user } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const timer = useTimer();
    const { isPaused, isRunning, taskToOpen, setTaskToOpen } = timer;

    if (!user) {
        return null;
    }

    return (
        <>
            <Tooltip title='Timer'>
                <IconButton
                    data-testid='Timer'
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    color={isPaused ? 'warning' : 'secondary'}
                    sx={{ color: !isPaused && !isRunning ? 'white' : undefined }}
                >
                    <Timer />
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
                    <TimerDetails timer={timer} />
                </Menu>
            )}
            {taskToOpen && (
                <GlobalTaskModal
                    task={taskToOpen}
                    onClose={() => setTaskToOpen(null)}
                    user={user}
                />
            )}
        </>
    );
}

/**
 * Renders a timer menu item. It shows the current value of the timer and controls
 * for starting/stopping the timer. It does not link anywhere.
 */
export function TimerMenuItem() {
    const { timerSeconds, isRunning, isPaused, onStart, onPause, onClear } = useTimer();

    return (
        <MenuItem onClick={isRunning ? onPause : () => onStart()}>
            <ListItemIcon>
                <Timer color={isPaused ? 'warning' : isRunning ? 'secondary' : undefined} />
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
        </MenuItem>
    );
}

interface Timer {
    timerSeconds: number;
    isRunning: boolean;
    isPaused: boolean;
    taskToOpen: Requirement | CustomTask | null;
    setTaskToOpen: (task: Requirement | CustomTask | null) => void;
    onStart: (task?: Requirement | CustomTask) => void;
    onPause: () => void;
    onClear: () => void;
}

export function useTimer(): Timer {
    const { user, updateUser } = useAuth();
    const api = useApi();
    const [timerSeconds, setTimerSeconds] = useState(() => getTimerSeconds(user));
    const [taskToOpen, setTaskToOpen] = useState<Requirement | CustomTask | null>(null);

    const isRunning = Boolean(user?.timerStartedAt);
    const isPaused = !isRunning && Boolean(user?.timerSeconds);

    useEffect(() => {
        if (isRunning) {
            const id = setInterval(() => {
                const seconds = getTimerSeconds(user);
                setTimerSeconds(seconds);
                document.title =
                    formatTime(seconds) + ` - ` + document.title.replace(TIMER_TITLE_REGEX, '');
            }, 1000);
            return () => clearInterval(id);
        } else {
            document.title = document.title.replace(TIMER_TITLE_REGEX, '');
        }
    }, [isRunning, setTimerSeconds, user]);

    const onStart = (task?: Requirement | CustomTask) => {
        const timerStartedAt = new Date().toISOString();
        let currentTimerSeconds = user?.timerSeconds || 0;
        updateUser({ timerStartedAt });
        if (task) {
            const storedTaskStr = localStorage.getItem('runningTimerTask');
            if (storedTaskStr) {
                try {
                    const storedTask = JSON.parse(storedTaskStr) as Requirement | CustomTask;
                    if (storedTask.id !== task.id) {
                        currentTimerSeconds = 0;
                        setTimerSeconds(0);
                    }
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to parse running task', e);
                }
            }
            localStorage.setItem('runningTimerTask', JSON.stringify(task));
        }

        updateUser({ timerStartedAt, timerSeconds: currentTimerSeconds });
        void api.updateUser({ timerStartedAt });
    };

    const onPause = () => {
        const timerSeconds = getTimerSeconds(user);
        updateUser({ timerSeconds, timerStartedAt: '' });
        void api.updateUser({ timerSeconds, timerStartedAt: '' });

        const storedTask = localStorage.getItem('runningTimerTask');
        if (storedTask) {
            try {
                setTaskToOpen(JSON.parse(storedTask) as Requirement | CustomTask);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Failed to parse running task', e);
            }
        }
    };

    const onClear = () => {
        updateUser({ timerSeconds: 0, timerStartedAt: '' });
        void api.updateUser({ timerSeconds: 0, timerStartedAt: '' });
        setTimerSeconds(0);
        localStorage.removeItem('runningTimerTask');
    };

    return {
        timerSeconds,
        isRunning,
        isPaused,
        taskToOpen,
        setTaskToOpen,
        onStart,
        onPause,
        onClear,
    };
}

function TimerDetails({ timer }: { timer: Timer }) {
    const { timerSeconds, isRunning, isPaused, onStart, onPause, onClear } = timer;

    return (
        <Box sx={{ px: 2 }}>
            <Stack direction='row' alignItems='center' gap={3}>
                <Typography variant='subtitle1' fontWeight='bold' color='textSecondary'>
                    Work Timer
                </Typography>
                <Typography fontWeight='bold'>{formatTime(timerSeconds)}</Typography>
            </Stack>

            <Stack direction='row' gap={2} mt={1}>
                {isRunning ? (
                    <Button startIcon={<Pause />} onClick={onPause}>
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
    );
}

/**
 * Returns the number of seconds on the given user's work timer.
 * @param user The user to get the work timer for.
 * @returns The number of seconds on the user's work timer.
 */
export function getTimerSeconds(user: User | undefined): number {
    let timerSeconds = user?.timerSeconds ?? 0;
    if (user?.timerStartedAt) {
        const now = Date.now();
        const startedAt = new Date(user.timerStartedAt).getTime();
        timerSeconds += (now - startedAt) / 1000;
    }
    return Math.floor(timerSeconds);
}
/**
 * wrapper component that lazy-loads the TimelineProvider
 * only when the timer is paused from the global header.
 */
function GlobalTaskModal({
    task,
    onClose,
    user,
}: {
    task: Requirement | CustomTask;
    onClose: () => void;
    user: User;
}) {
    return (
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <TaskDialog
                open={true}
                onClose={onClose}
                task={task}
                initialView={TaskDialogView.Progress}
                progress={user?.progress?.[task.id]}
                cohort={user?.dojoCohort || ''}
            />
        </LocalizationProvider>
    );
}
