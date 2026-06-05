import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { ClubDetails } from '@/database/club';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useState } from 'react';

interface ClubJoinRequestDialogProps {
    clubId: string;
    clubName: string;
    open: boolean;
    onSuccess: (club: ClubDetails) => void;
    onClose: () => void;
}

export const ClubJoinRequestDialog: React.FC<ClubJoinRequestDialogProps> = ({
    clubId,
    clubName,
    open,
    onSuccess,
    onClose,
}) => {
    const api = useApi();
    const request = useRequest();
    const [notes, setNotes] = useState('');

    const onJoin = () => {
        request.onStart();
        api.requestToJoinClub(clubId, notes)
            .then((resp) => {
                onSuccess(resp.data);
                setNotes('');
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

            <DialogTitle>Request to join {clubName}?</DialogTitle>
            <DialogContent>
                <TextField
                    label='Optionally explain your request'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    Cancel
                </Button>
                <Button loading={request.isLoading()} onClick={onJoin}>
                    Request to Join
                </Button>
            </DialogActions>
        </Dialog>
    );
};
