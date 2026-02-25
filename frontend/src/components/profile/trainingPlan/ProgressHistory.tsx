import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import {
    CustomTask,
    getCurrentScore,
    isRequirement,
    Requirement,
    RequirementProgress,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, compareCohorts, dojoCohorts, User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { LoadingButton } from '@mui/lab';
import {
    Box,
    Button,
    Chip,
    DialogActions,
    DialogContent,
    DialogContentText,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AxiosResponse } from 'axios';
import deepEqual from 'deep-equal';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TaskDialogView } from './TaskDialog';

const NUMBER_REGEX = /^[0-9]*$/;
const NEGATIVE_NUMBER_REGEX = /^-?[0-9]*$/;

interface HistoryItem {
    date: DateTime | null;
    count: string;
    hours: string;
    minutes: string;
    notes: string;
    entry: TimelineEntry;
    index: number;
    deleted: boolean;
    cohort: string;
    /** True if this entry was added in the current session and not yet saved */
    isNew?: boolean;
}

interface ProgressHistoryItemProps {
    requirement: Requirement | CustomTask;
    item: HistoryItem;
    error: HistoryItemError;
    updateItem: (item: HistoryItem) => void;
    deleteItem: () => void;
}

export const ProgressHistoryItem = ({
    requirement,
    item,
    error,
    updateItem,
    deleteItem,
}: ProgressHistoryItemProps) => {
    if (item.deleted) {
        return null;
    }

    const cohortOptions = requirement.counts[ALL_COHORTS]
        ? dojoCohorts
        : Object.keys(requirement.counts).sort(compareCohorts);

    const isTimeOnly =
        item.entry.scoreboardDisplay === ScoreboardDisplay.NonDojo ||
        item.entry.scoreboardDisplay === ScoreboardDisplay.Minutes;

    const onChange = (
        key: 'date' | 'count' | 'hours' | 'minutes' | 'notes' | 'cohort',
        value: string | DateTime | null,
    ) => {
        updateItem({ ...item, [key]: value });
    };

    return (
        <Box>
            <Stack
                direction='row'
                spacing={{ sm: 1 }}
                width={1}
                alignItems='center'
                flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                rowGap={2}
            >
                <Grid container columnGap={2} rowGap={3} alignItems='center'>
                    {item.isNew && (
                        <Grid size={12}>
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <Chip label='New' size='small' color='primary' variant='outlined' />
                                <Typography variant='body2' color='text.secondary'>
                                    Fill in the details below
                                </Typography>
                            </Stack>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField
                            label='Cohort'
                            select
                            value={item.cohort}
                            onChange={(e) => onChange('cohort', e.target.value)}
                            fullWidth
                        >
                            {cohortOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: '145px' }}>
                        <DatePicker
                            label='Date'
                            value={item.date}
                            onChange={(v) => onChange('date', v)}
                            slotProps={{
                                textField: {
                                    error: !!error.date,
                                    helperText: error.date,
                                    fullWidth: true,
                                },
                            }}
                        />
                    </Grid>

                    {!isTimeOnly && (
                        <Grid size={{ xs: 12, sm: 'grow' }}>
                            <TextField
                                data-cy='task-history-count'
                                label='Count'
                                value={item.count}
                                onChange={(event) => onChange('count', event.target.value)}
                                fullWidth
                                error={!!error.count}
                                helperText={error.count}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField
                            label='Hours'
                            value={item.hours}
                            slotProps={{
                                htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                            }}
                            onChange={(event) => onChange('hours', event.target.value)}
                            fullWidth
                            error={!!error.hours}
                            helperText={error.hours}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField
                            label='Minutes'
                            value={item.minutes}
                            slotProps={{
                                htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                            }}
                            onChange={(event) => onChange('minutes', event.target.value)}
                            fullWidth
                            error={!!error.minutes}
                            helperText={error.minutes}
                        />
                    </Grid>

                    <Grid size={12}>
                        <TextField
                            label='Comments'
                            placeholder='Optional comments about your progress or the task itself. Visible to others on the newsfeed.'
                            multiline={true}
                            maxRows={3}
                            value={item.notes}
                            onChange={(e) => onChange('notes', e.target.value)}
                            fullWidth
                        />
                    </Grid>
                </Grid>

                <Tooltip title='Delete entry'>
                    <IconButton
                        data-cy='task-history-delete-button'
                        aria-label='delete'
                        onClick={deleteItem}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Divider sx={{ mt: 3, mb: 1 }} />
        </Box>
    );
};

interface HistoryItemError {
    date?: string;
    count?: string;
    hours?: string;
    minutes?: string;
}

function createNewEntry(
    requirement: Requirement | CustomTask,
    cohort: string,
    index: number,
): HistoryItem {
    const now = DateTime.now();
    return {
        date: now,
        count: '',
        hours: '',
        minutes: '',
        notes: '',
        cohort,
        index,
        deleted: false,
        isNew: true,
        entry: {
            id: `new-${now.toMillis()}-${index}`,
            requirementId: requirement.id,
            cohort,
            scoreboardDisplay: requirement.scoreboardDisplay,
            createdAt: now.toUTC().toISO() ?? '',
            date: now.toUTC().toISO() ?? '',
            previousCount: 0,
            newCount: 0,
            dojoPoints: 0,
            totalDojoPoints: 0,
            minutesSpent: 0,
            totalMinutesSpent: 0,
            notes: '',
        } as TimelineEntry,
    };
}

function getTimelineUpdate(
    requirement: Requirement | CustomTask | undefined,
    items: HistoryItem[],
): {
    progress: RequirementProgress;
    updated: TimelineEntry[];
    deleted: TimelineEntry[];
    errors: Record<number, HistoryItemError>;
} {
    const errors: Record<number, HistoryItemError> = {};

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.deleted) {
            continue;
        }

        const itemErrors: HistoryItemError = {};
        if (item.date === null) {
            itemErrors.date = 'This field is required';
        }

        if (
            item.count !== '' &&
            (!NEGATIVE_NUMBER_REGEX.test(item.count) || isNaN(parseInt(item.count)))
        ) {
            itemErrors.count = 'This field must be an integer';
        }

        if (item.hours !== '' && (!NUMBER_REGEX.test(item.hours) || isNaN(parseInt(item.hours)))) {
            itemErrors.hours = 'This field must be an integer';
        }

        if (
            item.minutes !== '' &&
            (!NUMBER_REGEX.test(item.minutes) || isNaN(parseInt(item.minutes)))
        ) {
            itemErrors.minutes = 'This field must be an integer';
        }

        if (Object.values(itemErrors).length > 0) {
            errors[i] = itemErrors;
        }
    }

    if (!requirement || Object.values(errors).length > 0) {
        return {
            progress: {
                requirementId: requirement?.id || '',
                minutesSpent: {},
                updatedAt: '',
            },
            updated: [],
            deleted: [],
            errors,
        };
    }

    const updated: TimelineEntry[] = [];
    const deleted: TimelineEntry[] = [];
    const progress: RequirementProgress & { counts: Record<string, number> } = {
        requirementId: requirement.id,
        minutesSpent: {},
        counts: {},
        updatedAt: '',
    };

    for (const item of items) {
        if (item.deleted) {
            deleted.push(item.entry);
            continue;
        }
        const cohort =
            requirement.numberOfCohorts === 0 || requirement.numberOfCohorts === 1
                ? ALL_COHORTS
                : item.cohort;

        const minutesSpent = 60 * parseInt(item.hours || '0') + parseInt(item.minutes || '0');
        progress.minutesSpent[item.cohort] =
            (progress.minutesSpent[item.cohort] ?? 0) + minutesSpent;

        const previousCount = progress.counts[cohort] ?? 0;
        const newCount =
            item.entry.scoreboardDisplay === ScoreboardDisplay.Minutes
                ? previousCount + minutesSpent
                : previousCount + parseInt(item.count || '0');
        progress.counts[cohort] = newCount;

        let previousScore = 0;
        let newScore = 0;
        if (isRequirement(requirement)) {
            previousScore = getCurrentScore(item.cohort, requirement, {
                counts: { [ALL_COHORTS]: previousCount, [item.cohort]: previousCount },
            } as unknown as RequirementProgress);
            newScore = getCurrentScore(item.cohort, requirement, {
                counts: { [ALL_COHORTS]: newCount, [item.cohort]: newCount },
            } as unknown as RequirementProgress);
        }

        const newEntry = {
            ...item.entry,
            cohort: item.cohort,
            notes: item.notes,
            date: item.date?.toUTC().toISO() || item.entry.createdAt,
            previousCount,
            newCount,
            dojoPoints: newScore - previousScore,
            totalDojoPoints: newScore,
            minutesSpent,
            totalMinutesSpent: progress.minutesSpent[item.cohort],
        };

        if (!deepEqual(item.entry, newEntry)) {
            updated.push(newEntry);
        }
    }

    return {
        progress,
        updated,
        deleted,
        errors,
    };
}

export function useProgressHistoryEditor({
    initialCohort,
    requirement,
    onSuccess,
}: {
    initialCohort?: string;
    requirement?: Requirement | CustomTask;
    onSuccess: () => void;
}) {
    const cohortOptions = requirement?.counts[ALL_COHORTS]
        ? dojoCohorts
        : Object.keys(requirement?.counts || {}).sort(compareCohorts);
    const cohort = initialCohort ?? cohortOptions[0] ?? dojoCohorts[0];

    const api = useApi();
    const request = useRequest<AxiosResponse<User>>();

    const [errors, setErrors] = useState<Record<number, HistoryItemError>>({});
    const {
        entries,
        request: timelineRequest,
        onEditEntries,
        onDeleteEntries,
    } = useTimelineContext();

    const isTimeOnly =
        requirement?.scoreboardDisplay === ScoreboardDisplay.NonDojo ||
        requirement?.scoreboardDisplay === ScoreboardDisplay.Minutes;

    const initialItems: HistoryItem[] = useMemo(() => {
        return entries
            .filter((t) => t.requirementId === requirement?.id)
            .sort((a, b) => (a.date || a.createdAt).localeCompare(b.date || b.createdAt))
            .map((t, idx) => ({
                date: DateTime.fromISO(t.date || t.createdAt),
                count: `${t.newCount - t.previousCount}`,
                hours: `${Math.floor(t.minutesSpent / 60)}`,
                minutes: `${t.minutesSpent % 60}`,
                notes: t.notes,
                cohort: t.cohort,
                entry: t,
                index: idx,
                deleted: false,
                isNew: false,
            }));
    }, [requirement, entries]);

    const [items, setItems] = useState(initialItems);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const update = useMemo(() => getTimelineUpdate(requirement, items), [requirement, items]);

    const newItemCount = items.filter((item) => item.isNew && !item.deleted).length;

    const cohortCount =
        update.progress.counts?.ALL_COHORTS ?? update.progress.counts?.[cohort] ?? 0;
    const totalCount = Object.values(update.progress.counts ?? {}).reduce(
        (sum, value) => sum + value,
        0,
    );

    const cohortTime = update.progress.minutesSpent[cohort] ?? 0;
    const totalTime = Object.values(update.progress.minutesSpent).reduce(
        (sum, value) => sum + value,
        0,
    );

    const getUpdateItem = useCallback(
        (idx: number) => (item: HistoryItem) =>
            setItems((items) => [...items.slice(0, idx), item, ...items.slice(idx + 1)]),
        [setItems],
    );

    const getDeleteItem = useCallback(
        (idx: number) => () =>
            setItems((items) => [
                ...items.slice(0, idx),
                { ...items[idx], deleted: true },
                ...items.slice(idx + 1),
            ]),
        [setItems],
    );

    /** Appends one new blank entry defaulting to today and the user's cohort */
    const addItem = useCallback(() => {
        if (!requirement) return;
        setItems((prev) => [...prev, createNewEntry(requirement, cohort, prev.length)]);
    }, [requirement, cohort]);

    const onSubmit = () => {
        setErrors(update.errors);
        if (Object.values(update.errors).length > 0) {
            return;
        }

        request.onStart();
        api.updateUserTimeline({
            requirementId: requirement?.id || '',
            progress: update.progress,
            updated: update.updated,
            deleted: update.deleted,
        })
            .then((response) => {
                trackEvent(EventType.UpdateTimeline, {
                    requirement_id: requirement?.id,
                    requirement_name: requirement?.name,
                    is_custom_requirement: !isRequirement(requirement),
                    total_count:
                        requirement?.scoreboardDisplay === ScoreboardDisplay.Minutes
                            ? totalTime
                            : totalCount,
                    total_minutes: totalTime,
                });
                request.onSuccess(response);
                onEditEntries(update.updated);
                onDeleteEntries(update.deleted);
                onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return {
        errors,
        request,
        timelineRequest,
        isTimeOnly,
        items,
        newItemCount,
        cohortCount,
        cohortTime,
        totalCount,
        totalTime,
        getUpdateItem,
        getDeleteItem,
        addItem,
        onSubmit,
    };
}

interface ProgressHistoryProps {
    requirement: Requirement | CustomTask;
    onClose: () => void;
    setView?: (view: TaskDialogView) => void;
}

const ProgressHistory = ({ requirement, onClose, setView }: ProgressHistoryProps) => {
    const { user } = useAuth();
    const topRef = useRef<HTMLDivElement>(null);

    const {
        errors,
        request,
        timelineRequest,
        isTimeOnly,
        items,
        newItemCount,
        cohortCount,
        cohortTime,
        totalCount,
        totalTime,
        getUpdateItem,
        getDeleteItem,
        addItem,
        onSubmit,
    } = useProgressHistoryEditor({
        requirement,
        initialCohort: user?.dojoCohort,
        onSuccess: onClose,
    });

    const handleAddAnother = () => {
        addItem();
        setTimeout(
            () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
            50,
        );
    };

    if (timelineRequest.isLoading()) {
        return (
            <DialogContent>
                <LoadingPage />
            </DialogContent>
        );
    }

    const activeItems = items.filter((item) => !item.deleted);
    const hasChanges = items.some(
        (item) => (item.isNew && !item.deleted) || (item.deleted && !item.isNew),
    );

    return (
        <>
            <DialogContent>
                <Stack spacing={3} ref={topRef}>
                    {activeItems.length === 0 ? (
                        <DialogContentText>
                            No history yet. Use "Add Another" below to log your first entry.
                        </DialogContentText>
                    ) : (
                        <Stack spacing={3} mt={1} width={1}>
                            {items.map((_, idx, array) => {
                                const reversedIdx = array.length - 1 - idx;
                                const item = array[reversedIdx];
                                return (
                                    <ProgressHistoryItem
                                        key={item.entry.id}
                                        requirement={requirement}
                                        item={item}
                                        error={errors[reversedIdx] || {}}
                                        updateItem={getUpdateItem(reversedIdx)}
                                        deleteItem={getDeleteItem(reversedIdx)}
                                    />
                                );
                            })}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>

            <Stack sx={{ flexGrow: 1, px: 2, pt: 1.5 }}>
                {!isTimeOnly && (
                    <Typography color='text.secondary'>
                        Total Count: {totalCount}. Current Cohort: {cohortCount}
                    </Typography>
                )}
                <Typography color='text.secondary'>
                    Total Time: {Math.floor(totalTime / 60)}h {totalTime % 60}m. Current Cohort:{' '}
                    {Math.floor(cohortTime / 60)}h {Math.floor(cohortTime % 60)}m
                </Typography>
            </Stack>

            <DialogActions sx={{ flexWrap: 'wrap' }}>
                <Button onClick={onClose} disabled={request.isLoading()}>
                    Cancel
                </Button>
                {setView && (
                    <>
                        <Button
                            onClick={() => setView(TaskDialogView.Details)}
                            disabled={request.isLoading()}
                        >
                            Task Details
                        </Button>
                        <Button
                            onClick={() => setView(TaskDialogView.Progress)}
                            disabled={request.isLoading()}
                        >
                            Update Progress
                        </Button>
                    </>
                )}
                <Button
                    data-cy='task-history-add-another-button'
                    variant='outlined'
                    startIcon={<AddIcon />}
                    onClick={handleAddAnother}
                    disabled={request.isLoading()}
                >
                    Add Another
                </Button>
                <LoadingButton
                    data-cy='task-updater-save-button'
                    loading={request.isLoading()}
                    onClick={onSubmit}
                    disabled={!hasChanges}
                >
                    {newItemCount > 0 ? `Save (${newItemCount} new)` : 'Save'}
                </LoadingButton>
            </DialogActions>

            <RequestSnackbar request={request} />
            <RequestSnackbar request={timelineRequest} />
        </>
    );
};

export default ProgressHistory;