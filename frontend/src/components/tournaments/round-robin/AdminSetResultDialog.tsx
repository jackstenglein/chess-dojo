import { RequestSnackbar, useRequest } from '@/api/Request';
import { adminSetRoundRobinResult } from '@/api/roundRobinApi';
import {
    RoundRobin,
    RoundRobinAdminSetResultRequest,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type ResultValue = NonNullable<RoundRobinAdminSetResultRequest['result']>;

interface AdminSetResultDialogProps {
    open: boolean;
    onClose: () => void;
    cohort: string;
    startsAt: string;
    round: number;
    white: string;
    black: string;
    whiteDisplayName: string;
    blackDisplayName: string;
    initialResult?: string;
    initialUrl?: string;
    onUpdate: (tournament: RoundRobin) => void;
}

/**
 * Admin dialog to set, update, or clear a round robin pairing result.
 */
export function AdminSetResultDialog({
    open,
    onClose,
    cohort,
    startsAt,
    round,
    white,
    black,
    whiteDisplayName,
    blackDisplayName,
    initialResult,
    initialUrl,
    onUpdate,
}: AdminSetResultDialogProps) {
    const request = useRequest();
    const t = useTranslations('tournaments.roundRobin.adminSetResult');
    const [result, setResult] = useState<ResultValue>((initialResult as ResultValue) ?? '');
    const [url, setUrl] = useState(initialUrl ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async () => {
        const trimmedUrl = url.trim();
        if (result === '' && trimmedUrl === '' && !initialResult && !initialUrl) {
            setErrors({ result: t('errorResultOrUrl') });
            return;
        }
        setErrors({});

        try {
            request.onStart();
            const clearing = result === '' && !trimmedUrl;
            const resp = await adminSetRoundRobinResult({
                cohort,
                startsAt,
                round,
                white,
                black,
                result: clearing ? '' : result === '' && trimmedUrl ? undefined : result,
                url: clearing ? undefined : trimmedUrl || undefined,
            });
            onUpdate(resp.data);
            request.onSuccess();
            onClose();
        } catch (err) {
            request.onFailure(err);
        }
    };

    const handleClose = () => {
        if (request.isLoading()) {
            return;
        }
        onClose();
        request.reset();
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('pairing', { white: whiteDisplayName, black: blackDisplayName })}
                    </DialogContentText>
                    <TextField
                        select
                        fullWidth
                        label={t('labelResult')}
                        value={result}
                        onChange={(e) => {
                            const value = e.target.value as ResultValue;
                            setResult(value);
                            if (value === '') {
                                setUrl('');
                            }
                        }}
                        error={!!errors.result}
                        helperText={errors.result || t('resultHelper')}
                        sx={{ mt: 3 }}
                    >
                        <MenuItem value='1-0'>{t('resultWhiteWins')}</MenuItem>
                        <MenuItem value='0-1'>{t('resultBlackWins')}</MenuItem>
                        <MenuItem value='1/2-1/2'>{t('resultDraw')}</MenuItem>
                        <MenuItem value=''>{t('resultClear')}</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('labelGameUrl')}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        helperText={t('urlHelper')}
                        sx={{ mt: 2.5 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={handleClose}>
                        {t('cancel')}
                    </Button>
                    <Button loading={request.isLoading()} onClick={handleSubmit}>
                        {t('update')}
                    </Button>
                </DialogActions>
            </Dialog>
            <RequestSnackbar request={request} />
        </>
    );
}
