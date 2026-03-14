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
    const api = useApi();
    const { user } = useAuth();
    const deleteRequest = useRequest();
    const isCustom = entry.isCustomRequirement;

    const customTask = isCustom
        ? user?.customTasks?.find((t) => t.id === entry.requirementId)
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
                updated: [],
                deleted: [entry],
            });
            onDeleteEntry(entry);
            deleteRequest.onSuccess('Rest day cleared');
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
                <DialogTitle>Clear Rest Day?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mt: 1 }}>
                        This will remove the rest day from your activity timeline.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button disabled={deleteRequest.isLoading()} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={deleteRequest.isLoading()} onClick={onClearRestDay}>
                        Clear Rest Day
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
                        Cancel
                    </Button>
                    <Button loading={request.isLoading()} onClick={onSubmit}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open onClose={request.isLoading() ? undefined : onClose} fullWidth maxWidth='md'>
            <DialogTitle>Update {entry.requirementName}?</DialogTitle>
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
                            Total Count: {totalCount}. Current Cohort: {cohortCount}
                        </Typography>
                    )}
                    <Typography color='text.secondary'>
                        Total Time: {Math.floor(totalTime / 60)}h {totalTime % 60}m. Current Cohort:{' '}
                        {Math.floor(cohortTime / 60)}h {Math.floor(cohortTime % 60)}m
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    Cancel
                </Button>
                <Button loading={request.isLoading()} onClick={onSubmit}>
                    Save
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
}
