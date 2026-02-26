import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { MastersCohort } from '@/database/game';
import { RequirementCategory } from '@/database/requirement';
import { dojoCohorts } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { SearchFunc } from '@/hooks/usePagination';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon from '@/style/Icon';
import { Folder } from '@mui/icons-material';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { LoadingButton } from '@mui/lab';
import {
    AccordionProps,
    AccordionSummaryProps,
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Accordion as MuiAccordion,
    AccordionDetails as MuiAccordionDetails,
    AccordionSummary as MuiAccordionSummary,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTime } from 'luxon';
import React, { useCallback, useEffect, useState } from 'react';

const Accordion = styled((props: AccordionProps) => (
    <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    '&:not(:last-child)': {
        borderBottom: 0,
    },
    '&:before': {
        display: 'none',
    },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary
        expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
        {...props}
    />
))(({ theme }) => ({
    backgroundColor:
        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : 'rgba(0, 0, 0, .03)',
    flexDirection: 'row-reverse',
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
        transform: 'rotate(90deg)',
    },
    '& .MuiAccordionSummary-content': {
        marginLeft: theme.spacing(1),
    },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    padding: theme.spacing(2),
    borderTop: '1px solid rgba(0, 0, 0, .125)',
}));

interface BaseFilterProps {
    startDate: DateTime | null;
    endDate: DateTime | null;
    isLoading: boolean;
    setStartDate: React.Dispatch<React.SetStateAction<DateTime | null>>;
    setEndDate: React.Dispatch<React.SetStateAction<DateTime | null>>;
    onSearch: () => void;
}

type SearchByCohortProps = BaseFilterProps & {
    cohort: string;
    setCohort: (cohort: string) => void;
};

