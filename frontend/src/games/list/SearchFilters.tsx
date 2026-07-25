import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { searchGames } from '@/api/gameApi';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { MastersCohort } from '@/database/game';
import { RequirementCategory } from '@/database/requirement';
import { dojoCohorts } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { SearchFunc } from '@/hooks/usePagination';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon from '@/style/Icon';
import { Search } from '@mui/icons-material';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import {
    AccordionProps,
    AccordionSummaryProps,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    InputLabel,
    MenuItem,
    Accordion as MuiAccordion,
    AccordionDetails as MuiAccordionDetails,
    AccordionSummary as MuiAccordionSummary,
    Radio,
    RadioGroup,
    Select,
    SelectChangeEvent,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
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

type SearchGamesProps = BaseFilterProps & {
    white: string;
    black: string;
    ignoreColors: boolean;
    minElo: string;
    maxElo: string;
    eloMode: string;
    results: string[];
    cohort: string;
    opening: string;
    minMoves: string;
    maxMoves: string;
    timeClass: string;
    setWhite: React.Dispatch<React.SetStateAction<string>>;
    setBlack: React.Dispatch<React.SetStateAction<string>>;
    setIgnoreColors: React.Dispatch<React.SetStateAction<boolean>>;
    setMinElo: React.Dispatch<React.SetStateAction<string>>;
    setMaxElo: React.Dispatch<React.SetStateAction<string>>;
    setEloMode: React.Dispatch<React.SetStateAction<string>>;
    setResults: React.Dispatch<React.SetStateAction<string[]>>;
    setCohort: React.Dispatch<React.SetStateAction<string>>;
    setOpening: React.Dispatch<React.SetStateAction<string>>;
    setMinMoves: React.Dispatch<React.SetStateAction<string>>;
    setMaxMoves: React.Dispatch<React.SetStateAction<string>>;
    setTimeClass: React.Dispatch<React.SetStateAction<string>>;
};

/** Absolute PGN results available in the search filter. */
const GAME_RESULTS = ['1-0', '0-1', '1/2-1/2'] as const;

/** Parses the results URL param into a validated list; defaults to all results. */
function parseResultsParam(value: string | null): string[] {
    if (value === null) {
        return [...GAME_RESULTS];
    }
    const selected = value
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is (typeof GAME_RESULTS)[number] =>
            (GAME_RESULTS as readonly string[]).includes(s),
        );
    if (selected.length === 0) {
        return [...GAME_RESULTS];
    }
    return selected;
}

