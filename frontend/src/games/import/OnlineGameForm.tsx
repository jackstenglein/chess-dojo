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
} from '@/app/[locale]/(scoreboard)/games/analysis/server';
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
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
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

interface FilterState {
    source: string;
    timeClass: string;
    timeControl: string;
    result: string;
    resultReason: string;
    rated: string;
    cohortMatch: string;
}

const EMPTY_FILTERS: FilterState = {
    source: '',
    timeClass: '',
    timeControl: '',
    result: '',
    resultReason: '',
    rated: '',
    cohortMatch: '',
};

const PAGE_SIZE = 10;

function formatTimeControl(game: OnlineGame): string {
    if (game.timeClass === OnlineGameTimeClass.Daily) return 'daily';
    return `${game.timeControl.initialSeconds / 60}+${game.timeControl.incrementSeconds}`;
}

function parseTimeControlTotal(s: string): number {
    if (s === 'daily') return Infinity;
    const [min, inc] = s.split('+').map(Number);
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
        if (filters.resultReason && game.resultReason !== filters.resultReason) return false;
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
    const t = useTranslations('games.import.onlineForm');
    const hasActiveFilters = Object.values(filters).some((v) => v !== '');

    const timeClassLabels = useMemo<Record<string, string>>(
        () => ({
            [OnlineGameTimeClass.Bullet]: t('timeClassBullet'),
            [OnlineGameTimeClass.Blitz]: t('timeClassBlitz'),
            [OnlineGameTimeClass.Rapid]: t('timeClassRapid'),
            [OnlineGameTimeClass.Classical]: t('timeClassClassical'),
            [OnlineGameTimeClass.Daily]: t('timeClassDaily'),
        }),
        [t],
    );

    const resultReasonLabels = useMemo<Record<string, string>>(
        () => ({
            [OnlineGameResultReason.Resignation]: t('resultReasonResignation'),
            [OnlineGameResultReason.Checkmate]: t('resultReasonCheckmate'),
            [OnlineGameResultReason.Timeout]: t('resultReasonTimeout'),
            [OnlineGameResultReason.Agreement]: t('resultReasonAgreement'),
            [OnlineGameResultReason.Abandonment]: t('resultReasonAbandonment'),
            [OnlineGameResultReason.InsufficientMaterial]: t('resultReasonInsufficientMaterial'),
            [OnlineGameResultReason.Stalemate]: t('resultReasonStalemate'),
            [OnlineGameResultReason.Repetition]: t('resultReasonRepetition'),
        }),
        [t],
    );

    const updateFilter = (field: keyof FilterState, value: string) => {
        onFilterChange({ ...filters, [field]: value });
    };

    return (
        <Collapse in={open}>
            <Grid container rowSpacing={1.5} columnSpacing={1}>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterSourceLabel')}
                        value={filters.source}
                        onChange={(e) => updateFilter('source', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        <MenuItem value={GameImportTypes.lichessGame}>
                            {t('filterSourceLichess')}
                        </MenuItem>
                        <MenuItem value={GameImportTypes.chesscomGame}>
                            {t('filterSourceChesscom')}
                        </MenuItem>
                    </TextField>
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterTimeClassLabel')}
                        value={filters.timeClass}
                        onChange={(e) => updateFilter('timeClass', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        {Object.values(OnlineGameTimeClass).map((tc) => (
                            <MenuItem key={tc} value={tc}>
                                {timeClassLabels[tc]}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterTimeControlLabel')}
                        value={filters.timeControl}
                        onChange={(e) => updateFilter('timeControl', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        {timeControlOptions.map((tc) => (
                            <MenuItem key={tc} value={tc}>
                                {tc === 'daily' ? t('filterTimeControlDaily') : tc}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterResultLabel')}
                        value={filters.result}
                        onChange={(e) => updateFilter('result', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        <MenuItem value='1-0'>{t('filterResultWhiteWins')}</MenuItem>
                        <MenuItem value='1/2-1/2'>{t('filterResultDraw')}</MenuItem>
                        <MenuItem value='0-1'>{t('filterResultBlackWins')}</MenuItem>
                        <MenuItem value='*'>{t('filterResultUnknown')}</MenuItem>
                    </TextField>
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterResultReasonLabel')}
                        value={filters.resultReason}
                        onChange={(e) => updateFilter('resultReason', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        {Object.values(OnlineGameResultReason).map(
                            (r) =>
                                r !== OnlineGameResultReason.Unknown && (
                                    <MenuItem key={r} value={r}>
                                        {resultReasonLabels[r]}
                                    </MenuItem>
                                ),
                        )}
                    </TextField>
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterRatedLabel')}
                        value={filters.rated}
                        onChange={(e) => updateFilter('rated', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        <MenuItem value='true'>{t('filterRatedTrue')}</MenuItem>
                        <MenuItem value='false'>{t('filterRatedFalse')}</MenuItem>
                    </TextField>
                </Grid>

                <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('filterCohortMatchLabel')}
                        value={filters.cohortMatch}
                        onChange={(e) => updateFilter('cohortMatch', e.target.value)}
                    >
                        <MenuItem value=''>{t('filterOptionAll')}</MenuItem>
                        <MenuItem value='true'>{t('filterCohortMatchYes')}</MenuItem>
                        <MenuItem value='false'>{t('filterCohortMatchNo')}</MenuItem>
                    </TextField>
                </Grid>

                <Grid size={12}>
                    <Button
                        size='small'
                        onClick={() => onFilterChange(EMPTY_FILTERS)}
                        disabled={!hasActiveFilters}
                    >
                        {t('clearFilters')}
                    </Button>
                </Grid>
            </Grid>
        </Collapse>
    );
}

function GameCard({ game, onClick }: { game: OnlineGame; onClick: (game: OnlineGame) => void }) {
    const t = useTranslations('games.import.onlineForm');
    const { user } = useAuth();
    const createdAt = new Date(game.endTime);
    const dateStr = toDojoDateString(createdAt, user?.timezoneOverride);
    const timeStr = toDojoTimeString(createdAt, user?.timezoneOverride, user?.timeFormat);

    const tcLabel = formatTimeControl(game);
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
            data-testid={`online-game-card-${game.id}`}
        >
            <Stack spacing={1.125}>
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        {game.source === GameImportTypes.lichessGame ? (
                            <SiLichess />
                        ) : (
                            <SiChessdotcom color='#81b64c' />
                        )}
                        <Typography variant='body2'>
                            {dateStr} {timeStr}
                        </Typography>
                    </Stack>

                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {game.rated ? t('gameCardRated') : t('gameCardCasual')}
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
                        t('byResultReason', { reason: game.resultReason })}
                </Typography>
            </Stack>
        </ButtonBase>
    );
}

export const OnlineGameForm = ({ loading, onSubmit, onClose }: ImportDialogProps) => {
    const t = useTranslations('games.import.onlineForm');
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

    const sortOptions = useMemo(
        () => [
            { value: 'date-desc', label: t('sortNewestFirst') },
            { value: 'date-asc', label: t('sortOldestFirst') },
            { value: 'timeControl-asc', label: t('sortTcShortest') },
            { value: 'timeControl-desc', label: t('sortTcLongest') },
            { value: 'timeClass-asc', label: t('sortTcClassBulletToClassical') },
            { value: 'timeClass-desc', label: t('sortTcClassClassicalToBullet') },
            { value: 'result-desc', label: t('sortWhiteWinsFirst') },
            { value: 'result-asc', label: t('sortBlackWinsFirst') },
            { value: 'draws-desc', label: t('sortDrawsFirst') },
        ],
        [t],
    );

    const timeControlOptions = useMemo(() => {
        const unique = new Set(games.map(formatTimeControl));
        return [...unique].sort((a, b) => parseTimeControlTotal(b) - parseTimeControlTotal(a));
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
            setError(games.length > 0 ? t('errorUrlRequiredWithGames') : t('errorUrlRequired'));
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
                    .catch(() => request.onFailure(t('errorUnexpectedServer')));
            }

            return;
        }

        setError(t('errorUrlUnsupported'));
    };

    const onClickGame = (game: OnlineGame) => {
        onSubmit({ pgnText: game.pgn, type: game.source, url: game.url });
    };

    return (
        <>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogContent sx={{ height: fetchGames ? '85vh' : undefined }}>
                <Stack>
                    <TextField
                        data-testid='online-game-url'
                        label={t('urlLabel')}
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
                        direction='row'
                        spacing={1}
                        sx={{
                            alignSelf: 'flex-end',
                            paddingRight: 1,
                            paddingTop: 1,
                        }}
                    >
                        <Button disabled={isImporting} onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <ImportButton loading={isImporting} onClick={handleSubmit} />
                    </Stack>
                    <OrDivider header={t('orDividerRecentGames')} />

                    {fetchGames && user?.dojoCohort && (
                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{
                                alignItems: 'center',
                                mb: 2,
                            }}
                        >
                            <CohortIcon
                                cohort={user.dojoCohort}
                                tooltip={user.dojoCohort}
                                size={28}
                            />
                            <Typography
                                variant='caption'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {t.rich('cohortMinimumTimeControlHint', {
                                    cohort: user.dojoCohort,
                                    timeControl: getTimeControl(user.dojoCohort),
                                    strong: (chunks) => <strong>{chunks}</strong>,
                                    checkIcon: () => (
                                        <CheckCircleIcon
                                            color='success'
                                            sx={{ fontSize: 14, verticalAlign: 'middle' }}
                                        />
                                    ),
                                })}
                            </Typography>
                        </Stack>
                    )}

                    {fetchGames && (
                        <>
                            <TextField
                                size='small'
                                data-testid='online-game-search'
                                placeholder={t('searchPlaceholder')}
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
                                sx={{ mb: 2 }}
                            />

                            <Stack
                                direction='row'
                                spacing={1}
                                sx={{
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <Button
                                    size='small'
                                    startIcon={<FilterListIcon />}
                                    onClick={() => setFiltersOpen((prev) => !prev)}
                                    variant={hasActiveFilters || filtersOpen ? 'contained' : 'text'}
                                    color='primary'
                                >
                                    {filtersOpen
                                        ? t('filterButtonHide')
                                        : hasActiveFilters
                                          ? t('filterButtonActive')
                                          : t('filterButtonIdle')}
                                </Button>
                                <TextField
                                    select
                                    size='small'
                                    label={t('sortLabel')}
                                    value={sortValue}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    sx={{ minWidth: 160 }}
                                >
                                    {sortOptions.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

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
                                sx={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    pt: 6,
                                    pb: 4,
                                }}
                            >
                                <CircularProgress />
                            </Stack>
                        ) : processedGames.length === 0 ? (
                            <Typography
                                variant='body2'
                                sx={{
                                    color: 'text.secondary',
                                    py: 2,
                                }}
                            >
                                {hasActiveFilters || searchText.trim()
                                    ? t('noGamesMatchFilters')
                                    : t('noRecentGames')}
                            </Typography>
                        ) : (
                            <Stack>
                                {pagedGames.map((game) => (
                                    <GameCard key={game.id} game={game} onClick={onClickGame} />
                                ))}
                                {pageCount > 1 && (
                                    <Stack
                                        sx={{
                                            alignItems: 'center',
                                            pt: 2,
                                        }}
                                    >
                                        <Pagination
                                            data-testid='online-games-pagination'
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
                            {t.rich('addUsernameHint', {
                                link: (chunks) => (
                                    <Link href='/profile/edit#ratings'>{chunks}</Link>
                                ),
                            })}
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <RequestSnackbar request={request} />
        </>
    );
};
