import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { OpenClassical } from '@/database/tournament';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useState } from 'react';

interface EmailPairingsButtonProps {
    maxRound: number;
    currentRound: number;
    emailsSent?: boolean;
    onSuccess: (openClassical: OpenClassical) => void;
}

const EmailPairingsButton: React.FC<EmailPairingsButtonProps> = ({
    maxRound,
    currentRound,
    emailsSent,
    onSuccess,
}) => {
    const [open, setOpen] = useState(false);
    const api = useApi();
    const request = useRequest<string>();

    const onSendEmails = () => {
        request.onStart();
        api.adminEmailPairings(currentRound)
            .then((resp) => {
                onSuccess(resp.data.openClassical);
                request.onSuccess(`${resp.data.emailsSent} emails sent`);
                setOpen(false);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const handleClose = () => {
        if (request.isLoading()) {
            return;
        }
        setOpen(false);
        request.reset();
    };

    return (
        <>
            <Button
                variant='contained'
                color='warning'
                disabled={emailsSent || maxRound !== currentRound}
                onClick={() => setOpen(true)}
            >
                Send Pairing Emails
            </Button>

            <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
                <DialogTitle>Send Pairing Emails?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will email the pairings for the latest round for all sections. All
                        sections must be on the same round.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <LoadingButton loading={request.isLoading()} onClick={onSendEmails}>
                        Send Emails
                    </LoadingButton>
                </DialogActions>

                <RequestSnackbar request={request} />
            </Dialog>

            <RequestSnackbar request={request} showError={false} showSuccess />
        </>
    );
};

export default EmailPairingsButton;