const SearchGames = ({
    white,
    black,
    ignoreColors,
    minElo,
    maxElo,
    eloMode,
    results,
    cohort,
    opening,
    minMoves,
    maxMoves,
    timeClass,
    startDate,
    endDate,
    isLoading,
    setWhite,
    setBlack,
    setIgnoreColors,
    setMinElo,
    setMaxElo,
    setEloMode,
    setResults,
    setCohort,
    setOpening,
    setMinMoves,
    setMaxMoves,
    setTimeClass,
    setStartDate,
    setEndDate,
    onSearch,
}: SearchGamesProps) => {
    const t = useTranslations('games.list.searchFilters');

    const onResultsChange = (e: SelectChangeEvent<string[]>) => {
        const value = e.target.value;
        setResults(typeof value === 'string' ? value.split(',') : value);
    };

    const onClearFilters = () => {
        setCohort('');
        setWhite('');
        setBlack('');
        setIgnoreColors(false);
        setMinElo('');
        setMaxElo('');
        setEloMode('one');
        setResults([...GAME_RESULTS]);
        setOpening('');
        setMinMoves('');
        setMaxMoves('');
        setTimeClass('');
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <Stack data-testid='search-games' spacing={2}>
            <FormControl>
                <InputLabel>{t('cohortLabel')}</InputLabel>
                <Select
                    data-testid='cohort-select'
                    value={cohort}
                    label={t('cohortLabel')}
                    onChange={(e) => setCohort(e.target.value)}
                >
                    <MenuItem value=''>{t('anyCohort')}</MenuItem>
                    {dojoCohorts.concat(MastersCohort).map((c) => (
                        <MenuItem key={c} value={c}>
                            <CohortIcon
                                cohort={c}
                                size={23}
                                sx={{ marginRight: '0.6rem', verticalAlign: 'middle' }}
                                tooltip=''
                                color='primary'
                            />
                            {c === MastersCohort ? t('mastersDb') : c}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TextField
                data-testid='player-white'
                label={ignoreColors ? t('player1') : t('white')}
                value={white}
                onChange={(e) => setWhite(e.target.value)}
            />
            <TextField
                data-testid='player-black'
                label={ignoreColors ? t('player2') : t('black')}
                value={black}
                onChange={(e) => setBlack(e.target.value)}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        data-testid='ignore-colors'
                        checked={ignoreColors}
                        onChange={(e) => setIgnoreColors(e.target.checked)}
                    />
                }
                label={t('ignoreColors')}
            />

            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <TextField
                        data-testid='player-min-elo'
                        label={t('minElo')}
                        type='number'
                        fullWidth
                        value={minElo}
                        onChange={(e) => setMinElo(e.target.value)}
                    />
                </Grid>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <TextField
                        data-testid='player-max-elo'
                        label={t('maxElo')}
                        type='number'
                        fullWidth
                        value={maxElo}
                        onChange={(e) => setMaxElo(e.target.value)}
                    />
                </Grid>
            </Grid>

            <FormControl>
                <FormLabel>{t('eloModeLabel')}</FormLabel>
                <RadioGroup
                    row
                    data-testid='elo-mode'
                    value={eloMode}
                    onChange={(e) => setEloMode(e.target.value)}
                >
                    <FormControlLabel value='one' control={<Radio />} label={t('eloModeOne')} />
                    <FormControlLabel value='both' control={<Radio />} label={t('eloModeBoth')} />
                    <FormControlLabel
                        value='average'
                        control={<Radio />}
                        label={t('eloModeAverage')}
                    />
                </RadioGroup>
            </FormControl>

            <FormControl>
                <InputLabel>{t('resultLabel')}</InputLabel>
                <Select
                    data-testid='player-result'
                    multiple
                    value={results}
                    label={t('resultLabel')}
                    onChange={onResultsChange}
                    renderValue={(selected) => selected.join(', ')}
                >
                    {GAME_RESULTS.map((r) => (
                        <MenuItem key={r} value={r}>
                            <Checkbox checked={results.includes(r)} />
                            {r}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TextField
                data-testid='player-opening'
                label={t('openingLabel')}
                helperText={t('openingHelp')}
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
            />

            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <TextField
                        data-testid='player-min-moves'
                        label={t('minMoves')}
                        type='number'
                        fullWidth
                        value={minMoves}
                        onChange={(e) => setMinMoves(e.target.value)}
                    />
                </Grid>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <TextField
                        data-testid='player-max-moves'
                        label={t('maxMoves')}
                        type='number'
                        fullWidth
                        value={maxMoves}
                        onChange={(e) => setMaxMoves(e.target.value)}
                    />
                </Grid>
            </Grid>

            <FormControl>
                <InputLabel>{t('timeClassLabel')}</InputLabel>
                <Select
                    data-testid='player-time-class'
                    value={timeClass}
                    label={t('timeClassLabel')}
                    onChange={(e) => setTimeClass(e.target.value)}
                >
                    <MenuItem value=''>{t('anyTimeClass')}</MenuItem>
                    <MenuItem value='bullet'>{t('bullet')}</MenuItem>
                    <MenuItem value='blitz'>{t('blitz')}</MenuItem>
                    <MenuItem value='rapid'>{t('rapid')}</MenuItem>
                    <MenuItem value='classical'>{t('classical')}</MenuItem>
                    <MenuItem value='daily'>{t('daily')}</MenuItem>
                </Select>
            </FormControl>

            <Grid container rowGap={1} columnGap={{ md: 0, lg: 1 }}>
                <Grid size={{ xs: 12, lg: 'grow' }}>
                    <DatePicker
                        label={t('startDate')}
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
                        label={t('endDate')}
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

            <Button
                data-testid='search-games-button'
                variant='outlined'
                loading={isLoading}
                onClick={onSearch}
                startIcon={<Icon name='search' color='primary' />}
            >
                {t('search')}
            </Button>
            <Button
                data-testid='clear-filters-button'
                variant='outlined'
                color='error'
                disabled={isLoading}
                onClick={onClearFilters}
            >
                {t('clearFilters')}
            </Button>
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
    const t = useTranslations('games.list.searchFilters');
    const isFreeTier = useFreeTier();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSearch = () => {
        const errors: Record<string, string> = {};
        if (fen === '') {
            errors.fen = t('fieldRequired');
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
                    label={t('fen')}
                    onChange={(e) => setFen(e.target.value)}
                    error={!!errors.fen}
                    helperText={errors.fen}
                />
            </FormControl>

            <Button
                data-testid='fen-search-button'
                variant='outlined'
                loading={isLoading}
                onClick={handleSearch}
                disabled={isFreeTier}
                startIcon={<Icon name='search' color='primary' />}
            >
                {t('search')}
            </Button>

            {isFreeTier ? (
                <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mt: '0 !important', alignSelf: 'center' }}
                >
                    {t('freeTierPosition')}
                </Typography>
            ) : (
                <Button
                    href={`/games/analysis?fen=${fen}`}
                    component={Link}
                    disabled={isLoading}
                    variant='outlined'
                    startIcon={<Icon name='explore' color='primary' />}
                >
                    {t('positionExplorer')}
                </Button>
            )}
        </Stack>
    );
};

enum SearchType {
    Games = 'games',
    Position = 'position',
}

function isValid(d: Date | null): boolean {
    return d instanceof Date && !isNaN(d.getTime());
}

interface SearchFiltersProps {
    isLoading: boolean;
    onSearch: (searchFunc: SearchFunc) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ isLoading, onSearch }) => {
    const t = useTranslations('games.list.searchFilters');
    const { user } = useAuth();
    const api = useApi();

    const { searchParams, setSearchParams } = useNextSearchParams({
        cohort: user?.dojoCohort || '',
        white: '',
        black: '',
        ignoreColors: 'false',
        minElo: '',
        maxElo: '',
        eloMode: 'one',
        results: GAME_RESULTS.join(','),
        eco: '',
        fen: '',
        type: SearchType.Games,
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
    const [editWhite, setWhite] = useState(searchParams.get('white') || '');
    const [editBlack, setBlack] = useState(searchParams.get('black') || '');
    const [editIgnoreColors, setIgnoreColors] = useState(
        searchParams.get('ignoreColors') === 'true',
    );
    const [editMinElo, setMinElo] = useState(searchParams.get('minElo') || '');
    const [editMaxElo, setMaxElo] = useState(searchParams.get('maxElo') || '');
    const [editEloMode, setEloMode] = useState(searchParams.get('eloMode') || 'one');
    const [editResults, setResults] = useState(() =>
        parseResultsParam(searchParams.get('results')),
    );
    const [editOpening, setOpening] = useState(searchParams.get('opening') || '');
    const [editMinMoves, setMinMoves] = useState(searchParams.get('minMoves') || '');
    const [editMaxMoves, setMaxMoves] = useState(searchParams.get('maxMoves') || '');
    const [editTimeClass, setTimeClass] = useState(searchParams.get('timeClass') || '');
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
    const type = searchParams.get('type') || SearchType.Games;
    const cohort = searchParams.get('cohort') || user?.dojoCohort || '';
    const white = searchParams.get('white') || '';
    const black = searchParams.get('black') || '';
    const ignoreColors = searchParams.get('ignoreColors') === 'true';
    const minElo = searchParams.get('minElo') || '';
    const maxElo = searchParams.get('maxElo') || '';
    const eloMode = (searchParams.get('eloMode') || 'one') as 'one' | 'both' | 'average';
    const resultsParam = searchParams.get('results');
    const opening = searchParams.get('opening') || '';
    const minMoves = searchParams.get('minMoves') || '';
    const maxMoves = searchParams.get('maxMoves') || '';
    const timeClass = searchParams.get('timeClass') || '';
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

    const searchByPlayer = useCallback(
        (startKey: string) =>
            searchGames(
                {
                    white: white || undefined,
                    black: black || undefined,
                    ignoreColors,
                    minElo: minElo || undefined,
                    maxElo: maxElo || undefined,
                    eloMode,
                    results: parseResultsParam(resultsParam).join(','),
                    cohort: cohort || undefined,
                    opening: opening || undefined,
                    minMoves: minMoves || undefined,
                    maxMoves: maxMoves || undefined,
                    timeClass: timeClass || undefined,
                    startDate: startDateStr?.replaceAll('.', '-'),
                    endDate: endDateStr?.replaceAll('.', '-'),
                },
                startKey,
            ),
        [
            startDateStr,
            endDateStr,
            white,
            black,
            ignoreColors,
            minElo,
            maxElo,
            eloMode,
            resultsParam,
            cohort,
            opening,
            minMoves,
            maxMoves,
            timeClass,
        ],
    );

    const searchByPosition = useCallback(
        (startKey: string) => api.listGamesByPosition(fen, mastersOnly, startKey),
        [api, fen, mastersOnly],
    );

    // Search is called every time the above functions change, which should
    // happen only when the searchParams change
    useEffect(() => {
        switch (type) {
            case SearchType.Games:
                onSearch(searchByPlayer);
                break;

            case SearchType.Position:
                onSearch(searchByPosition);
                break;
        }
    }, [type, onSearch, searchByPlayer, searchByPosition]);

    // Functions that change the search params
    const onSetSearchParams = (params: Record<string, string>) => {
        trackEvent(EventType.SearchGames, params);
        setSearchParams(params);
    };

    const onSearchByPlayer = () => {
        onSetSearchParams({
            type: SearchType.Games,
            cohort: editCohort,
            white: editWhite,
            black: editBlack,
            ignoreColors: String(editIgnoreColors),
            minElo: editMinElo,
            maxElo: editMaxElo,
            eloMode: editEloMode,
            results: editResults.join(','),
            opening: editOpening,
            minMoves: editMinMoves,
            maxMoves: editMaxMoves,
            timeClass: editTimeClass,
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
                id='search-games'
                expanded={expanded === SearchType.Games}
                onChange={onChangePanel(SearchType.Games)}
            >
                <AccordionSummary>
                    <Search color='primary' sx={{ marginRight: '0.6rem' }} />
                    <Typography>{t('searchGames')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SearchGames
                        white={editWhite}
                        setWhite={setWhite}
                        black={editBlack}
                        setBlack={setBlack}
                        ignoreColors={editIgnoreColors}
                        setIgnoreColors={setIgnoreColors}
                        minElo={editMinElo}
                        setMinElo={setMinElo}
                        maxElo={editMaxElo}
                        setMaxElo={setMaxElo}
                        eloMode={editEloMode}
                        setEloMode={setEloMode}
                        results={editResults}
                        setResults={setResults}
                        cohort={editCohort}
                        setCohort={setCohort}
                        opening={editOpening}
                        setOpening={setOpening}
                        minMoves={editMinMoves}
                        setMinMoves={setMinMoves}
                        maxMoves={editMaxMoves}
                        setMaxMoves={setMaxMoves}
                        timeClass={editTimeClass}
                        setTimeClass={setTimeClass}
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
                    <Typography>{t('searchByPosition')}</Typography>
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
        </Stack>
    );
};

export default SearchFilters;
