import { Check, Warning } from '@mui/icons-material';
import {
    Button,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ColorFormat } from 'react-countdown-circle-timer';
import { BlockBoardKeyboardShortcuts } from '../../board/pgn/PgnBoard';

export enum ProblemStatus {
    Unknown = '',
    Complete = 'COMPLETE',
    NeedsReview = 'NEEDS_REVIEW',
}

export interface ExamPgnSelectorProps {
    name: string;
    cohortRange: string;
    count: number;
    selected: number;
    onSelect: (v: number) => void;
    countdown: CountdownProps;
    onComplete?: () => void;
    orientations: string[];
    pgnNames?: string[];
    problemStatus?: Record<number, ProblemStatus>;
    setProblemStatus?: (status: Record<number, ProblemStatus>) => void;
    onPause?: () => void;
    pauseLoading?: boolean;
}

const ExamPgnSelector: React.FC<ExamPgnSelectorProps> = ({
    name,
    cohortRange,
    count,
    selected,
    onSelect,
    countdown,
    onComplete,
    orientations,
    pgnNames,
    problemStatus,
    setProblemStatus,
    onPause,
    pauseLoading,
}) => {
    const t = useTranslations('exams.pgnSelector');
    const [isFinishEarly, setIsFinishEarly] = useState(false);
    const [statusAnchorEl, setStatusAnchorEl] = useState<HTMLElement | null>(null);
    const [openStatusProblem, setOpenStatusProblem] = useState(-1);

    const handleOpenStatusMenu = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (problemStatus && setProblemStatus) {
            e.preventDefault();
            setOpenStatusProblem(i);
            setStatusAnchorEl(e.currentTarget);
        }
    };

    const handleCloseStatusMenu = () => {
        setOpenStatusProblem(-1);
        setStatusAnchorEl(null);
    };

    const markStatus = (status: ProblemStatus) => {
        setProblemStatus?.({
            ...problemStatus,
            [openStatusProblem]: status,
        });
        handleCloseStatusMenu();
    };

    return (
        <CardContent>
            <Stack
                sx={{
                    alignItems: 'center',
                    mb: 3,
                }}
            >
                <Typography
                    variant='h6'
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {cohortRange}: {name}
                </Typography>
            </Stack>
            <Stack
                spacing={3}
                direction='row'
                sx={{
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CountdownTimer {...countdown} />
                {onPause && (
                    <Button variant='contained' onClick={onPause} loading={pauseLoading}>
                        {pauseLoading ? t('saving') : t('pause')}
                    </Button>
                )}
            </Stack>

            <List sx={{ mt: 2 }}>
                {Array.from(Array(count)).map((_, i) => (
                    <ListItem key={i} disablePadding>
                        <ListItemButton
                            selected={i === selected}
                            onClick={() => onSelect(i)}
                            onContextMenu={(e) => handleOpenStatusMenu(i, e)}
                        >
                            <ListItemIcon sx={{ minWidth: '40px' }}>
                                <Stack
                                    sx={{
                                        alignItems: 'center',
                                        width: 1,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: 'primary.main',
                                        }}
                                    >
                                        {i + 1}
                                    </Typography>
                                </Stack>
                            </ListItemIcon>
                            <Stack
                                direction='row'
                                spacing={1}
                                sx={{
                                    justifyContent: 'space-between',
                                    width: 1,
                                }}
                            >
                                <Typography>
                                    {pgnNames?.[i] || t('problemFallback', { number: i + 1 })}
                                </Typography>

                                <Stack direction='row' spacing={2}>
                                    {problemStatus?.[i] === ProblemStatus.Complete && (
                                        <Tooltip title={t('tooltipMarkedComplete')}>
                                            <Check color='success' />
                                        </Tooltip>
                                    )}
                                    {problemStatus?.[i] === ProblemStatus.NeedsReview && (
                                        <Tooltip title={t('tooltipMarkedNeedsReview')}>
                                            <Warning color='warning' />
                                        </Tooltip>
                                    )}
                                    <Typography
                                        sx={{
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {orientations[i] === 'white' ? t('white') : t('black')}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Stack
                sx={{
                    alignItems: 'center',
                    mt: 3,
                }}
            >
                <Button
                    variant='contained'
                    onClick={() => setIsFinishEarly(true)}
                    sx={{ alignSelf: 'center' }}
                >
                    {t('finishEarly')}
                </Button>
            </Stack>

            <Dialog
                open={isFinishEarly}
                onClose={() => setIsFinishEarly(false)}
                classes={{
                    container: BlockBoardKeyboardShortcuts,
                }}
                fullWidth
            >
                <DialogTitle>{t('finishEarlyDialogTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('finishEarlyDialogBody')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsFinishEarly(false)}>{t('cancel')}</Button>
                    <Button onClick={onComplete}>{t('finish')}</Button>
                </DialogActions>
            </Dialog>

            <Menu
                anchorEl={statusAnchorEl}
                open={Boolean(statusAnchorEl)}
                onClose={handleCloseStatusMenu}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                <MenuItem
                    onClick={() => markStatus(ProblemStatus.Complete)}
                    disabled={problemStatus?.[openStatusProblem] === ProblemStatus.Complete}
                >
                    {t('markAsCompleted')}
                </MenuItem>
                <MenuItem
                    onClick={() => markStatus(ProblemStatus.NeedsReview)}
                    disabled={problemStatus?.[openStatusProblem] === ProblemStatus.NeedsReview}
                >
                    {t('markAsNeedsReview')}
                </MenuItem>
                <MenuItem
                    onClick={() => markStatus(ProblemStatus.Unknown)}
                    disabled={!problemStatus?.[openStatusProblem]}
                >
                    {t('clearStatus')}
                </MenuItem>
            </Menu>
        </CardContent>
    );
};

export default ExamPgnSelector;

export const formatTime = (time: number) => {
    time = Math.round(time);
    const minutes = `0${Math.floor(time / 60)}`.slice(-2);
    const seconds = `0${time % 60}`.slice(-2);
    return `${minutes}:${seconds}`;
};

interface CountdownProps {
    elapsedTime: number;
    path: string;
    pathLength: number;
    remainingTime: number;
    rotation: 'clockwise' | 'counterclockwise';
    size: number;
    stroke: ColorFormat;
    strokeDashoffset: number;
    strokeWidth: number;
}

const CountdownTimer = (props: CountdownProps) => {
    const { path, pathLength, stroke, strokeDashoffset, remainingTime, size, strokeWidth } = props;
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                viewBox={`0 0 ${size} ${size}`}
                width={size}
                height={size}
                xmlns='http://www.w3.org/2000/svg'
            >
                <path d={path} fill='none' stroke='rgba(0, 0, 0, 0)' strokeWidth={strokeWidth} />
                <path
                    d={path}
                    fill='none'
                    stroke={stroke}
                    strokeLinecap={'round'}
                    strokeWidth={strokeWidth}
                    strokeDasharray={pathLength}
                    strokeDashoffset={strokeDashoffset}
                />
            </svg>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                }}
            >
                <span style={{ color: stroke }}>
                    <div>{formatTime(remainingTime)}</div>
                </span>
            </div>
        </div>
    );
};
