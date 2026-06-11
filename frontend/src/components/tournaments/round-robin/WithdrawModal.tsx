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

    if (!user) {
        return null;
    }

    const handleSubmit = async () => {
        try {
            request.onStart();
            const resp = await api.withdrawFromRoundRobin({ cohort, startsAt });
            request.onSuccess('Successfully withdrew from round robin');
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
                <DialogTitle>Withdraw from Round Robin?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You will not be able to rejoin, and all your games will be counted as
                        losses, even those you have already played.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={request.isLoading()} onClick={handleSubmit}>
                        Withdraw
                    </Button>
                </DialogActions>
            </Dialog>

            <RequestSnackbar request={request} showSuccess />
        </>
    );
}