export const SearchByCohort: React.FC<SearchByCohortProps> = ({
    cohort,
    startDate,
    endDate,
    isLoading,
    setCohort,
    setStartDate,
    setEndDate,
    onSearch,
}) => {
    return (
        <Stack data-testid='search-by-cohort' spacing={2}>
            <FormControl>
                <InputLabel>Cohort</InputLabel>
                <Select
                    data-testid='cohort-select'
                    value={cohort}
                    label='Cohort'
                    onChange={(e) => setCohort(e.target.value)}
                >
                    {dojoCohorts.concat(MastersCohort).map((c) => (
                        <MenuItem key={c} value={c}>
                            <CohortIcon
                                cohort={c}
                                size={35}
                                sx={{ marginRight: '0.6rem', verticalAlign: 'middle' }}
                                tooltip=''
                                color='primary'
                            />
                            {c === MastersCohort ? 'Masters DB' : c}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='Start Date'
                        value={startDate}
                        onChange={(newValue) => {
                            setStartDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'cohort-start-date', fullWidth: true },
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='End Date'
                        value={endDate}
                        onChange={(newValue) => {
                            setEndDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'cohort-end-date', fullWidth: true },
                        }}
                    />
                </Grid>
            </Grid>

            <LoadingButton
                data-testid='cohort-search-button'
                variant='outlined'
                loading={isLoading}
                onClick={onSearch}
                startIcon={<Icon name='search' color='primary' />}
            >
                Search
            </LoadingButton>
        </Stack>
    );
};

const SearchByOwner: React.FC<BaseFilterProps> = ({
    startDate,
    endDate,
    isLoading,
    setStartDate,
    setEndDate,
    onSearch,
}) => {
    return (
        <Stack data-testid='search-by-owner' spacing={2}>
            <Typography data-testid='owner-search-description' gutterBottom>
                Find games that you have uploaded to the Dojo Database. Note that games uploaded
                previously through Dojo 1.0's Google Form submission will not be matched.
            </Typography>
            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='Start Date'
                        value={startDate}
                        onChange={(newValue) => {
                            setStartDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'owner-start-date', fullWidth: true },
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='End Date'
                        value={endDate}
                        onChange={(newValue) => {
                            setEndDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'owner-end-date', fullWidth: true },
                        }}
                    />
                </Grid>
            </Grid>

            <LoadingButton
                data-testid='owner-search-button'
                variant='outlined'
                loading={isLoading}
                onClick={onSearch}
                startIcon={<Icon name='search' color='primary' />}
            >
                Search
            </LoadingButton>
        </Stack>
    );
};

type SearchByPlayerProps = BaseFilterProps & {
    player: string;
    color: string;
    setPlayer: React.Dispatch<React.SetStateAction<string>>;
    setColor: React.Dispatch<React.SetStateAction<string>>;
};

const SearchByPlayer: React.FC<SearchByPlayerProps> = ({
    player,
    color,
    startDate,
    endDate,
    isLoading,
    setPlayer,
    setColor,
    setStartDate,
    setEndDate,
    onSearch,
}) => {
    const isFreeTier = useFreeTier();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSearch = () => {
        const errors: Record<string, string> = {};
        if (player === '') {
            errors.player = 'This field is required';
        }
        setErrors(errors);

        if (Object.entries(errors).length > 0) {
            return;
        }

        onSearch();
    };

    return (
        <Stack data-testid='search-by-player' spacing={2}>
            <Typography gutterBottom>
                Find games based on player name. Note this is the name as it was recorded in the PGN
                file.
            </Typography>
            <TextField
                data-testid='player-name'
                label='Player Name'
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                error={!!errors.player}
                helperText={errors.player}
            />

            <Select
                data-testid='color'
                value={color}
                label='Color'
                onChange={(e) => setColor(e.target.value)}
            >
                <MenuItem value='either'>Either</MenuItem>
                <MenuItem value='white'>White</MenuItem>
                <MenuItem value='black'>Black</MenuItem>
            </Select>

            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='Start Date'
                        value={startDate}
                        onChange={(newValue) => {
                            setStartDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'player-start-date', fullWidth: true },
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='End Date'
                        value={endDate}
                        onChange={(newValue) => {
                            setEndDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'player-end-date', fullWidth: true },
                        }}
                    />
                </Grid>
            </Grid>

            <LoadingButton
                data-testid='player-search-button'
                variant='outlined'
                loading={isLoading}
                onClick={handleSearch}
                disabled={isFreeTier}
                startIcon={<Icon name='search' color='primary' />}
            >
                Search
            </LoadingButton>
            {isFreeTier && (
                <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mt: '0 !important', alignSelf: 'center' }}
                >
                    Free-tier users are not able to search by player name
                </Typography>
            )}
        </Stack>
    );
};

type SearchByOpeningProps = BaseFilterProps & {
    eco: string;
    setEco: React.Dispatch<React.SetStateAction<string>>;
};

const SearchByOpening: React.FC<SearchByOpeningProps> = ({
    eco,
    startDate,
    endDate,
    isLoading,
    setEco,
    setStartDate,
    setEndDate,
    onSearch,
}) => {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSearch = () => {
        const errors: Record<string, string> = {};
        if (eco === '') {
            errors.eco = 'This field is required';
        }
        setErrors(errors);

        if (Object.entries(errors).length > 0) {
            return;
        }

        onSearch();
    };

    return (
        <Stack data-testid='search-by-opening' spacing={2}>
            <FormControl>
                <Typography gutterBottom>Find games based on opening ECO Codes</Typography>
                <TextField
                    data-testid='opening-eco'
                    value={eco}
                    label='Opening ECO'
                    onChange={(e) => setEco(e.target.value)}
                    error={!!errors.eco}
                    helperText={errors.eco}
                />
            </FormControl>

            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='Start Date'
                        value={startDate}
                        onChange={(newValue) => {
                            setStartDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'opening-start-date', fullWidth: true },
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label='End Date'
                        value={endDate}
                        onChange={(newValue) => {
                            setEndDate(newValue);
                        }}
                        slotProps={{
                            textField: { id: 'opening-end-date', fullWidth: true },
                        }}
                    />
                </Grid>
            </Grid>

            <LoadingButton
                data-testid='opening-search-button'
                variant='outlined'
                loading={isLoading}
                onClick={handleSearch}
                startIcon={<Icon name='search' color='primary' />}
            >
                Search
            </LoadingButton>
        </Stack>
    );
};

type SearchByPositionProps = BaseFilterProps & {
    fen: string;
    setFen: React.Dispatch<React.SetStateAction<string>>;
};

const SearchByPosition: React.FC<SearchByPositionProps> = ({
    fen,
    isLoading,
    setFen,
    onSearch,
}) => {
    const isFreeTier = useFreeTier();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSearch = () => {
        const errors: Record<string, string> = {};
        if (fen === '') {
            errors.fen = 'This field is required';
        }
        setErrors(errors);

        if (Object.entries(errors).length > 0) {
            return;
        }

        onSearch();
    };

    return (
        <Stack data-testid='search-by-position' spacing={2}>
            <FormControl>
                <TextField
                    data-testid='fen'
                    value={fen}
                    label='FEN'
                    onChange={(e) => setFen(e.target.value)}
                    error={!!errors.fen}
                    helperText={errors.fen}
                />
            </FormControl>

            <LoadingButton
                data-testid='fen-search-button'
                variant='outlined'
                loading={isLoading}
                onClick={handleSearch}
                disabled={isFreeTier}
                startIcon={<Icon name='search' color='primary' />}
            >
                Search
            </LoadingButton>

            {isFreeTier ? (
                <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mt: '0 !important', alignSelf: 'center' }}
                >
                    Free-tier users are not able to search by position
                </Typography>
            ) : (
                <LoadingButton
                    href={`/games/analysis?fen=${fen}`}
                    component={Link}
                    disabled={isLoading}
                    variant='outlined'
                    startIcon={<Icon name='explore' color='primary' />}
                >
                    Position Explorer
                </LoadingButton>
            )}
        </Stack>
    );
};

