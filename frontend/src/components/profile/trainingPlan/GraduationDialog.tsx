import { EventType, setUserProperties, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { User } from '@/database/user';
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
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface GraduationDialogProps {
    open: boolean;
    onClose: () => void;
    user: User | undefined;
}

export function GraduationDialog({ open, onClose, user }: GraduationDialogProps) {
    const t = useTranslations('profile.trainingPlan.graduation');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const api = useApi();
    const request = useRequest<string>();
    const [comments, setComments] = useState('');

    const onGraduate = () => {
        if (!user) return;
        request.onStart();
        api.graduate(comments)
            .then((response) => {
                request.onSuccess(t('success'));
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
                <DialogTitle>{t('title', { cohort: user?.dojoCohort ?? '' })}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <DialogContentText>{t('description')}</DialogContentText>
                        <DialogContentText>{t('commentsLabel')}</DialogContentText>
                        <TextField
                            label={tCommon('comments')}
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
                        {tCommon('cancel')}
                    </Button>
                    <Button loading={request.isLoading()} onClick={onGraduate}>
                        {t('graduate')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
