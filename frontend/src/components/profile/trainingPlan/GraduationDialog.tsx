import { EventType, setUserProperties, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { User } from '@/database/user';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';
import { useState } from 'react';

interface GraduationDialogProps {
    open: boolean;
    onClose: () => void;
    user: User | undefined;
}

export function GraduationDialog({ open, onClose, user }: GraduationDialogProps) {
    const api = useApi();
    const request = useRequest<string>();
    const [comments, setComments] = useState('');

    const onGraduate = () => {
        if (!user) return;
        request.onStart();
        api.graduate(comments)
            .then((response) => {
                request.onSuccess('Congratulations! You have successfully graduated!');
                trackEvent(EventType.Graduate, {
                    previous_cohort: response.data.graduation.previousCohort,
                    new_cohort: response.data.graduation.newCohort,
                    dojo_score: response.data.graduation.score,
                });
                setUserProperties({ ...user, ...response.data.userUpdate });
                onClose();
            })
            .catch((err) => request.onFailure(err));
    };

    return (
        <>
            <RequestSnackbar request={request} showSuccess />
            <Dialog open={open} onClose={request.isLoading() ? undefined : onClose} fullWidth>
                <DialogTitle>Graduate from {user?.dojoCohort}?</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <DialogContentText>
                            This will move you to the next cohort and add a badge to your profile.
                            You will also be added to the list of recent graduates, and Jesse will
                            review your profile in the next grad show on Twitch. If you just want to
                            look at tasks from other cohorts, use the dropdown in the training plan
                            instead.
                        </DialogContentText>
                        <DialogContentText>
                            Optionally add comments on what was most helpful about the program, what
                            could be improved, etc. This will be visible to all other members of the
                            Dojo.
                        </DialogContentText>
                        <TextField
                            label='Comments'
                            value={comments}
                            onChange={(event) => setComments(event.target.value)}
                            multiline
                            minRows={3}
                            maxRows={3}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={request.isLoading()}>
                        Cancel
                    </Button>
                    <LoadingButton loading={request.isLoading()} onClick={onGraduate}>
                        Graduate
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </>
    );
}
