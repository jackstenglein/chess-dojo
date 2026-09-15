import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { ClubDetails } from '@/database/club';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface LeaveClubDialogProps {
    clubId: string;
    clubName: string;
    approvalRequired: boolean;
    open: boolean;
    onSuccess: (club: ClubDetails) => void;
    onClose: () => void;
}

export const LeaveClubDialog: React.FC<LeaveClubDialogProps> = ({
    clubId,
    clubName,
    approvalRequired,
    open,
    onSuccess,
    onClose,
}) => {
    const t = useTranslations('clubs.leaveDialog');
    const api = useApi();
    const request = useRequest();

    const onLeave = () => {
        request.onStart();
        api.leaveClub(clubId)
            .then((resp) => {
                onSuccess(resp.data);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Dialog
            maxWidth='sm'
            fullWidth
            open={open}
            onClose={request.isLoading() ? undefined : onClose}
        >
            <RequestSnackbar request={request} />

            <DialogTitle>{t('title', { clubName })}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {approvalRequired ? t('bodyApprovalRequired') : t('bodyNoApproval')}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    {t('cancel')}
                </Button>
                <Button loading={request.isLoading()} onClick={onLeave}>
                    {t('submit')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
