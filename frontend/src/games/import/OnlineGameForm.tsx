import {
    OnlineGame,
    OnlineGameResultReason,
    OnlineGameTimeClass,
    OnlineGameTimeControl,
    useOnlineGames,
} from '@/api/external/onlineGame';
import {
    isChesscomAnalysisURL,
    isChesscomEventsUrl,
    isChesscomGameURL,
    isLichessChapterURL,
    isLichessGameURL,
    isLichessStudyURL,
} from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import {
    getChesscomAnalysis,
    getChesscomEvent,
    getChesscomGame,
    getLichessChapter,
    getLichessGame,
    PgnImportResult,
} from '@/app/(scoreboard)/games/analysis/server';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { RenderPlayers } from '@/components/games/list/GameListItem';
import { Link } from '@/components/navigation/Link';
import { getTimeControl } from '@/components/tournaments/round-robin/TimeControlChip';
import { GameResult } from '@/database/game';
import { isCohortInRange, RatingSystem } from '@/database/user';
import { logger } from '@/logging/logger';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    GameImportTypes,
    OnlineGameImportType,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import {
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Collapse,
    DialogContent,
    DialogTitle,
    Grid,
    InputAdornment,
    MenuItem,
    Pagination,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import { ImportButton } from './ImportButton';
import { ImportDialogProps } from './ImportWizard';
import { OrDivider } from './OrDivider';

function timeControlMatches(
    cohort: string | undefined,
    timeControl: OnlineGameTimeControl,
): boolean {
    if (!cohort) {
        return false;
    }

    const initialMinutes = timeControl.initialSeconds / 60;
    if (initialMinutes < 30) {
        return false;
    }
    const totalTime = initialMinutes + timeControl.incrementSeconds;

    if (isCohortInRange(cohort, '0-800')) {
        return totalTime >= 30;
    }
    if (isCohortInRange(cohort, '800-1200')) {
        return totalTime >= 60;
    }
    if (isCohortInRange(cohort, '1200-1600')) {
        return totalTime >= 75;
    }
    if (isCohortInRange(cohort, '1600-2000')) {
        return totalTime >= 90;
    }
    return totalTime >= 120;
}

const TIME_CLASS_RANK: Record<string, number> = {
    [OnlineGameTimeClass.Bullet]: 1,
    [OnlineGameTimeClass.Blitz]: 2,
    [OnlineGameTimeClass.Rapid]: 3,
    [OnlineGameTimeClass.Classical]: 4,
    [OnlineGameTimeClass.Daily]: 5,
};

const RESULT_RANK: Record<string, number> = {
    [GameResult.White]: 3,
    [GameResult.Draw]: 2,
    [GameResult.Black]: 1,
    [GameResult.Incomplete]: 0,
};

const DRAWS_FIRST_RANK: Record<string, number> = {
    [GameResult.Draw]: 3,
    [GameResult.White]: 2,
    [GameResult.Black]: 1,
    [GameResult.Incomplete]: 0,
};

const SORT_OPTIONS = [
    { value: 'date-desc', label: 'Newest first' },
    { value: 'date-asc', label: 'Oldest first' },
    { value: 'timeControl-asc', label: 'Time control (shortest)' },
    { value: 'timeControl-desc', label: 'Time control (longest)' },
    { value: 'timeClass-asc', label: 'Time class (bullet → classical)' },
    { value: 'timeClass-desc', label: 'Time class (classical → bullet)' },
    { value: 'result-desc', label: 'White wins first' },
    { value: 'result-asc', label: 'Black wins first' },
    { value: 'draws-desc', label: 'Draws first' },
] as const;

interface FilterState {
    source: string;
    timeClass: string;
    timeControl: string;
    result: string;
    rated: string;
    cohortMatch: string;
}

const EMPTY_FILTERS: FilterState = {
    source: '',
    timeClass: '',
    timeControl: '',
    result: '',
    rated: '',
    cohortMatch: '',
};

const PAGE_SIZE = 10;

function formatTimeControl(game: OnlineGame): string {
    if (game.timeClass === OnlineGameTimeClass.Daily) return 'daily';
    return `${game.timeControl.initialSeconds / 60} | ${game.timeControl.incrementSeconds}`;
}

function parseTimeControlTotal(s: string): number {
    if (s === 'daily') return Infinity;
    const [min, inc] = s.split(' | ').map(Number);
    return min * 60 + inc;
}

function applyFilters(
    games: OnlineGame[],
    filters: FilterState,
    cohort: string | undefined,
): OnlineGame[] {
    return games.filter((game) => {
        if (filters.source && game.source !== filters.source) return false;
        if (filters.timeClass && game.timeClass !== filters.timeClass) return false;
        if (filters.timeControl && formatTimeControl(game) !== filters.timeControl) return false;
        if (filters.result && game.result !== filters.result) return false;
        if (filters.rated) {
            const isRated = filters.rated === 'true';
            if (game.rated !== isRated) return false;
        }
        if (filters.cohortMatch) {
            const matches = timeControlMatches(cohort, game.timeControl);
            if (filters.cohortMatch === 'true' && !matches) return false;
            if (filters.cohortMatch === 'false' && matches) return false;
        }
        return true;
    });
}

function applySorting(games: OnlineGame[], sortValue: string): OnlineGame[] {
    const sorted = [...games];
    const [field, direction] = sortValue.split('-');
    const mult = direction === 'desc' ? -1 : 1;

    sorted.sort((a, b) => {
        switch (field) {
            case 'date':
                return mult * (new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
            case 'timeControl':
                return (
                    mult *
                    (parseTimeControlTotal(formatTimeControl(a)) -
                        parseTimeControlTotal(formatTimeControl(b)))
                );
            case 'timeClass':
                return (
                    mult *
                    ((TIME_CLASS_RANK[a.timeClass] ?? 0) - (TIME_CLASS_RANK[b.timeClass] ?? 0))
                );
            case 'result':
                return mult * ((RESULT_RANK[a.result] ?? 0) - (RESULT_RANK[b.result] ?? 0));
            case 'draws':
                return (
                    mult * ((DRAWS_FIRST_RANK[a.result] ?? 0) - (DRAWS_FIRST_RANK[b.result] ?? 0))
                );
            default:
                return 0;
        }
    });

    return sorted;
}

function InlineFilters({
    filters,
    onFilterChange,
    timeControlOptions,
    open,
}: {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    timeControlOptions: string[];
    open: boolean;
}) {
    const hasActiveFilters = Object.values(filters).some((v) => v !== '');

    const updateFilter = (field: keyof FilterState, value: string) => {
        onFilterChange({ ...filters, [field]: value });
    };

    return (
        <Collapse in={open}>
            <Paper elevation={2} sx={{ p: 1.5, my: 1 }}>
                <Grid container spacing={1}>
                    <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                            select
                            fullWidth
                            size='small'
                            label='Source'
                            value={filters.source}
                            onChange={(e) => updateFilter('source', e.target.value)}
                        >
                            <MenuItem value=''>All</MenuItem>
                            <MenuItem value={GameImportTypes.lichessGame}>Lichess</MenuItem>
                            <MenuItem value={GameImportTypes.chesscomGame}>Chess.com</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                            select
                            fullWidth
                            size='small'
                            label='Time Class'
                            value={filters.timeClass}
                            onChange={(e) => updateFilter('timeClass', e.target.value)}
                        >
                            <MenuItem value=''>All</MenuItem>
                            {Object.values(OnlineGameTimeClass).map((tc) => (
                                <MenuItem key={tc} value={tc}>
                                    {tc}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                            select
                            fullWidth
                            size='small'
                            label='Time Control'
                            value={filters.timeControl}
                            onChange={(e) => updateFilter('timeControl', e.target.value)}
                        >
                            <MenuItem value=''>All</MenuItem>
                            {timeControlOptions.map((tc) => (
                                <MenuItem key={tc} value={tc}>
                                    {tc}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                            select
                            fullWidth
                            size='small'
                            label='Result'
                            value={filters.result}
                            onChange={(e) => updateFilter('result', e.target.value)}
                        >
                            <MenuItem value=''>All</MenuItem>
                            {Object.values(GameResult).map((r) => (
                                <MenuItem key={r} value={r}>
                                    {r}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                            select
                            fullWidth
                            size='small'
                            label='Rated'
                            value={filters.rated}
                            onChange={(e) => updateFilter('rated', e.target.value)}
                        >
                            <MenuItem value=''>All</MenuItem>
                            <MenuItem value='true'>Rated</MenuItem>
                            <MenuItem value='false'>Casual</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                            select
                            fullWidth
                            size='small'
                            label='Meets Cohort Time'
                            value={filters.cohortMatch}
                            onChange={(e) => updateFilter('cohortMatch', e.target.value)}
                        >
                            <MenuItem value=''>All</MenuItem>
                            <MenuItem value='true'>Yes</MenuItem>
                            <MenuItem value='false'>No</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid size={12}>
                        <Button
                            size='small'
                            onClick={() => onFilterChange(EMPTY_FILTERS)}
                            disabled={!hasActiveFilters}
                        >
                            Clear filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Collapse>
    );
}

function GameCard({ game, onClick }: { game: OnlineGame; onClick: (game: OnlineGame) => void }) {
    const { user } = useAuth();
    const createdAt = new Date(game.endTime);
    const dateStr = toDojoDateString(createdAt, user?.timezoneOverride);
    const timeStr = toDojoTimeString(createdAt, user?.timezoneOverride, user?.timeFormat);

    const tcLabel =
        game.timeClass === OnlineGameTimeClass.Daily
            ? 'daily'
            : `${game.timeControl.initialSeconds / 60} | ${game.timeControl.incrementSeconds}`;

    const matchesCohort = timeControlMatches(user?.dojoCohort, game.timeControl);

    return (
        <ButtonBase
            onClick={() => onClick(game)}
            sx={{
                display: 'block',
                width: 1,
                textAlign: 'left',
                borderBottom: 1,
                borderColor: 'divider',
                px: 1,
                py: 1.5,
                '&:hover': { backgroundColor: 'action.hover' },
            }}
        >
            <Stack spacing={1.125}>
                <Stack
                    direction='row'
                    spacing={1}
                    alignItems='center'
                    flexWrap='wrap'
                    justifyContent='space-between'
                >
                    <Stack direction='row' alignItems='center' spacing={1}>
                        {game.source === GameImportTypes.lichessGame ? (
                            <SiLichess />
                        ) : (
                            <SiChessdotcom color='#81b64c' />
                        )}
                        <Typography variant='body2'>
                            {dateStr} {timeStr}
                        </Typography>
                    </Stack>

                    <Stack direction='row' alignItems='center' spacing={1}>
                        <Typography variant='caption' color='text.secondary'>
                            {game.rated ? 'Rated' : 'Casual'}
                        </Typography>
                        {matchesCohort ? (
                            <Chip
                                label={tcLabel}
                                size='small'
                                color='success'
                                icon={<CheckCircleIcon />}
                            />
                        ) : (
                            <Typography variant='body2'>{tcLabel}</Typography>
                        )}
                    </Stack>
                </Stack>
                <Stack>
                    <RenderPlayers
                        white={game.white.username}
                        whiteElo={game.white.rating}
                        whiteProvisional={game.white.provisional}
                        black={game.black.username}
                        blackElo={game.black.rating}
                        blackProvisional={game.black.provisional}
                    />
                </Stack>
                <Typography variant='body2'>
                    {game.result}{' '}
                    {game.resultReason !== OnlineGameResultReason.Unknown &&
                        `by ${game.resultReason}`}
                </Typography>
            </Stack>
        </ButtonBase>
    );
}

export const OnlineGameForm = ({ loading, onSubmit, onClose }: ImportDialogProps) => {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const request = useRequest();

    const lichessUsername = user?.ratings?.[RatingSystem.Lichess]?.username;
    const chesscomUsername = user?.ratings?.[RatingSystem.Chesscom]?.username;
    const fetchGames = Boolean(lichessUsername || chesscomUsername);

    const {
        games,
        requests: { lichess, chesscom },
    } = useOnlineGames({ lichess: lichessUsername, chesscom: chesscomUsername });

    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sortValue, setSortValue] = useState('date-desc');
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const hasActiveFilters = Object.values(filters).some((v) => v !== '');

    const timeControlOptions = useMemo(() => {
        const unique = new Set(games.map(formatTimeControl));
        return [...unique].sort((a, b) => parseTimeControlTotal(a) - parseTimeControlTotal(b));
    }, [games]);

    const processedGames = useMemo(() => {
        let result = applyFilters(games, filters, user?.dojoCohort);
        if (searchText.trim()) {
            const query = searchText.trim().toLowerCase();
            result = result.filter(
                (g) =>
                    g.white.username.toLowerCase().includes(query) ||
                    g.black.username.toLowerCase().includes(query),
            );
        }
        return applySorting(result, sortValue);
    }, [games, filters, searchText, sortValue, user?.dojoCohort]);

    const pageCount = Math.ceil(processedGames.length / PAGE_SIZE);
    const pagedGames = processedGames.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
        setPage(1);
    };

    const handleSearchChange = (value: string) => {
        setSearchText(value);
        setPage(1);
    };

    const handleSortChange = (value: string) => {
        setSortValue(value);
        setPage(1);
    };

    const isFetchingGames = chesscom.isLoading() || lichess.isLoading();
    const isImporting = loading || request.isLoading();

    const handleSubmit = () => {
        if (url.trim() === '') {
            let err = 'URL is required';
            if (games.length > 0) {
                err += ' or select a game below';
            }

            setError(err);
            return;
        }

        const importMethods: [
            OnlineGameImportType,
            (url: string) => boolean,
            ((url: string) => Promise<PgnImportResult<string>>) | null,
        ][] = [
            [GameImportTypes.lichessChapter, isLichessChapterURL, getLichessChapter],
            [
                GameImportTypes.lichessStudy,
                isLichessStudyURL,
                null, // TODO, handle this case
            ],
            [GameImportTypes.lichessGame, isLichessGameURL, getLichessGame],
            [GameImportTypes.chesscomGame, isChesscomGameURL, getChesscomGame],
            [GameImportTypes.chesscomAnalysis, isChesscomAnalysisURL, getChesscomAnalysis],
            [GameImportTypes.chesscomGame, isChesscomEventsUrl, getChesscomEvent],
        ];

        for (const [submissionType, match, importPgn] of importMethods) {
            if (!match(url)) {
                continue;
            }

            if (importPgn === null) {
                onSubmit({ url, type: submissionType });
            } else {
                importPgn(url)
                    .then(({ data: pgnText, error }) => {
                        if (error) {
                            logger.error?.(error.privateMessage);
                            request.onFailure(error.publicMessage);
                            return;
                        }
                        onSubmit({ pgnText: pgnText ?? '', type: 'manual' });
                    })
                    .catch(() => request.onFailure('Unexpected server error'));
            }

            return;
        }

        setError('The provided URL is unsupported. Please make sure it is correct.');
    };

    const onClickGame = (game: OnlineGame) => {
        onSubmit({ pgnText: game.pgn, type: game.source, url: game.url });
    };

    return (
        <>
            <DialogTitle>Import Online Game</DialogTitle>
            <DialogContent>
                <Stack>
                    <TextField
                        data-testid='online-game-url'
                        label='Lichess or Chess.com URL'
                        placeholder='https://lichess.org/study/abcd1234/abcd1234'
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                        }}
                        error={!!error}
                        helperText={error}
                        fullWidth
                        sx={{ mt: 0.8 }}
                    />
                    <Stack
                        alignSelf='flex-end'
                        direction='row'
                        spacing={1}
                        paddingRight={1}
                        paddingTop={1}
                    >
                        <Button disabled={isImporting} onClick={onClose}>
                            Cancel
                        </Button>
                        <ImportButton loading={isImporting} onClick={handleSubmit} />
                    </Stack>
                    <OrDivider header='Recent Games' />

                    {fetchGames && user?.dojoCohort && (
                        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
                            <CohortIcon
                                cohort={user.dojoCohort}
                                tooltip={user.dojoCohort}
                                size={28}
                            />
                            <Typography variant='caption' color='text.secondary'>
                                Your cohort ({user.dojoCohort}) minimum time control is{' '}
                                <strong>{getTimeControl(user.dojoCohort)}</strong>. Games that meet
                                this requirement are marked with a{' '}
                                <CheckCircleIcon
                                    color='success'
                                    sx={{ fontSize: 14, verticalAlign: 'middle' }}
                                />{' '}
                                but you can still import any game. Your last 50 Lichess games and
                                Chess.com games from the last two months are shown below.
                            </Typography>
                        </Stack>
                    )}

                    {fetchGames && (
                        <>
                            <Stack direction='row' spacing={1} alignItems='center' sx={{ my: 1 }}>
                                <Button
                                    size='small'
                                    startIcon={<FilterListIcon />}
                                    onClick={() => setFiltersOpen((prev) => !prev)}
                                    variant={hasActiveFilters || filtersOpen ? 'contained' : 'text'}
                                    color='primary'
                                >
                                    {filtersOpen
                                        ? 'Hide Filters'
                                        : hasActiveFilters
                                          ? 'Filters (active)'
                                          : 'Filters'}
                                </Button>
                                <TextField
                                    select
                                    size='small'
                                    label='Sort'
                                    value={sortValue}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    sx={{ minWidth: 160 }}
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <TextField
                                size='small'
                                placeholder='Search by player name'
                                value={searchText}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                fullWidth
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position='start'>
                                                <SearchIcon fontSize='small' />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />

                            <InlineFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                timeControlOptions={timeControlOptions}
                                open={filtersOpen}
                            />
                        </>
                    )}

                    {fetchGames ? (
                        isFetchingGames ? (
                            <Stack
                                sx={{ pt: 6, pb: 4 }}
                                justifyContent='center'
                                alignItems='center'
                            >
                                <CircularProgress />
                            </Stack>
                        ) : processedGames.length === 0 ? (
                            <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                                {hasActiveFilters || searchText.trim()
                                    ? 'No games match the current filters.'
                                    : 'No recent games found.'}
                            </Typography>
                        ) : (
                            <Stack>
                                {pagedGames.map((game) => (
                                    <GameCard key={game.id} game={game} onClick={onClickGame} />
                                ))}
                                {pageCount > 1 && (
                                    <Stack alignItems='center' sx={{ pt: 2 }}>
                                        <Pagination
                                            count={pageCount}
                                            page={page}
                                            onChange={(_, p) => setPage(p)}
                                            size='small'
                                        />
                                    </Stack>
                                )}
                            </Stack>
                        )
                    ) : (
                        <Typography variant='body2'>
                            To list recent games, add your Chess.com or Lichess username to your{' '}
                            <Link href='/profile/edit#ratings'>profile</Link>.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <RequestSnackbar request={request} />
        </>
    );
};
