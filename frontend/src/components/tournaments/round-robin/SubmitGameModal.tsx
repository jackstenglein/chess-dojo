import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { User } from '@/database/user';
import { RoundRobin, RoundRobinPlayer } from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    MenuItem,
} from '@mui/material';
import { useState } from 'react';

interface SubmitGameModalProps {
    cohort: string;
    startsAt: string;
    open: boolean;
    onClose: () => void;
    user: User | undefined;
    players: Record<string, RoundRobinPlayer>;
    onUpdateTournaments: (props: { waitlist?: RoundRobin; tournament?: RoundRobin }) => void;
}

export function SubmitGameModal({
    cohort,
    startsAt,
    open,
    onClose,
    user,
    players,
    onUpdateTournaments,
}: SubmitGameModalProps) {
    const [gameUrl, setGameUrl] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showMismatch, setShowMismatch] = useState(false);
    const [selectedOpponent, setSelectedOpponent] = useState<string>('');
    const [colorPlayed, setColorPlayed] = useState<string>('White');

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
        } catch (err: any) {
            const message = err?.response?.data?.message;

            request.onFailure(err);

            if (message?.includes('No pairing found')) {
                setShowMismatch(true);
            }

        }
    };

    const handleMismatchSubmit = async () => {
        if (selectedOpponent === '') {
            setErrors({ gameUrl: 'Must select an opponent.' });
            return;
        }
        setErrors({});

        // Add api handling

        setShowMismatch(false);
        setGameUrl('');
        setSelectedOpponent('');
        setColorPlayed('White');
        request.reset();
        onClose();
    }

    const handleClose = () => {
        onClose();
        request.reset();
        setGameUrl('');
    };

    const handleMismatchClose = () => {
        setErrors({});
        setShowMismatch(false);
        onClose();
        request.reset();
        setGameUrl('');
        setSelectedOpponent('');
        setColorPlayed('White');
    }

    const requestSnackbar = <RequestSnackbar request={request} showSuccess />

    if (showMismatch) {
        return (
            <>
                <Dialog open={showMismatch} onClose={request.isLoading() ? undefined : handleMismatchClose} fullWidth>
                    <DialogTitle>Mismatch Detected</DialogTitle>
                    <DialogContent>
                        <p>We detected a possible mismatch in the game. Please select the correct opponent.</p>
                        <TextField
                            select
                            fullWidth
                            label="Select the correct opponent"
                            value={selectedOpponent}
                            onChange={(e) => setSelectedOpponent(e.target.value)}
                            error={!!errors.gameUrl}
                            helperText={errors.gameUrl}
                            sx={{ mt: 2.5 }}
                        >
                            {
                                Object.values(players)
                                    .filter((p) => p.username !== user.username) // exclude current user
                                    .map((p) => (
                                        <MenuItem key={p.username} value={p.username}>
                                            {p.displayName || p.username}
                                        </MenuItem>
                                    )
                                    )
                            }
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Select color played"
                            value={colorPlayed}
                            onChange={(e) => setColorPlayed(e.target.value)}
                            sx={{ mt: 2.5 }}
                        >
                            <MenuItem value="White">White</MenuItem>
                            <MenuItem value="Black">Black</MenuItem>
                        </TextField>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={request.isLoading()} onClick={() => handleMismatchClose()}>
                            Cancel
                        </Button>
                        <LoadingButton loading={request.isLoading()} onClick={() => handleMismatchSubmit()}>
                            Confirm
                        </LoadingButton>
                    </DialogActions>
                </Dialog>
                {requestSnackbar}
            </>
        );
    }

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
                    <LoadingButton loading={request.isLoading()} onClick={handleSubmit}>
                        Submit
                    </LoadingButton>
                </DialogActions>
            </Dialog>
            {requestSnackbar}
        </>
    );
}

export default SubmitGameModal;
