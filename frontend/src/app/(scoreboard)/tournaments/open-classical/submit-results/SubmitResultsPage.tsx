'use client';

import { useApi } from '@/api/Api';
import { axiosService } from '@/api/axiosService';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useRouter } from '@/hooks/useRouter';
import { PawnIcon } from '@/style/ChessIcons';
import { LocationOn, Person, TrendingUp } from '@mui/icons-material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { LoadingButton } from '@mui/lab';
import {
    Checkbox,
    Container,
    FormControlLabel,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';

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

    const [section, setSection] = useState('');
    const [region, setRegion] = useState('');
    const [gameUrl, setGameUrl] = useState('');
    const [white, setWhite] = useState('');
    const [black, setBlack] = useState('');
    const [result, setResult] = useState('');
    const [reportOpponent, setReportOpponent] = useState(false);
    const [notes, setNotes] = useState('');

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
                    gameUrl:
                        'Unable to fetch results from Lichess. Please ensure this is the correct URL before submitting.',
                });
            });
    };

    const onSubmit = () => {
        const newErrors: Record<string, string> = {};

        if (region === '') {
            newErrors.region = 'This field is required';
        }
        if (section === '') {
            newErrors.section = 'This field is required';
        }
        if (gamePlayed(result) && gameUrl.trim() === '') {
            newErrors.gameUrl = 'This field is required';
        }
        if (white.trim() === '') {
            newErrors.white = 'This field is required';
        }
        if (black.trim() === '') {
            newErrors.black = 'This field is required';
        }
        if (result.trim() === '') {
            newErrors.result = 'This field is required';
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
                        Submit Results for the Dojo Open Classical
                    </Typography>
                    <Typography>
                        Results are submitted for the current active round. No late results will be
                        accepted.
                    </Typography>
                </Stack>

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
                                    <LocationOn fontSize='medium' color='dojoOrange' />
                                </InputAdornment>
                            ),
                        },
                    }}
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
                    <MenuItem value='Open'>Open</MenuItem>
                    <MenuItem value='U1900'>U1900</MenuItem>
                </TextField>

                <TextField
                    data-testid='game-url'
                    label='Game URL'
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
                    helperText={errors.gameUrl || 'Please provide a link to the game'}
                />

                <TextField
                    data-testid='white'
                    label='White'
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
                    helperText={
                        errors.white || 'Lichess username of the player with the white pieces'
                    }
                />
                <TextField
                    data-testid='black'
                    label='Black'
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
                    helperText={
                        errors.black || 'Lichess username of the player with the black pieces'
                    }
                />

                <TextField
                    data-testid='result'
                    label='Result'
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
                    <MenuItem value='1-0'>White Wins (1-0)</MenuItem>
                    <MenuItem value='0-1'>Black Wins (0-1)</MenuItem>
                    <MenuItem value='1/2-1/2'>Draw (1/2-1/2)</MenuItem>
                    <MenuItem value='1/2-1/2F'>Did Not Play (1/2-1/2F)</MenuItem>
                    <MenuItem value='0-1F'>White Forfeits (0-1F)</MenuItem>
                    <MenuItem value='1-0F'>Black Forfeits (1-0F)</MenuItem>
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
                        label='Report opponent for unresponsiveness or unwillingness to schedule?'
                    />
                )}

                <TextField
                    data-testid='notes'
                    label='Notes'
                    multiline
                    minRows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

                <LoadingButton
                    data-testid='submit-button'
                    variant='contained'
                    loading={request.isLoading()}
                    onClick={onSubmit}
                    color='success'
                    sx={{ alignSelf: 'center' }}
                >
                    Submit
                </LoadingButton>
            </Stack>
        </Container>
    );
};

export default SubmitResultsPage;
