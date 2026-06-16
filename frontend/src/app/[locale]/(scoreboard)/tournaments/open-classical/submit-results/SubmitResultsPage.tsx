'use client';

import { useApi } from '@/api/Api';
import { axiosService } from '@/api/axiosService';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { encodeFileToBase64 } from '@/components/profile/edit/PersonalInfoEditor';
import { useRouter } from '@/hooks/useRouter';
import { PawnIcon } from '@/style/ChessIcons';
import { LocationOn, Person, TrendingUp } from '@mui/icons-material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ImageIcon from '@mui/icons-material/Image';
import {
    Button,
    Checkbox,
    Container,
    FormControlLabel,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const MAX_SCREENSHOT_SIZE_MB = 9;

interface LichessGameResponse {
    players: {
        white: {
            userId: string;
        };
        black: {
            userId: string;
        };
    };
    status: string;
    winner: string;
}

function gamePlayed(result: string): boolean {
    return result !== '1/2-1/2F' && result !== '1-0F' && result !== '0-1F';
}

const SubmitResultsPage = () => {
    const api = useApi();
    const router = useRouter();
    const t = useTranslations('tournaments.openClassical.submit');

    const [section, setSection] = useState('');
    const [region, setRegion] = useState('');
    const [gameUrl, setGameUrl] = useState('');
    const [white, setWhite] = useState('');
    const [black, setBlack] = useState('');
    const [result, setResult] = useState('');
    const [reportOpponent, setReportOpponent] = useState(false);
    const [notes, setNotes] = useState('');
    const [screenshotsData, setScreenshotsData] = useState<string[]>([]);
    const [screenshotNames, setScreenshotNames] = useState<string[]>([]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest();

    const onBlurGameUrl = () => {
        if (!gameUrl.startsWith('https://lichess.org/')) {
            setErrors({
                ...errors,
                gameUrl: '',
            });
            return;
        }
        const gameId = gameUrl.replace('https://lichess.org/', '').split('/')[0]?.split('#')[0];

        axiosService
            .get<LichessGameResponse>(`https://lichess.org/api/game/${gameId}`)
            .then((resp) => {
                setErrors({ ...errors, gameUrl: '' });
                setWhite(resp.data.players.white.userId);
                setBlack(resp.data.players.black.userId);
                const status = resp.data.status;
                if (status === 'stalemate' || status === 'draw') {
                    setResult('1/2-1/2');
                } else if (resp.data.winner === 'white') {
                    setResult('1-0');
                } else if (resp.data.winner === 'black') {
                    setResult('0-1');
                }
            })
            .catch(() => {
                setErrors({
                    ...errors,
                    gameUrl: t('errorFetchLichess'),
                });
            });
    };

    const onChangeScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) {
            return;
        }

        const fileList = Array.from(files);
        const oversized = fileList.find((file) => file.size / 1024 / 1024 > MAX_SCREENSHOT_SIZE_MB);
        if (oversized) {
            request.onFailure({ message: t('errorScreenshotTooLarge') });
            e.target.value = '';
            return;
        }

        Promise.all(fileList.map((file) => encodeFileToBase64(file)))
            .then((encoded) => {
                setScreenshotsData(encoded);
                setScreenshotNames(fileList.map((file) => file.name));
                setErrors({ ...errors, screenshots: '' });
            })
            .catch(() => {
                request.onFailure({ message: t('errorScreenshotRead') });
                e.target.value = '';
            });
    };

    const isForfeit = result === '0-1F' || result === '1-0F';

    const onSubmit = () => {
        const newErrors: Record<string, string> = {};

        if (region === '') {
            newErrors.region = t('errorRequired');
        }
        if (section === '') {
            newErrors.section = t('errorRequired');
        }
        if (gamePlayed(result) && gameUrl.trim() === '') {
            newErrors.gameUrl = t('errorRequired');
        }
        if (white.trim() === '') {
            newErrors.white = t('errorRequired');
        }
        if (black.trim() === '') {
            newErrors.black = t('errorRequired');
        }
        if (result.trim() === '') {
            newErrors.result = t('errorRequired');
        }
        if (isForfeit && screenshotsData.length === 0) {
            newErrors.screenshots = t('errorRequired');
        }

        setErrors(newErrors);
        if (Object.entries(newErrors).length > 0) {
            return;
        }

        request.onStart();
        api.submitResultsForOpenClassical({
            region,
            section,
            gameUrl: gameUrl.trim(),
            white: white.trim(),
            black: black.trim(),
            result: result.trim(),
            reportOpponent,
            notes: notes.trim(),
            screenshotsData: screenshotsData.length > 0 ? screenshotsData : undefined,
        })
            .then((resp) => {
                request.onSuccess();
                const round =
                    resp.data.sections[`${region}_${section}`]?.rounds.length || 'standings';
                router.push(
                    `/tournaments/open-classical?region=${region}&ratingRange=${section}&view=${round}`,
                );
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Container maxWidth='md' sx={{ pt: 5, pb: 10 }}>
            <RequestSnackbar request={request} />

            <Stack spacing={4}>
                <Stack spacing={1}>
                    <Typography data-testid='title' variant='h6'>
                        {t('title')}
                    </Typography>
                    <Typography>{t('instructions')}</Typography>
                </Stack>

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
                                    <LocationOn fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
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
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <TrendingUp fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    helperText={errors.section}
                >
                    <MenuItem value='Open'>{t('sectionOpen')}</MenuItem>
                    <MenuItem value='U1900'>{t('sectionU1900')}</MenuItem>
                </TextField>

                <TextField
                    data-testid='game-url'
                    label={t('labelGameUrl')}
                    value={gameUrl}
                    onChange={(e) => setGameUrl(e.target.value)}
                    onBlur={onBlurGameUrl}
                    error={Boolean(errors.gameUrl)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <AddLinkIcon fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    helperText={errors.gameUrl || t('gameUrlHelper')}
                />

                <TextField
                    data-testid='white'
                    label={t('labelWhite')}
                    required
                    value={white}
                    onChange={(e) => setWhite(e.target.value)}
                    error={Boolean(errors.white)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <Person fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    helperText={errors.white || t('whiteHelper')}
                />
                <TextField
                    data-testid='black'
                    label={t('labelBlack')}
                    required
                    value={black}
                    onChange={(e) => setBlack(e.target.value)}
                    error={Boolean(errors.black)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <Person fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    helperText={errors.black || t('blackHelper')}
                />

                <TextField
                    data-testid='result'
                    label={t('labelResult')}
                    select
                    required
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <PawnIcon fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
                    error={Boolean(errors.result)}
                    helperText={errors.result}
                >
                    <MenuItem value='1-0'>{t('resultWhiteWins')}</MenuItem>
                    <MenuItem value='0-1'>{t('resultBlackWins')}</MenuItem>
                    <MenuItem value='1/2-1/2'>{t('resultDraw')}</MenuItem>
                    <MenuItem value='1/2-1/2F'>{t('resultDidNotPlay')}</MenuItem>
                    <MenuItem value='0-1F'>{t('resultWhiteForfeits')}</MenuItem>
                    <MenuItem value='1-0F'>{t('resultBlackForfeits')}</MenuItem>
                </TextField>

                {(result === '0-1F' || result === '1-0F') && (
                    <FormControlLabel
                        data-testid='report-opponent'
                        control={
                            <Checkbox
                                checked={reportOpponent}
                                onChange={(event) => setReportOpponent(event.target.checked)}
                            />
                        }
                        label={t('reportOpponent')}
                    />
                )}

                <TextField
                    data-testid='notes'
                    label={t('labelNotes')}
                    multiline
                    minRows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

                {isForfeit && (
                    <Stack spacing={1}>
                        <Typography color='text.secondary'>{t('screenshotsHelper')}</Typography>
                        <Button
                            component='label'
                            variant='outlined'
                            startIcon={<ImageIcon color='dojoOrange' />}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {t('labelScreenshots')}
                            <input
                                hidden
                                type='file'
                                accept='image/*'
                                multiple
                                onChange={onChangeScreenshot}
                            />
                        </Button>
                        {screenshotNames.length > 0 && (
                            <Stack spacing={0.5}>
                                {screenshotNames.map((name) => (
                                    <Typography key={name} variant='body2' color='text.secondary'>
                                        {t('screenshotSelected', { name })}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                        {errors.screenshots && (
                            <Typography variant='body2' color='error'>
                                {errors.screenshots}
                            </Typography>
                        )}
                    </Stack>
                )}

                <Button
                    data-testid='submit-button'
                    variant='contained'
                    loading={request.isLoading()}
                    onClick={onSubmit}
                    color='success'
                    sx={{ alignSelf: 'center' }}
                >
                    {t('submit')}
                </Button>
            </Stack>
        </Container>
    );
};

export default SubmitResultsPage;
