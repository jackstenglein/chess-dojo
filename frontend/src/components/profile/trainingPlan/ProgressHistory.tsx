import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { CustomTask, isRequirement, Requirement, ScoreboardDisplay } from '@/database/requirement';
import { ALL_COHORTS, compareCohorts, dojoCohorts, User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import AddIcon from '@mui/icons-material/Add';
import {
    Button,
    DialogActions,
    DialogContent,
    DialogContentText,
    Stack,
    Typography,
} from '@mui/material';
import { AxiosResponse } from 'axios';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    createNewEntry,
    getProgressSummary,
    getTimelineUpdate,
    type HistoryItem,
    type HistoryItemError,
    summarizeProgress,
} from './progressHistoryEditor';
import { ProgressHistoryList } from './ProgressHistoryList';
import { TaskDialogView } from './TaskDialog';

function mergeDraftItems(
    items: HistoryItem[],
    drafts: Record<number, HistoryItem | undefined>,
): HistoryItem[] {
    if (Object.keys(drafts).length === 0) {
        return items;
    }

    return items.map((item, index) => drafts[index] ?? item);
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
    const tCommon = useTranslations('profile.trainingPlan.common');
    const { user } = useAuth();
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
        // Older timeline entries in the database may have previousCount < startCount.
        // It's important to make sure that count will be newCount - startCount
        // in these cases, so we take Math.max(previousCount, startCount || 0).
        return entries
            .filter((t) => t.requirementId === requirement?.id)
            .sort((a, b) => (a.date || a.createdAt).localeCompare(b.date || b.createdAt))
            .map((t, idx) => ({
                date: DateTime.fromISO(t.date || t.createdAt),
                count: `${t.newCount - Math.max(t.previousCount, requirement?.startCount || 0)}`,
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
    const draftItemsRef = useRef<Record<number, HistoryItem | undefined>>({});

    useEffect(() => {
        draftItemsRef.current = {};
        setItems(initialItems);
    }, [initialItems]);

    const summary = useMemo(
        () => getProgressSummary(requirement, items, cohort),
        [requirement, items, cohort],
    );

    const updateItem = useCallback(
        (idx: number, item: HistoryItem) => {
            draftItemsRef.current[idx] = undefined;
            setItems((items) => [...items.slice(0, idx), item, ...items.slice(idx + 1)]);
        },
        [setItems],
    );

    const updateDraftItem = useCallback((idx: number, item: HistoryItem) => {
        draftItemsRef.current[idx] = item;
    }, []);

    const getDraftItem = useCallback((idx: number) => draftItemsRef.current[idx], []);

    const deleteItem = useCallback(
        (idx: number) => {
            draftItemsRef.current[idx] = undefined;
            setItems((items) => [
                ...items.slice(0, idx),
                { ...items[idx], deleted: true },
                ...items.slice(idx + 1),
            ]);
        },
        [setItems],
    );

    const addItem = useCallback(() => {
        if (!requirement || !user) return;
        setItems((prev) => [...prev, createNewEntry(requirement, cohort, prev.length, user)]);
    }, [requirement, cohort, user]);

    const onSubmit = async () => {
        const submittedItems = mergeDraftItems(items, draftItemsRef.current);
        const update = getTimelineUpdate(requirement, submittedItems, tCommon);
        setErrors(update.errors);
        if (Object.keys(update.errors).length > 0) return;

        const hasChanges = update.updated.length > 0 || update.deleted.length > 0;
        if (!hasChanges) {
            onSuccess();
            return;
        }

        const submittedSummary = summarizeProgress(update.progress, cohort);

        request.onStart();
        try {
            const response = await api.updateUserTimeline({
                requirementId: requirement?.id || '',
                progress: update.progress,
                updated: update.updated,
                deleted: update.deleted,
            });

            trackEvent(EventType.UpdateTimeline, {
                requirement_id: requirement?.id,
                requirement_name: requirement?.name,
                is_custom_requirement: !isRequirement(requirement),
                total_count:
                    requirement?.scoreboardDisplay === ScoreboardDisplay.Minutes
                        ? submittedSummary.totalTime
                        : submittedSummary.totalCount,
                total_minutes: submittedSummary.totalTime,
            });

            onEditEntries(update.updated);
            onDeleteEntries(update.deleted);
            request.onSuccess(response);
            onSuccess();
        } catch (err) {
            request.onFailure(err);
        }
    };

    return {
        errors,
        request,
        timelineRequest,
        isTimeOnly,
        items,
        cohortCount: summary.cohortCount,
        cohortTime: summary.cohortTime,
        totalCount: summary.totalCount,
        totalTime: summary.totalTime,
        updateItem,
        updateDraftItem,
        getDraftItem,
        deleteItem,
        addItem,
        onSubmit,
    };
}

interface ProgressHistoryProps {
    requirement: Requirement | CustomTask;
    onClose: () => void;
    setView?: (view: TaskDialogView) => void;
}

const ProgressHistory = ({
    requirement: rawRequirement,
    onClose,
    setView,
}: ProgressHistoryProps) => {
    const requirement = useTranslatedRequirement(rawRequirement) ?? rawRequirement;
    const t = useTranslations('profile.trainingPlan.progressHistory');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const { user } = useAuth();
    const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);
    const {
        errors,
        request,
        timelineRequest,
        isTimeOnly,
        items,
        cohortCount,
        cohortTime,
        totalCount,
        totalTime,
        updateItem,
        updateDraftItem,
        getDraftItem,
        deleteItem,
        addItem,
        onSubmit,
    } = useProgressHistoryEditor({
        // Pass the raw requirement so persisted TimelineEntry fields stay in
        // the source language; the translated requirement is used for display only.
        requirement: rawRequirement,
        initialCohort: user?.dojoCohort,
        onSuccess: onClose,
    });

    const rawSuffix = requirement?.progressBarSuffix?.trim();
    const countLabel = rawSuffix ? rawSuffix.charAt(0).toUpperCase() + rawSuffix.slice(1) : 'Count';

    if (timelineRequest.isLoading()) {
        return (
            <DialogContent>
                <LoadingPage />
            </DialogContent>
        );
    }

    return (
        <>
            <DialogContent ref={setScrollParent} sx={{ position: 'relative' }}>
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'flex-start',
                        mb: 3,
                    }}
                >
                    <Button
                        data-testid='task-history-add-new-button'
                        onClick={addItem}
                        disabled={request.isLoading()}
                        variant='contained'
                        size='small'
                        startIcon={<AddIcon />}
                    >
                        {t('addNew')}
                    </Button>
                </Stack>

                <Stack spacing={3}>
                    {items.length === 0 ? (
                        <DialogContentText data-testid='no-history-text'>
                            {t('noHistory')}
                        </DialogContentText>
                    ) : (
                        <ProgressHistoryList
                            requirement={requirement}
                            items={items}
                            errors={errors}
                            updateItem={updateItem}
                            updateDraftItem={updateDraftItem}
                            getDraftItem={getDraftItem}
                            deleteItem={deleteItem}
                            scrollParent={scrollParent}
                        />
                    )}
                </Stack>
            </DialogContent>

            <Stack sx={{ flexGrow: 1, px: 2, pt: 1.5 }}>
                {!isTimeOnly && (
                    <Typography
                        data-testid='total-count-summary'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('totalCount', {
                            label: countLabel,
                            total: totalCount,
                            cohortCount,
                        })}
                    </Typography>
                )}
                <Typography
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {t('totalTime', {
                        totalHours: Math.floor(totalTime / 60),
                        totalMinutes: totalTime % 60,
                        cohortHours: Math.floor(cohortTime / 60),
                        cohortMinutes: Math.floor(cohortTime % 60),
                    })}
                </Typography>
            </Stack>

            <DialogActions sx={{ flexWrap: 'wrap' }}>
                <Button onClick={onClose} disabled={request.isLoading()}>
                    {tCommon('cancel')}
                </Button>
                {setView && (
                    <>
                        <Button
                            onClick={() => setView(TaskDialogView.Details)}
                            disabled={request.isLoading()}
                        >
                            {tCommon('taskDetails')}
                        </Button>
                        <Button
                            onClick={() => setView(TaskDialogView.Progress)}
                            disabled={request.isLoading()}
                        >
                            {tCommon('updateProgress')}
                        </Button>
                    </>
                )}
                <Button
                    data-testid='task-updater-save-button'
                    loading={request.isLoading()}
                    onClick={onSubmit}
                >
                    {tCommon('save')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
            <RequestSnackbar request={timelineRequest} />
        </>
    );
};

export default ProgressHistory;
