import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { RequirementCategory } from '@/database/requirement';
import { dojoCohorts, GameScheduleEntry } from '@/database/user';
import { CategoryColors, themeRequirementCategory } from '@/style/ThemeProvider';
import { AddCircle, Check, Delete, Help, NotInterested } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import {
    CLASSICAL_GAMES_TASK_ID,
    getUpcomingGameSchedule,
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
} from './suggestedTasks';
import { TaskDialogView } from './TaskDialog';
import { TimeProgressChip } from './TimeProgressChip';
import { TrainingPlanContext } from './TrainingPlanTab';

export function ScheduleClassicalGameDaily() {
    const t = useTranslations('profile.trainingPlan.scheduleGame');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tCategory = useTranslations('enums.requirementCategory');
    const { user, isCurrentUser, toggleSkip } = use(TrainingPlanContext);
    const [taskDialogView, setTaskDialogView] = useState<
        TaskDialogView.Details | TaskDialogView.Progress
    >();
    const upcomingGames = getUpcomingGameSchedule(user.gameSchedule);

    return (
        <Grid size={{ xs: 12, md: 4 }}>
            <Card
                variant='outlined'
                sx={{
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: upcomingGames.length ? 0.6 : undefined,
                }}
            >
                <CardActionArea
                    sx={{ flexGrow: 1 }}
                    onClick={() => setTaskDialogView(TaskDialogView.Details)}
                >
                    <CardContent sx={{ height: 1 }}>
                        <Stack spacing={1} alignItems='start'>
                            <Chip
                                variant='outlined'
                                label={tCategory(RequirementCategory.Games)}
                                color={themeRequirementCategory(RequirementCategory.Games)}
                                size='small'
                            />

                            <Typography variant='h6' fontWeight='bold'>
                                {t('title')}
                            </Typography>
                        </Stack>

                        <Box
                            color='text.secondary'
                            sx={{
                                mt: 1,
                                lineClamp: 4,
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            <Typography>{t('cardDescription')}</Typography>
                        </Box>
                    </CardContent>
                </CardActionArea>
                <CardActions disableSpacing>
                    <Tooltip title={tCommon('viewTaskDetails')}>
                        <IconButton
                            sx={{ color: 'text.secondary' }}
                            onClick={() => setTaskDialogView(TaskDialogView.Details)}
                        >
                            <Help />
                        </IconButton>
                    </Tooltip>

                    {isCurrentUser && (
                        <>
                            <Tooltip title={tCommon('skipForWeek')}>
                                <IconButton
                                    onClick={() =>
                                        toggleSkip(
                                            CLASSICAL_GAMES_TASK_ID,
                                            SCHEDULE_CLASSICAL_GAME_TASK_ID,
                                        )
                                    }
                                    sx={{
                                        color: 'text.secondary',
                                        marginLeft: 'auto',
                                    }}
                                >
                                    <NotInterested />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}

                    <Tooltip title={isCurrentUser ? t('scheduleGameTooltip') : ''}>
                        <TimeProgressChip
                            value={upcomingGames.length}
                            goal={1}
                            slotProps={{
                                chip: {
                                    label: t('gamesLabel', { count: upcomingGames.length }),
                                    icon:
                                        upcomingGames.length > 0 ? (
                                            <Check fontSize='inherit' color='success' />
                                        ) : undefined,
                                    onClick: isCurrentUser
                                        ? () => setTaskDialogView(TaskDialogView.Progress)
                                        : undefined,
                                },
                                container: { mx: 0.5 },
                            }}
                        />
                    </Tooltip>
                </CardActions>
            </Card>

            {taskDialogView && (
                <ScheduleClassicalGameDialog
                    open
                    onClose={() => setTaskDialogView(undefined)}
                    initialView={taskDialogView}
                />
            )}
        </Grid>
    );
}

export const ScheduleClassicalGame = ({ hideChip }: { hideChip?: boolean }) => {
    const t = useTranslations('profile.trainingPlan.scheduleGame');
    const { user } = useAuth();
    const [taskDialogView, setTaskDialogView] = useState<
        TaskDialogView.Details | TaskDialogView.Progress
    >();

    const upcomingGames = getUpcomingGameSchedule(user?.gameSchedule);
    return (
        <Stack spacing={2} mt={2}>
            <Grid
                container
                columnGap={0.5}
                alignItems='center'
                justifyContent='space-between'
                position='relative'
            >
                <Grid
                    size={9}
                    onClick={() => setTaskDialogView(TaskDialogView.Details)}
                    sx={{ cursor: 'pointer', position: 'relative' }}
                    display='flex'
                    flexDirection='column'
                >
                    {!hideChip && (
                        <Chip
                            label={RequirementCategory.Games}
                            variant='outlined'
                            sx={{
                                color: CategoryColors[RequirementCategory.Games],
                                borderColor: CategoryColors[RequirementCategory.Games],
                                alignSelf: 'start',
                            }}
                            size='small'
                        />
                    )}

                    <Typography
                        sx={{
                            fontWeight: 'bold',
                            mt: 1,
                        }}
                    >
                        {t('title')}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 2, sm: 'auto' }}>
                    <Stack direction='row' alignItems='center' justifyContent='end'>
                        <Tooltip title={t('updateTooltip')}>
                            <Checkbox
                                checked={upcomingGames.length > 0}
                                onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                            />
                        </Tooltip>
                    </Stack>
                </Grid>
            </Grid>
            <Divider />

            {taskDialogView && (
                <ScheduleClassicalGameDialog
                    open
                    onClose={() => setTaskDialogView(undefined)}
                    initialView={taskDialogView}
                />
            )}
        </Stack>
    );
};

interface ScheduleClassicalGameDialogProps {
    open: boolean;
    onClose: () => void;
    initialView: TaskDialogView.Details | TaskDialogView.Progress;
}

function ScheduleClassicalGameDialog({
    open,
    onClose,
    initialView,
}: ScheduleClassicalGameDialogProps) {
    const t = useTranslations('profile.trainingPlan.scheduleGame');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const { user } = useAuth();
    const [view, setView] = useState(initialView);
    const [entries, setEntries] = useState<ScheduleFormEntry[]>(
        getScheduleFormEntries(user?.gameSchedule),
    );
    const [errors, setErrors] = useState<Record<number, { date?: string; count?: string }>>({});

    const api = useApi();
    const request = useRequest();

    const onSave = () => {
        const errors: Record<number, { date?: string; count?: string }> = {};
        const parsed: { date: string; count: number }[] = [];

        entries.forEach((entry, i) => {
            const count = parseInt(entry.count);
            parsed.push({ date: entry.date?.toUTC().toISO() ?? '', count });

            if (entry.date === null) {
                errors[i] = { date: t('dateRequired') };
            }

            if (!entry.count) {
                errors[i] = { ...errors[i], count: t('countRequired') };
            } else if (!/^[0-9]+$/.test(entry.count)) {
                errors[i] = {
                    ...errors[i],
                    count: t('countNumeric'),
                };
            } else if (count < 1) {
                errors[i] = { ...errors[i], count: t('countMinOne') };
            }
        });

        setErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        request.onStart();
        parsed.sort((lhs, rhs) => lhs.date.localeCompare(rhs.date));

        api.updateUser({ gameSchedule: parsed })
            .then(() => {
                request.onSuccess();
                onClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Dialog
            open={open}
            onClose={request.isLoading() ? undefined : onClose}
            maxWidth='md'
            fullWidth
        >
            <DialogTitle>{t('title')}</DialogTitle>

            <DialogContent>
                {view === TaskDialogView.Details && <ScheduleClassicalGameDialogDetails />}
                {view === TaskDialogView.Progress && (
                    <ScheduleClassicalGameDialogProgress
                        entries={entries}
                        setEntries={setEntries}
                        errors={errors}
                    />
                )}
            </DialogContent>

            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    {tCommon('cancel')}
                </Button>
                {view === TaskDialogView.Details ? (
                    <Button onClick={() => setView(TaskDialogView.Progress)}>
                        {t('updateSchedule')}
                    </Button>
                ) : (
                    <>
                        <Button
                            disabled={request.isLoading()}
                            onClick={() => setView(TaskDialogView.Details)}
                        >
                            {tCommon('taskDetails')}
                        </Button>
                        <Button loading={request.isLoading()} onClick={onSave}>
                            {tCommon('save')}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}

function ScheduleClassicalGameDialogDetails() {
    const t = useTranslations('profile.trainingPlan.scheduleGame');
    const { user } = useAuth();

    let minTimeControl = '30+0';
    const cohortIndex = dojoCohorts.indexOf(user?.dojoCohort || '');
    if (cohortIndex <= dojoCohorts.indexOf('700-800')) {
        minTimeControl = '30+0';
    } else if (cohortIndex <= dojoCohorts.indexOf('1100-1200')) {
        minTimeControl = '30+30';
    } else if (cohortIndex <= dojoCohorts.indexOf('1500-1600')) {
        minTimeControl = '45+30';
    } else if (cohortIndex <= dojoCohorts.indexOf('1900-2000')) {
        minTimeControl = '60+30';
    } else {
        minTimeControl = '90+30';
    }

    return (
        <Stack>
            <Typography>{t('detailsParagraph1')}</Typography>

            <Typography mt={3}>
                {t.rich('detailsParagraph2', {
                    cohort: user?.dojoCohort ?? '',
                    minTimeControl,
                    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
                })}
            </Typography>

            <Typography component='div' sx={{ mt: 3 }}>
                {t('detailsParagraph3')}
                <ul>
                    <li>
                        {t.rich('roundRobinItem', {
                            roundRobinLink: (chunks: React.ReactNode) => (
                                <Link href='/tournaments/round-robin'>{chunks}</Link>
                            ),
                        })}
                    </li>
                    <li>
                        {t.rich('openClassicalItem', {
                            openClassicalLink: (chunks: React.ReactNode) => (
                                <Link href='/tournaments/open-classical'>{chunks}</Link>
                            ),
                        })}
                    </li>
                    <li>
                        {t.rich('calendarItem', {
                            calendarLink: (chunks: React.ReactNode) => (
                                <Link href='/calendar'>{chunks}</Link>
                            ),
                        })}
                    </li>
                </ul>
            </Typography>
        </Stack>
    );
}

interface ScheduleFormEntry {
    date: DateTime | null;
    count: string;
}

function ScheduleClassicalGameDialogProgress({
    entries,
    setEntries,
    errors,
}: {
    entries: ScheduleFormEntry[];
    setEntries: (value: ScheduleFormEntry[]) => void;
    errors: Record<number, { date?: string; count?: string }>;
}) {
    const t = useTranslations('profile.trainingPlan.scheduleGame');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const onChangeDate = (i: number, date: DateTime | null) => {
        setEntries([...entries.slice(0, i), { ...entries[i], date }, ...entries.slice(i + 1)]);
    };

    const onChangeCount = (i: number, count: string) => {
        setEntries([...entries.slice(0, i), { ...entries[i], count }, ...entries.slice(i + 1)]);
    };

    const onRemove = (i: number) => {
        setEntries([...entries.slice(0, i), ...entries.slice(i + 1)]);
    };

    const onAddDate = () => {
        setEntries(entries.concat({ date: null, count: '1' }));
    };

    return (
        <Stack mt={0.75} alignItems='start' rowGap={3}>
            {entries.map((entry, i) => (
                <Stack key={i} direction='row' columnGap={2} width={1} alignItems='baseline'>
                    <DatePicker
                        label={tCommon('date')}
                        disablePast
                        value={entry.date}
                        onChange={(date) => onChangeDate(i, date)}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                error: !!errors[i]?.date,
                                helperText: errors[i]?.date,
                            },
                        }}
                    />
                    <TextField
                        label={t('numberOfGames')}
                        value={entry.count}
                        onChange={(event) => onChangeCount(i, event.target.value)}
                        fullWidth
                        error={!!errors[i]?.count}
                        helperText={errors[i]?.count}
                    />
                    <Tooltip title={t('deleteEntry')}>
                        <IconButton onClick={() => onRemove(i)}>
                            <Delete />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ))}

            <Button startIcon={<AddCircle />} onClick={onAddDate}>
                {t('addDate')}
            </Button>
        </Stack>
    );
}

function getScheduleFormEntries(gameSchedule?: GameScheduleEntry[]): ScheduleFormEntry[] {
    const upcomingGames = getUpcomingGameSchedule(gameSchedule);
    if (upcomingGames.length) {
        return upcomingGames.map((e) => ({
            date: DateTime.fromISO(e.date),
            count: `${e.count}`,
        }));
    }
    return [{ date: null, count: '1' }];
}
