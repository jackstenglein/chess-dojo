'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { getRatingRanges, OpenClassical } from '@/database/tournament';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import { Leaderboard, LocationOn, People, TrendingUp } from '@mui/icons-material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PublishIcon from '@mui/icons-material/Publish';
import RestoreIcon from '@mui/icons-material/Restore';
import {
    Button,
    Container,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect } from 'react';
import EntrantsTable from './EntrantsTable';
import PairingsTable from './PairingsTable';
import StandingsTable from './StandingsTable';

const DetailsPage = () => {
    const api = useApi();
    const request = useRequest<OpenClassical>();
    const { user } = useAuth();
    const { searchParams } = useNextSearchParams({ tournament: 'CURRENT' });
    const tournament = searchParams.get('tournament') || 'CURRENT';
    const t = useTranslations('tournaments.openClassical.details');

    const onSuccess = request.onSuccess;
    const handleData = useCallback(
        (openClassical: OpenClassical) => {
            onSuccess(openClassical);
        },
        [onSuccess],
    );

    const reset = request.reset;
    useEffect(() => {
        if (tournament) {
            reset();
        }
    }, [reset, tournament]);

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.getOpenClassical(tournament)
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, request, handleData, tournament]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Container sx={{ py: 5 }}>
            <RequestSnackbar request={request} />

            <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Stack spacing={1}>
                    <Typography variant='h4' alignItems={'center'}>
                        {t('title')}
                    </Typography>
                    <Stack direction='row' spacing={1}>
                        <Button
                            variant='outlined'
                            startIcon={<InfoIcon />}
                            href='/tournaments/open-classical/info'
                            component={Link}
                        >
                            {t('info')}
                        </Button>
                        <Button
                            variant='outlined'
                            startIcon={<RestoreIcon />}
                            href='/tournaments/open-classical/previous'
                            component={Link}
                        >
                            {t('history')}
                        </Button>
                    </Stack>
                </Stack>

                {(user?.isAdmin || user?.isTournamentAdmin) && (
                    <Button
                        component={Link}
                        variant='contained'
                        startIcon={<AdminPanelSettingsIcon />}
                        href='/tournaments/open-classical/admin'
                    >
                        {t('adminPortal')}
                    </Button>
                )}
            </Stack>

            <Details openClassical={request.data} />
        </Container>
    );
};

interface DetailsProps {
    openClassical?: OpenClassical;
}

const Details: React.FC<DetailsProps> = ({ openClassical }) => {
    const { searchParams, updateSearchParams } = useNextSearchParams({
        region: 'A',
        ratingRange: 'Open',
        view: 'standings',
    });
    const viewer = useAuth().user;
    const t = useTranslations('tournaments.openClassical.details');

    if (!openClassical) {
        return null;
    }

    const ratingRangeOptions = getRatingRanges(openClassical);
    const region = searchParams.get('region') || 'A';
    const ratingRange = searchParams.get('ratingRange') || ratingRangeOptions[0];
    const view = searchParams.get('view') || 'standings';

    const maxRound = openClassical.sections[`${region}_${ratingRange}`]?.rounds.length || 0;

    const registrationCloseDate = openClassical.registrationClose
        ? toDojoDateString(
              new Date(openClassical.registrationClose),
              viewer?.timezoneOverride,
              undefined,
              { month: 'long', day: 'numeric' },
          )
        : null;

    const registeredSection = Object.values(openClassical.sections).find((s) =>
        Boolean(s.players[viewer?.username ?? '']),
    );

    return (
        <Stack mt={4} spacing={3}>
            {openClassical.acceptingRegistrations ? (
                <Stack mt={4} pb={5} spacing={2} alignItems='start'>
                    <Typography>
                        {registeredSection
                            ? t('registeredMessage', {
                                  region: registeredSection.region,
                                  section: registeredSection.section,
                                  date: registrationCloseDate || t('soonFallback'),
                              })
                            : t('acceptingRegistrationsMessage', {
                                  date: registrationCloseDate || t('soonFallback'),
                              })}
                    </Typography>

                    <Button
                        variant='contained'
                        startIcon={<PlayArrowIcon />}
                        color='success'
                        href='/tournaments/open-classical/register'
                        component={Link}
                    >
                        {registeredSection ? t('updateRegistration') : t('register')}
                    </Button>
                </Stack>
            ) : openClassical.startsAt === 'CURRENT' ? (
                <Typography>
                    {t('resultsPostedMessage')}{' '}
                    <Button
                        variant='text'
                        startIcon={<PublishIcon />}
                        href='/tournaments/open-classical/submit-results'
                        component={Link}
                    >
                        {t('submitResults')}
                    </Button>
                </Typography>
            ) : (
                <Typography>{t('previousResults', { name: openClassical.name })}</Typography>
            )}

            <Stack direction='row' width={1} spacing={2}>
                <TextField
                    label={t('labelRegion')}
                    select
                    value={region}
                    onChange={(e) => updateSearchParams({ region: e.target.value })}
                    sx={{
                        flexGrow: 1,
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <LocationOn fontSize='medium' color='primary' />
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
                    value={ratingRange}
                    onChange={(e) => updateSearchParams({ ratingRange: e.target.value })}
                    sx={{
                        flexGrow: 1,
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <TrendingUp fontSize='medium' color='primary' />
                                </InputAdornment>
                            ),
                        },
                    }}
                >
                    {ratingRangeOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                            {opt}
                        </MenuItem>
                    ))}
                </TextField>

                {!openClassical.acceptingRegistrations && (
                    <TextField
                        label={t('labelView')}
                        select
                        value={view}
                        onChange={(e) => updateSearchParams({ view: e.target.value })}
                        sx={{
                            flexGrow: 1,
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        {view.includes('standing') ? (
                                            <Leaderboard fontSize={'medium'} color='primary' />
                                        ) : (
                                            <People fontSize={'medium'} color='primary' />
                                        )}
                                    </InputAdornment>
                                ),
                            },
                        }}
                    >
                        <MenuItem value='standings'>{t('overallStandings')}</MenuItem>
                        {Array(maxRound)
                            .fill(0)
                            .map((_, i) => (
                                <MenuItem key={i + 1} value={`${i + 1}`}>
                                    {t('roundNumber', { number: i + 1 })}
                                </MenuItem>
                            ))}
                    </TextField>
                )}
            </Stack>

            {openClassical.acceptingRegistrations ? (
                <EntrantsTable
                    openClassical={openClassical}
                    region={region}
                    ratingRange={ratingRange}
                />
            ) : view === 'standings' ? (
                <StandingsTable
                    openClassical={openClassical}
                    region={region}
                    ratingRange={ratingRange}
                />
            ) : (
                <PairingsTable
                    openClassical={openClassical}
                    region={region}
                    ratingRange={ratingRange}
                    round={parseInt(view)}
                />
            )}
        </Stack>
    );
};

export default DetailsPage;
