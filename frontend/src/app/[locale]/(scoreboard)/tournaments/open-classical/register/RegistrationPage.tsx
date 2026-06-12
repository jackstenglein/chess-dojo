'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import DiscordOAuthButton from '@/components/profile/edit/DiscordOAuthButton';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import { LocationOn } from '@mui/icons-material';
import EmailIcon from '@mui/icons-material/Email';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
    Button,
    Checkbox,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    InputAdornment,
    Link,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { SiLichess } from 'react-icons/si';

const RegistrationPage = () => {
    const { user, status } = useAuth();
    const api = useApi();
    const router = useRouter();
    const t = useTranslations('tournaments.openClassical.register');

    const [email, setEmail] = useState('');
    const [lichessUsername, setLichessUsername] = useState(user?.ratings.LICHESS?.username || '');
    const [title, setTitle] = useState('');
    const [region, setRegion] = useState('');
    const [section, setSection] = useState('');
    const [byeRequests, setByeRequests] = useState([
        false,
        false,
        false,
        false,
        false,
        false,
        false,
    ]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest();

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmedSteps, setConfirmedSteps] = useState(false);

    useEffect(() => {
        setLichessUsername(user?.ratings.LICHESS?.username || '');
    }, [user]);

    if (!user || status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (!user.discordId) {
        return (
            <Container maxWidth='md' sx={{ py: 5 }}>
                <Typography variant='h5'>{t('titleRegister')}</Typography>

                <Typography variant='h6' sx={{ my: 2 }}>
                    {t('discordRequired')}
                </Typography>

                <DiscordOAuthButton />
            </Container>
        );
    }

    const onSetByeRequest = (idx: number, value: boolean) => {
        setByeRequests([...byeRequests.slice(0, idx), value, ...byeRequests.slice(idx + 1)]);
    };

    const validateAndProceed = () => {
        const newErrors: Record<string, string> = {};

        if (!user && email.trim() === '') {
            newErrors.email = t('errorRequired');
        }
        if (lichessUsername.trim() === '') {
            newErrors.lichessUsername = t('errorRequired');
        }
        if (region === '') {
            newErrors.region = t('errorRequired');
        }
        if (section === '') {
            newErrors.section = t('errorRequired');
        }
        if (byeRequests.every((v) => v)) {
            newErrors.byeRequests = t('errorByeEvery');
        }
        logger.debug?.('New errors: ', newErrors);

        setErrors(newErrors);
        if (Object.entries(newErrors).length > 0) {
            return;
        }

        setShowConfirmDialog(true);
    };

    const onRegister = () => {
        request.onStart();
        api.registerForOpenClassical({
            lichessUsername: lichessUsername.trim(),
            title,
            region,
            section,
            byeRequests,
        })
            .then(() => {
                request.onSuccess();
                router.push(`/tournaments/open-classical?region=${region}&ratingRange=${section}`);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Container maxWidth='md' sx={{ pt: 5, pb: 10 }}>
            <RequestSnackbar request={request} />

            <Stack spacing={4} alignItems='center'>
                <Typography variant='h6' alignSelf='start'>
                    {t('titleRegister')}
                </Typography>

                {!user && (
                    <TextField
                        label={t('labelEmail')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                        error={Boolean(errors.email)}
                        helperText={errors.email}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <EmailIcon fontSize='medium' color='dojoOrange' />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                )}

                <TextField
                    label={t('labelLichessUsername')}
                    value={lichessUsername}
                    onChange={(e) => setLichessUsername(e.target.value)}
                    required={!user?.ratings.LICHESS?.username}
                    fullWidth
                    error={Boolean(errors.lichessUsername)}
                    helperText={errors.lichessUsername}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <SiLichess fontSize={23} />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <TextField
                    label={t('labelTitle')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    select
                    fullWidth
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <MilitaryTechIcon color='dojoOrange' fontSize='medium' />
                                </InputAdornment>
                            ),
                        },
                    }}
                >
                    <MenuItem value=''>{t('titleNone')}</MenuItem>
                    <MenuItem value='GM'>GM</MenuItem>
                    <MenuItem value='WGM'>WGM</MenuItem>
                    <MenuItem value='IM'>IM</MenuItem>
                    <MenuItem value='WIM'>WIM</MenuItem>
                    <MenuItem value='FM'>FM</MenuItem>
                    <MenuItem value='WFM'>WFM</MenuItem>
                    <MenuItem value='CM'>CM</MenuItem>
                    <MenuItem value='WCM'>WCM</MenuItem>
                </TextField>

                <TextField
                    data-testid='region'
                    label={t('labelRegion')}
                    select
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    error={Boolean(errors.region)}
                    helperText={errors.region}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <LocationOn color='dojoOrange' fontSize='medium' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    fullWidth
                >
                    <MenuItem value='A'>{t('regionA')}</MenuItem>
                    <MenuItem value='B'>{t('regionB')}</MenuItem>
                </TextField>

                <TextField
                    data-testid='section'
                    label={t('labelSection')}
                    select
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    error={Boolean(errors.section)}
                    helperText={errors.section}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <TrendingUpIcon color='dojoOrange' fontSize='medium' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    fullWidth
                >
                    <MenuItem value='Open'>{t('sectionOpen')}</MenuItem>
                    <MenuItem value='U1900'>{t('sectionU1900')}</MenuItem>
                </TextField>

                <FormControl error={Boolean(errors.byeRequests)}>
                    <FormLabel>{t('labelByeRequests')}</FormLabel>
                    <Stack direction='row' sx={{ flexWrap: 'wrap', columnGap: 2.5 }}>
                        {Array.from(Array(7)).map((_, i) => (
                            <FormControlLabel
                                key={i}
                                control={
                                    <Checkbox
                                        checked={byeRequests[i]}
                                        onChange={(event) =>
                                            onSetByeRequest(i, event.target.checked)
                                        }
                                    />
                                }
                                label={t('roundNumber', { number: i + 1 })}
                            />
                        ))}
                    </Stack>
                    <FormHelperText>{errors.byeRequests}</FormHelperText>
                </FormControl>

                <Button
                    variant='contained'
                    loading={request.isLoading()}
                    onClick={validateAndProceed}
                    color='success'
                >
                    {t('register')}
                </Button>
            </Stack>

            <Dialog
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>{t('confirmationTitle')}</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>{t('confirmationPrompt')}</Typography>
                    <Stack mt={2}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={confirmedSteps}
                                    onChange={(e) => setConfirmedSteps(e.target.checked)}
                                />
                            }
                            label={t.rich('confirmDmsLabel', {
                                link: (chunks) => (
                                    <Link
                                        target='_blank'
                                        href='https://medium.com/@ZombieInu/discord-enable-disable-allowing-dms-from-server-members-f84881d896c6'
                                        rel='noreferrer'
                                    >
                                        {chunks}
                                    </Link>
                                ),
                            })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        loading={request.isLoading()}
                        disabled={!confirmedSteps}
                        onClick={onRegister}
                    >
                        {t('agreeContinue')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default RegistrationPage;
