import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { User } from '@/database/user';
import {
    RoundRobin,
    RoundRobinStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface WithdrawModalProps {
    open: boolean;
    onClose: () => void;
    user: User | undefined;
    cohort: string;
    startsAt: string;
    onUpdateTournaments: (props: { waitlist?: RoundRobin; tournament?: RoundRobin }) => void;
}

export function WithdrawModal({
    open,
    onClose,
    user,
    cohort,
    startsAt,
    onUpdateTournaments,
}: WithdrawModalProps) {
    const request = useRequest<string>();
    const api = useApi();
    const t = useTranslations('tournaments.roundRobin.withdrawModal');

    if (!user) {
        return null;
    }

    const handleSubmit = async () => {
        try {
            request.onStart();
            const resp = await api.withdrawFromRoundRobin({ cohort, startsAt });
            request.onSuccess(t('successWithdrawn'));
            if (startsAt === RoundRobinStatuses.WAITING) {
                onUpdateTournaments({ waitlist: resp.data });
            } else {
                onUpdateTournaments({ tournament: resp.data });
            }

            onClose();
        } catch (err) {
            request.onFailure(err);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <>
            <Dialog open={open} onClose={request.isLoading() ? undefined : handleClose} fullWidth>
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('body')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button loading={request.isLoading()} onClick={handleSubmit}>
                        {t('withdraw')}
                    </Button>
                </DialogActions>
            </Dialog>

            <RequestSnackbar request={request} showSuccess />
        </>
    );
}
