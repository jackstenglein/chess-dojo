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
import { LoadingButton } from '@mui/lab';
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
import { useEffect, useState } from 'react';
import { SiLichess } from 'react-icons/si';

const RegistrationPage = () => {
    const { user, status } = useAuth();
    const api = useApi();
    const router = useRouter();

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
                <Typography variant='h5'>Register for the Dojo Open Classical</Typography>

                <Typography variant='h6' sx={{ my: 2 }}>
                    Playing in the Open Classical requires a Discord account linked to your Dojo
                    profile, in order to facilitate communication and game scheduling between
                    players.
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
            newErrors.email = 'This field is required';
        }
        if (lichessUsername.trim() === '') {
            newErrors.lichessUsername = 'This field is required';
        }
        if (region === '') {
            newErrors.region = 'This field is required';
        }
        if (section === '') {
            newErrors.section = 'This field is required';
        }
        if (byeRequests.every((v) => v)) {
            newErrors.byeRequests = 'You cannot request a bye for every round';
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
                    Register for the Dojo Open Classical
                </Typography>

                {!user && (
                    <TextField
                        label='Email'
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
                    label='Lichess Username'
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
                    label='Title'
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
                    <MenuItem value=''>None</MenuItem>
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
                    label='Region'
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
                    <MenuItem value='A'>Region A (Americas)</MenuItem>
                    <MenuItem value='B'>Region B (Eurasia/Africa/Oceania)</MenuItem>
                </TextField>

                <TextField
                    data-testid='section'
                    label='Section'
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
                    <MenuItem value='Open'>Open</MenuItem>
                    <MenuItem value='U1900'>U1900 (Lichess)</MenuItem>
                </TextField>

                <FormControl error={Boolean(errors.byeRequests)}>
                    <FormLabel>Bye Requests</FormLabel>
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
                                label={`Round ${i + 1}`}
                            />
                        ))}
                    </Stack>
                    <FormHelperText>{errors.byeRequests}</FormHelperText>
                </FormControl>

                <LoadingButton
                    variant='contained'
                    loading={request.isLoading()}
                    onClick={validateAndProceed}
                    color='success'
                >
                    Register
                </LoadingButton>
            </Stack>

            <Dialog
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>Registration Confirmation</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Please confirm that you have completed the following:
                    </Typography>
                    <Stack mt={2}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={confirmedSteps}
                                    onChange={(e) => setConfirmedSteps(e.target.checked)}
                                />
                            }
                            label={
                                <>
                                    I enabled DMs from Discord server members (
                                    <Link
                                        target='_blank'
                                        href='https://medium.com/@ZombieInu/discord-enable-disable-allowing-dms-from-server-members-f84881d896c6'
                                        rel='noreferrer'
                                    >
                                        instructions
                                    </Link>
                                    )
                                </>
                            }
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        loading={request.isLoading()}
                        disabled={!confirmedSteps}
                        onClick={onRegister}
                    >
                        Agree and Continue
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default RegistrationPage;
