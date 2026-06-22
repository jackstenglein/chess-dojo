import { useApi } from '@/api/Api';
import { useRequirement } from '@/api/cache/requirements';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import LoadingPage from '@/loading/LoadingPage';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ProgressHistoryItem, useProgressHistoryEditor } from '../trainingPlan/ProgressHistory';

export function EditTimelinEntryDialog({
    entry,
    onClose,
    onDeleteEntry,
}: {
    entry: TimelineEntry;
    onClose: () => void;
    onDeleteEntry: (entry: TimelineEntry) => void;
}) {
    const t = useTranslations('profile.activity');
    const api = useApi();
    const { user } = useAuth();
    const deleteRequest = useRequest<string>();
    const isCustom = entry.isCustomRequirement;

    const customTask = isCustom
        ? user?.customTasks?.find((task) => task.id === entry.requirementId)
        : undefined;

    const { requirement: fetchedRequirement } = useRequirement(
        isCustom ? undefined : entry.requirementId,
    );

    const requirement = isCustom ? customTask : fetchedRequirement;

    const {
        errors,
        request,
        isTimeOnly,
        items,
        cohortCount,
        cohortTime,
        totalCount,
        totalTime,
        getUpdateItem,
        getDeleteItem,
        onSubmit,
    } = useProgressHistoryEditor({
        requirement,
        initialCohort: user?.dojoCohort,
        onSuccess: onClose,
    });

    const index = items.findIndex((v) => v.entry.id === entry.id);

    const onClearRestDay = async () => {
        deleteRequest.onStart();
        try {
            await api.updateUserTimeline({
                requirementId: TimelineSpecialRequirementId.RestDay,
                progress: {
                    requirementId: TimelineSpecialRequirementId.RestDay,
                    counts: {},
                    minutesSpent: {},
                    updatedAt: '',
                },
                updated: [],
                deleted: [entry],
            });
            onDeleteEntry(entry);
            deleteRequest.onSuccess(t('restDayCleared'));
            onClose();
        } catch (err) {
            deleteRequest.onFailure(err);
        }
    };

    if (entry.requirementId === TimelineSpecialRequirementId.RestDay) {
        return (
            <Dialog
                open
                onClose={deleteRequest.isLoading() ? undefined : onClose}
                fullWidth
                maxWidth='sm'
            >
                <DialogTitle>{t('clearRestDayTitle')}</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mt: 1 }}>{t('removeRestDayDescription')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button disabled={deleteRequest.isLoading()} onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button loading={deleteRequest.isLoading()} onClick={onClearRestDay}>
                        {t('clearRestDay')}
                    </Button>
                </DialogActions>

                <RequestSnackbar request={deleteRequest} />
            </Dialog>
        );
    }

    if (!requirement) {
        return (
            <Dialog
                open
                onClose={request.isLoading() ? undefined : onClose}
                fullWidth
                maxWidth='md'
            >
                <DialogContent>
                    <LoadingPage />
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button loading={request.isLoading()} onClick={onSubmit}>
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open onClose={request.isLoading() ? undefined : onClose} fullWidth maxWidth='md'>
            <DialogTitle>{t('updateTitle', { name: entry.requirementName })}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <ProgressHistoryItem
                        requirement={requirement}
                        item={items[index]}
                        error={errors[index] || {}}
                        updateItem={getUpdateItem(index)}
                        deleteItem={getDeleteItem(index)}
                    />
                </Box>

                <Stack mt={2}>
                    {!isTimeOnly && (
                        <Typography color='text.secondary'>
                            {t('totalCount', { totalCount, cohortCount })}
                        </Typography>
                    )}
                    <Typography color='text.secondary'>
                        {t('totalTime', {
                            totalHours: Math.floor(totalTime / 60),
                            totalMinutes: totalTime % 60,
                            cohortHours: Math.floor(cohortTime / 60),
                            cohortMinutes: Math.floor(cohortTime % 60),
                        })}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    {t('cancel')}
                </Button>
                <Button loading={request.isLoading()} onClick={onSubmit}>
                    {t('save')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
}
