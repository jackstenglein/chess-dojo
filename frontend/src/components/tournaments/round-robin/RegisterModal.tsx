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
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('tournaments.roundRobin.registerModal');

    if (!user) {
        return null;
    }

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (lichessUsername.trim() === '') {
            newErrors.lichessUsername = t('errorRequired');
        }
        if (chesscomUsername.trim() === '') {
            newErrors.chesscomUsername = t('errorRequired');
        }
        if (!hasReadRules || !hasAgreedToScheduling || !hasAgreedNotToCheat) {
            newErrors.rules = t('errorAgreeAll');
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
                request.onSuccess(t('successRegistered'));
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
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('unbannedBody')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>{t('cancel')}</Button>
                    <Button href={unbanUrl}>{t('continue')}</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <>
            <Dialog open={open} onClose={request.isLoading() ? undefined : onClose}>
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogContent>
                    {isFreeTier && (
                        <DialogContentText sx={{ mb: 2 }}>{t('freeTierBody')}</DialogContentText>
                    )}

                    {user.discordId ? (
                        <>
                            <DialogContentText sx={{ mb: 2 }}>
                                {t('accountsBody')}
                            </DialogContentText>

                            <TextField
                                fullWidth
                                margin='normal'
                                label={t('labelLichessUsername')}
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
                                label={t('labelChesscomUsername')}
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
                                label={t('checkReadRules')}
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
                                label={t('checkScheduling')}
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
                                label={t('checkNoCheat')}
                            />
                            {errors.rules && <FormHelperText error>{errors.rules}</FormHelperText>}
                        </>
                    ) : (
                        <>
                            <DialogContentText sx={{ mb: 2 }}>
                                {t.rich('discordRequired', {
                                    settingsLink: (chunks) => (
                                        <Link href='/profile/edit'>{chunks}</Link>
                                    ),
                                })}
                            </DialogContentText>
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button
                        loading={request.isLoading()}
                        onClick={handleSubmit}
                        disabled={!user.discordId}
                    >
                        {t('register')}
                    </Button>
                </DialogActions>

                <RequestSnackbar request={request} showSuccess />
            </Dialog>
        </>
    );
}
