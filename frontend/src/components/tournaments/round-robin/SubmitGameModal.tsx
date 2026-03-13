import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { User } from '@/database/user';
import { RoundRobin, RoundRobinPlayer } from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
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
    const [selectedOpponent, setSelectedOpponent] = useState('');
    const [colorPlayed, setColorPlayed] = useState('White');

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
        } catch (err: unknown) {
            request.onFailure(err);

            if (err instanceof Error) {
                const maybeAxiosError = err as { response?: { data?: { message?: string } } };
                const message = maybeAxiosError.response?.data?.message;

                if (message?.includes('No pairing found')) {
                    setShowMismatch(true);
                }
            }
        }
    };

    const handleMismatchSubmit = async () => {
        if (selectedOpponent === '') {
            setErrors({ gameUrl: 'Must select an opponent.' });
            return;
        }
        setErrors({});

        try {
            request.onStart();
            // Simulate API call for now
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            request.onSuccess('Game submitted');
            setShowMismatch(false);
            onClose();
            setGameUrl('');
            setSelectedOpponent('');
            setColorPlayed('White');
        } catch (err: unknown) {
            request.onFailure(err);
        }
    };

    const handleClose = () => {
        onClose();
        request.reset();
        setGameUrl('');
    };

    const handleMismatchClose = () => {
        setShowMismatch(false);
        handleClose();
        setSelectedOpponent('');
        setColorPlayed('White');
    };

    if (showMismatch) {
        return (
            <>
                <Dialog
                    open={showMismatch}
                    onClose={request.isLoading() ? undefined : handleMismatchClose}
                    fullWidth
                >
                    <DialogTitle>Mismatch Detected</DialogTitle>
                    <DialogContent>
                        <p>
                            We detected a possible mismatch in the game. Please select the correct
                            opponent.
                        </p>
                        <TextField
                            select
                            fullWidth
                            label='Select the correct opponent'
                            value={selectedOpponent}
                            onChange={(e) => setSelectedOpponent(e.target.value)}
                            error={!!errors.gameUrl}
                            helperText={errors.gameUrl}
                            sx={{ mt: 2.5 }}
                        >
                            {Object.values(players)
                                .filter((p) => p.username !== user.username) // exclude current user
                                .map((p) => (
                                    <MenuItem key={p.username} value={p.username}>
                                        {p.displayName || p.username}
                                    </MenuItem>
                                ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label='Select color played'
                            value={colorPlayed}
                            onChange={(e) => setColorPlayed(e.target.value)}
                            sx={{ mt: 2.5 }}
                        >
                            <MenuItem value='White'>White</MenuItem>
                            <MenuItem value='Black'>Black</MenuItem>
                        </TextField>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            disabled={request.isLoading()}
                            onClick={() => handleMismatchClose()}
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={request.isLoading()}
                            onClick={() => handleMismatchSubmit()}
                        >
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
                <RequestSnackbar request={request} showSuccess />
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