const SearchFiles = () => {
    return (
        <Stack data-testid='search-files' spacing={2}>
            <Button href='/profile?view=games' variant='outlined'>
                Go to My Files
            </Button>
        </Stack>
    );
};

enum SearchType {
    Cohort = 'cohort',
    Player = 'player',
    Owner = 'owner',
    Opening = 'opening',
    Position = 'position',
    Files = 'files',
}

function isValid(d: Date | null): boolean {
    return d instanceof Date && !isNaN(d.getTime());
}

interface SearchFiltersProps {
    isLoading: boolean;
    onSearch: (searchFunc: SearchFunc) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ isLoading, onSearch }) => {
    const { user } = useAuth();
    const api = useApi();

    const { searchParams, setSearchParams } = useNextSearchParams({
        cohort: user?.dojoCohort || '',
        player: '',
        color: 'either',
        eco: '',
        fen: '',
        type: SearchType.Cohort,
    });

    const [expanded, setExpanded] = useState<string | false>(searchParams.get('type') || '');
    const onChangePanel =
        (panel: string) => (_event: React.SyntheticEvent, newExpanded: boolean) => {
            setExpanded(newExpanded ? panel : false);
        };

    // State variables for editing the form before clicking search
    const [editCohort, setCohort] = useState(
        (searchParams.get('cohort') || '').replaceAll('%2B', '+'),
    );
    const [editPlayer, setPlayer] = useState(searchParams.get('player') || '');
    const [editColor, setColor] = useState(searchParams.get('color') || '');
    const [editEco, setEditEco] = useState(searchParams.get('eco') || '');
    const [editFen, setEditFen] = useState(searchParams.get('fen') || '');

    const paramsStartDate = searchParams.get('startDate');
    const paramsEndDate = searchParams.get('endDate');

    const [editStartDate, setStartDate] = useState<DateTime | null>(
        paramsStartDate ? DateTime.fromISO(paramsStartDate) : null,
    );
    const [editEndDate, setEndDate] = useState<DateTime | null>(
        paramsEndDate ? DateTime.fromISO(paramsEndDate) : null,
    );

    // Submitted variables that should be searched on
    const type = searchParams.get('type') || SearchType.Cohort;
    const cohort = searchParams.get('cohort') || user?.dojoCohort || '';
    const player = searchParams.get('player') || '';
    const color = searchParams.get('color') || 'either';
    const eco = searchParams.get('eco') || '';
    const fen = searchParams.get('fen') || '';
    const mastersOnly = searchParams.get('masters') === 'true';

    let startDateStr: string | undefined = undefined;
    let endDateStr: string | undefined = undefined;
    if (isValid(new Date(paramsStartDate || ''))) {
        startDateStr = new Date(paramsStartDate || '')
            .toISOString()
            .substring(0, 10)
            .replaceAll('-', '.');
    }
    if (isValid(new Date(paramsEndDate || ''))) {
        endDateStr = new Date(paramsEndDate || '')
            .toISOString()
            .substring(0, 10)
            .replaceAll('-', '.');
    }

    // Functions that actually perform the search
    const searchByCohort = useCallback(
        (startKey: string) => api.listGamesByCohort(cohort, startKey, startDateStr, endDateStr),
        [cohort, api, startDateStr, endDateStr],
    );

    const searchByPlayer = useCallback(
        (startKey: string) =>
            api.listGamesByOwner(undefined, startKey, startDateStr, endDateStr, player, color),
        [api, startDateStr, endDateStr, player, color],
    );

    const searchByOwner = useCallback(
        (startKey: string) =>
            api.listGamesByOwner(user?.username, startKey, startDateStr, endDateStr),
        [api, user?.username, startDateStr, endDateStr],
    );

    const searchByOpening = useCallback(
        (startKey: string) => api.listGamesByOpening(eco, startKey, startDateStr, endDateStr),
        [api, eco, startDateStr, endDateStr],
    );

    const searchByPosition = useCallback(
        (startKey: string) => api.listGamesByPosition(fen, mastersOnly, startKey),
        [api, fen, mastersOnly],
    );

    // Search is called every time the above functions change, which should
    // happen only when the searchParams change
    useEffect(() => {
        switch (type) {
            case SearchType.Owner:
                onSearch(searchByOwner);
                break;

            case SearchType.Player:
                onSearch(searchByPlayer);
                break;

            case SearchType.Cohort:
                onSearch(searchByCohort);
                break;

            case SearchType.Opening:
                onSearch(searchByOpening);
                break;

            case SearchType.Position:
                onSearch(searchByPosition);
                break;
        }
    }, [
        type,
        onSearch,
        searchByOwner,
        searchByPlayer,
        searchByCohort,
        searchByOpening,
        searchByPosition,
    ]);

    // Functions that change the search params
    const onSetSearchParams = (params: Record<string, string>) => {
        trackEvent(EventType.SearchGames, params);
        setSearchParams(params);
    };

    const onSearchByCohort = () => {
        onSetSearchParams({
            type: SearchType.Cohort,
            cohort: editCohort,
            startDate: editStartDate?.toUTC().toISO() || '',
            endDate: editEndDate?.toUTC().toISO() || '',
        });
    };

    const onSearchByPlayer = () => {
        onSetSearchParams({
            type: SearchType.Player,
            player: editPlayer,
            color: editColor,
            startDate: editStartDate?.toUTC().toISO() || '',
            endDate: editEndDate?.toUTC().toISO() || '',
        });
    };

    const onSearchByOpening = () => {
        onSetSearchParams({
            type: SearchType.Opening,
            eco: editEco,
            startDate: editStartDate?.toUTC().toISO() || '',
            endDate: editEndDate?.toUTC().toISO() || '',
        });
    };

    const onSearchByOwner = () => {
        onSetSearchParams({
            type: SearchType.Owner,
            startDate: editStartDate?.toUTC().toISO() || '',
            endDate: editEndDate?.toUTC().toISO() || '',
        });
    };

    const onSearchByPosition = () => {
        onSetSearchParams({
            type: SearchType.Position,
            fen: editFen,
        });
    };

    return (
        <Stack spacing={0}>
            <Accordion
                id='search-by-cohort'
                expanded={expanded === SearchType.Cohort}
                onChange={onChangePanel(SearchType.Cohort)}
            >
                <AccordionSummary>
                    <Icon name='cohort' color='primary' sx={{ marginRight: '0.6rem' }} />
                    <Typography> Search By Cohort </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchByCohort
                        cohort={editCohort}
                        setCohort={setCohort}
                        startDate={editStartDate}
                        setStartDate={setStartDate}
                        endDate={editEndDate}
                        setEndDate={setEndDate}
                        isLoading={isLoading}
                        onSearch={onSearchByCohort}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion
                id='search-by-player'
                expanded={expanded === SearchType.Player}
                onChange={onChangePanel(SearchType.Player)}
            >
                <AccordionSummary>
                    <Icon name='player' color='primary' sx={{ marginRight: '0.6rem' }} />
                    <Typography>Search By Player</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchByPlayer
                        player={editPlayer}
                        setPlayer={setPlayer}
                        color={editColor}
                        setColor={setColor}
                        startDate={editStartDate}
                        setStartDate={setStartDate}
                        endDate={editEndDate}
                        setEndDate={setEndDate}
                        isLoading={isLoading}
                        onSearch={onSearchByPlayer}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion
                id='search-by-position'
                expanded={expanded === SearchType.Position}
                onChange={onChangePanel(SearchType.Position)}
            >
                <AccordionSummary>
                    <Icon
                        name={RequirementCategory.Endgame}
                        color='primary'
                        sx={{ marginRight: '0.6rem' }}
                    />
                    <Typography>Search By Position</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchByPosition
                        fen={editFen}
                        setFen={setEditFen}
                        startDate={editStartDate}
                        setStartDate={setStartDate}
                        endDate={editEndDate}
                        setEndDate={setEndDate}
                        isLoading={isLoading}
                        onSearch={onSearchByPosition}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion
                id='search-by-opening'
                expanded={expanded === SearchType.Opening}
                onChange={onChangePanel(SearchType.Opening)}
            >
                <AccordionSummary>
                    <Icon
                        name={RequirementCategory.Opening}
                        color='primary'
                        sx={{ marginRight: '0.6rem' }}
                    />
                    <Typography>Search By Opening </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchByOpening
                        eco={editEco}
                        setEco={setEditEco}
                        startDate={editStartDate}
                        setStartDate={setStartDate}
                        endDate={editEndDate}
                        setEndDate={setEndDate}
                        isLoading={isLoading}
                        onSearch={onSearchByOpening}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion
                expanded={expanded === SearchType.Owner}
                onChange={onChangePanel(SearchType.Owner)}
            >
                <AccordionSummary>
                    <Icon name='upload' color='primary' sx={{ marginRight: '0.6rem' }} />
                    <Typography>Search My Uploads</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchByOwner
                        startDate={editStartDate}
                        setStartDate={setStartDate}
                        endDate={editEndDate}
                        setEndDate={setEndDate}
                        isLoading={isLoading}
                        onSearch={onSearchByOwner}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion
                expanded={expanded === SearchType.Files}
                onChange={onChangePanel(SearchType.Files)}
            >
                <AccordionSummary>
                    <Folder color='primary' sx={{ mr: '0.6rem' }} />
                    <Typography>My Files</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchFiles />
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
};

export default SearchFilters;
