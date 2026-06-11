import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { User } from '@/database/user';
import { RoundRobin } from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useState } from 'react';

interface SubmitGameModalProps {
    cohort: string;
    startsAt: string;
    open: boolean;
    onClose: () => void;
    user: User | undefined;
    onUpdateTournaments: (props: { waitlist?: RoundRobin; tournament?: RoundRobin }) => void;
}

export function SubmitGameModal({
    cohort,
    startsAt,
    open,
    onClose,
    user,
    onUpdateTournaments,
}: SubmitGameModalProps) {
    const [gameUrl, setGameUrl] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest<string>();
    const api = useApi();

    if (!user) {
        return null;
    }

    const handleSubmit = async () => {
        if (gameUrl.trim() === '') {
            setErrors({ gameUrl: 'This field is required ' });
            return;
        }
        setErrors({});

        try {
            request.onStart();
            const resp = await api.submitRoundRobinGame({
                cohort,
                startsAt,
                url: gameUrl,
            });
            onUpdateTournaments({ tournament: resp.data });
            request.onSuccess('Game submitted');
            onClose();
            setGameUrl('');
        } catch (err) {
            request.onFailure(err);
        }
    };

    const handleClose = () => {
        onClose();
        request.reset();
        setGameUrl('');
    };

    return (
        <>
            <Dialog open={open} onClose={request.isLoading() ? undefined : handleClose} fullWidth>
                <DialogTitle>Submit Game</DialogTitle>
                <DialogContent>
                    <DialogContentText>Input your Lichess or Chess.com game URL.</DialogContentText>
                    <TextField
                        fullWidth
                        label='Game URL'
                        value={gameUrl}
                        onChange={(e) => setGameUrl(e.target.value)}
                        error={!!errors.gameUrl}
                        helperText={errors.gameUrl}
                        sx={{ mt: 2.5 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button loading={request.isLoading()} onClick={handleSubmit}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

            <RequestSnackbar request={request} showSuccess />
        </>
    );
}

export default SubmitGameModal;
