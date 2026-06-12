import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import WarningIcon from '@mui/icons-material/Warning';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useState } from 'react';

const REQUIRED_CONFIRM_TEXT = 'confirm';

export function ResetProgressButton() {
    const api = useApi();
    const request = useRequest<string>();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const normalizedConfirmText = confirmText.trim().toLowerCase();
    const canReset = normalizedConfirmText === REQUIRED_CONFIRM_TEXT;

    const openDialog = () => {
        request.reset();
        setConfirmText('');
        setOpen(true);
    };

    const closeDialog = () => {
        if (request.isLoading()) {
            return;
        }
        setConfirmText('');
        setOpen(false);
    };

    const resetProgress = () => {
        if (!canReset || request.isLoading()) {
            return;
        }

        request.onStart();
        api.resetUserProgress(normalizedConfirmText)
            .then(() => {
                trackEvent(EventType.ResetProgress);
                request.onSuccess('Training plan progress reset');
                setConfirmText('');
                setOpen(false);
            })
            .catch(request.onFailure);
    };

    return (
        <>
            <Alert
                severity='warning'
                variant='outlined'
                icon={<WarningIcon />}
                action={
                    <Button
                        color='error'
                        data-testid='reset-progress-open-button'
                        onClick={openDialog}
                        startIcon={<RestartAltIcon />}
                    >
                        Reset Progress
                    </Button>
                }
            >
                Clear your training plan progress for all cohorts. Use this if you are returning
                after a long break and want task progress to start at zero.
            </Alert>

            <Dialog open={open} onClose={closeDialog}>
                <DialogTitle>Reset Training Plan Progress?</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <DialogContentText>
                        This will completely clear your training plan progress for all cohorts. Your
                        activity history, comments, custom tasks, ratings, and graduations will not
                        be deleted.
                    </DialogContentText>
                    <TextField
                        label='Type "confirm" to confirm'
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value.toLowerCase())}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                resetProgress();
                            }
                        }}
                        fullWidth
                        size='small'
                        autoComplete='off'
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={closeDialog}>
                        Cancel
                    </Button>
                    <Button
                        color='error'
                        data-testid='reset-progress-confirm-button'
                        disabled={!canReset}
                        loading={request.isLoading()}
                        onClick={resetProgress}
                    >
                        Reset Progress
                    </Button>
                </DialogActions>
            </Dialog>

            <RequestSnackbar request={request} showSuccess />
        </>
    );
}
