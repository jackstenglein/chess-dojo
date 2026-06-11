import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useFreeTier } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { User } from '@/database/user';
import { RoundRobin } from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormHelperText,
    InputAdornment,
    TextField,
} from '@mui/material';
import { useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';

interface RegisterModalProps {
    cohort: string;
    open: boolean;
    onClose: () => void;
    user: User | undefined;
    onUpdateTournaments: (props: { waitlist?: RoundRobin; tournament?: RoundRobin }) => void;
}

export function RegisterModal({
    cohort,
    open,
    onClose,
    user,
    onUpdateTournaments,
}: RegisterModalProps) {
    const isFreeTier = useFreeTier();
    const [lichessUsername, setLichessUsername] = useState(user?.ratings.LICHESS?.username || '');
    const [chesscomUsername, setChesscomUsername] = useState(
        user?.ratings.CHESSCOM?.username || '',
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasReadRules, setHasReadRules] = useState(false);
    const [hasAgreedToScheduling, setHasAgreedToScheduling] = useState(false);
    const [hasAgreedNotToCheat, setHasAgreedNotToCheat] = useState(false);

    const [unbanUrl, setUnbanUrl] = useState('');

    const request = useRequest<string>();
    const api = useApi();

    if (!user) {
        return null;
    }

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (lichessUsername.trim() === '') {
            newErrors.lichessUsername = 'This field is required';
        }
        if (chesscomUsername.trim() === '') {
            newErrors.chesscomUsername = 'This field is required';
        }
        if (!hasReadRules || !hasAgreedToScheduling || !hasAgreedNotToCheat) {
            newErrors.rules = 'Please agree to all conditions';
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            return;
        }

        request.onStart();
        try {
            const resp = await api.registerForRoundRobin({
                cohort,
                lichessUsername,
                chesscomUsername,
            });

            if ('banned' in resp.data && resp.data.banned) {
                setUnbanUrl(resp.data.url);
            } else if ('url' in resp.data) {
                window.location.href = resp.data.url;
            } else {
                request.onSuccess('Successfully registered for the tournament');
                onUpdateTournaments({
                    waitlist: resp.data.waitlist as RoundRobin,
                    tournament: resp.data.tournament,
                });
                onClose();
            }
        } catch (err) {
            request.onFailure(err);
        }
    };

    if (unbanUrl) {
        return (
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>Register for the Round Robin?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Your account is not in good standing, due to not submitting any games in a
                        prior round robin tournament. To register for this tournament, you must pay
                        a fee of $15, in accordance with the terms on the info page.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button href={unbanUrl}>Continue</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <>
            <Dialog open={open} onClose={request.isLoading() ? undefined : onClose}>
                <DialogTitle>Register for the Round Robin?</DialogTitle>
                <DialogContent>
                    {isFreeTier && (
                        <DialogContentText sx={{ mb: 2 }}>
                            You will only be charged $2 once the tournament starts. After the
                            tournament starts, no refunds will be provided for withdrawals.
                        </DialogContentText>
                    )}

                    {user.discordId ? (
                        <>
                            <DialogContentText sx={{ mb: 2 }}>
                                To prevent cheating, all games in the tournament must be played
                                using either the Lichess or Chess.com accounts entered here.
                            </DialogContentText>

                            <TextField
                                fullWidth
                                margin='normal'
                                label='Lichess Username'
                                value={lichessUsername}
                                onChange={(e) => setLichessUsername(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position='start'>
                                                <SiLichess fontSize={25} />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                error={!!errors.lichessUsername}
                                helperText={errors.lichessUsername}
                            />

                            <TextField
                                fullWidth
                                margin='normal'
                                label='Chess.com Username'
                                value={chesscomUsername}
                                onChange={(e) => setChesscomUsername(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position='start'>
                                                <SiChessdotcom
                                                    fontSize={25}
                                                    style={{ color: '#81b64c' }}
                                                />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                error={!!errors.chesscomUsername}
                                helperText={errors.chesscomUsername}
                            />

                            <FormControlLabel
                                sx={{ mt: 1 }}
                                control={
                                    <Checkbox
                                        checked={hasReadRules}
                                        onChange={(e) => {
                                            setHasReadRules(e.target.checked);
                                        }}
                                    />
                                }
                                label='I have read all the rules on the info tab'
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={hasAgreedToScheduling}
                                        onChange={(e) => {
                                            setHasAgreedToScheduling(e.target.checked);
                                        }}
                                    />
                                }
                                label='I understand that scheduling games is my responsibility and I will withdraw if I no longer have time to play'
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={hasAgreedNotToCheat}
                                        onChange={(e) => {
                                            setHasAgreedNotToCheat(e.target.checked);
                                        }}
                                    />
                                }
                                label='I agree not to cheat'
                            />
                            {errors.rules && <FormHelperText error>{errors.rules}</FormHelperText>}
                        </>
                    ) : (
                        <>
                            <DialogContentText sx={{ mb: 2 }}>
                                Playing in the Round Robin requires a Discord account linked to your
                                Dojo profile, in order to facilitate communication and game
                                scheduling between players. Link your Discord account in your{' '}
                                <Link href='/profile/edit'>settings</Link>, then come back to
                                register.
                            </DialogContentText>
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        loading={request.isLoading()}
                        onClick={handleSubmit}
                        disabled={!user.discordId}
                    >
                        Register
                    </Button>
                </DialogActions>

                <RequestSnackbar request={request} showSuccess />
            </Dialog>
        </>
    );
}
