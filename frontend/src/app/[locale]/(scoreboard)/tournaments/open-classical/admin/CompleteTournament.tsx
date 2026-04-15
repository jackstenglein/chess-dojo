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
    Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useState } from 'react';

interface CompleteTournamentProps {
    openClassical?: OpenClassical;
    onSuccess: (v: OpenClassical) => void;
}

const CompleteTournament: React.FC<CompleteTournamentProps> = ({ openClassical, onSuccess }) => {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<DateTime | null>(null);
    const request = useRequest();
    const api = useApi();

    const onComplete = () => {
        if (!date?.isValid) {
            return;
        }

        request.onStart();
        api.adminCompleteTournament(date.toUTC().toISO() || '')
            .then((resp) => {
                request.onSuccess();
                onSuccess(resp.data);
                setOpen(false);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    if (!openClassical || openClassical.acceptingRegistrations) {
        return null;
    }

    return (
        <>
            <Button variant='contained' color='error' onClick={() => setOpen(true)}>
                Complete Tournament
            </Button>
            <Dialog
                open={open}
                onClose={request.isLoading() ? undefined : () => setOpen(false)}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>Complete Tournament?</DialogTitle>
                <DialogContent>
                    <Stack spacing={3}>
                        <DialogContentText>
                            This will move the current tournament results to the Previous
                            Tournaments Page and create a new tournament with open registrations.
                            This action cannot be undone.
                        </DialogContentText>

                        <DatePicker
                            label='Next Tournament Start Date'
                            value={date}
                            onChange={(newValue) => setDate(newValue)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={request.isLoading()}>
                        Cancel
                    </Button>
                    <LoadingButton
                        loading={request.isLoading()}
                        color='error'
                        onClick={onComplete}
                        disabled={date === null}
                    >
                        Complete Tournament
                    </LoadingButton>
                </DialogActions>

                <RequestSnackbar request={request} />
            </Dialog>
        </>
    );
};

export default CompleteTournament;
