import { useApi } from '@/api/Api';
import { GetDirectoryStatsResponse } from '@/api/directoryApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { compareCohorts, formatRatingSystem } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { PawnIcon } from '@/style/ChessIcons';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import {
    CohortPerformanceStats,
    Directory,
    DirectoryItemTypes,
    PerformanceStats,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Assessment, PeopleAlt, StarBorder, TimelineOutlined } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    ListItemText,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    Zoom,
    alpha,
    useTheme,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

const { Custom, Custom2, Custom3, ...validRatingSystems } = RatingSystem;

interface StatsButtonProps {
    directory: Directory;
}

export function StatsButton({ directory }: StatsButtonProps) {
    const t = useTranslations('profile.directories');
    const tRating = useTranslations('enums.ratingSystem');
    const api = useApi();

    const [open, setOpen] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [ratingSystem, setRatingSystem] = useState(RatingSystem.Chesscom);
    const request = useRequest<GetDirectoryStatsResponse>();

    const playerGameCounts = useMemo(() => {
        const map = new Map<string, number>();

        for (const id of directory.itemIds) {
            const currentItem = directory.items[id];
            if (currentItem?.type !== DirectoryItemTypes.OWNED_GAME) {
                continue;
            }
            const metadata = currentItem.metadata;
            map.set(metadata.black, (map.get(metadata.black) || 0) + 1);
            map.set(metadata.white, (map.get(metadata.white) || 0) + 1);
        }

        return map;
    }, [directory]);

    const sortedPlayers = useMemo(() => {
        return Array.from(playerGameCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [playerGameCounts]);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setPlayerName('');
        request.reset();
        setRatingSystem(RatingSystem.Chesscom);
    };

    const onUpdatePlayerName = (name: string) => {
        setPlayerName(name);
        request.reset();
    };

    const onUpdateRatingSystem = (system: RatingSystem) => {
        setRatingSystem(system);
        request.reset();
    };

    const handleFetchStats = async () => {
        if (!playerName) return;

        try {
            request.onStart();
            const result = await api.getDirectoryStats({
                owner: directory.owner,
                id: directory.id,
                username: playerName,
                ratingSystem: ratingSystem,
            });
            request.onSuccess(result.data);
        } catch (err) {
            request.onFailure(err);
        }
    };

    return (
        <>
            <Button startIcon={<Assessment />} onClick={handleOpen}>
                {t('stats')}
            </Button>

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth='lg'>
                <RequestSnackbar request={request} />

                <DialogTitle>
                    <Stack
                        direction='row'
                        spacing={2}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Assessment color='primary' />
                        <Typography
                            variant='h5'
                            sx={{
                                fontWeight: 'bold',
                            }}
                        >
                            {t('performanceStats')}
                        </Typography>
                    </Stack>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={4} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                            <TextField
                                select
                                label={t('selectPlayer')}
                                value={playerName}
                                onChange={(e) => onUpdatePlayerName(e.target.value)}
                                fullWidth
                                variant='outlined'
                                helperText={
                                    playerName
                                        ? t('gamesInDirectory', {
                                              count: playerGameCounts.get(playerName) ?? 0,
                                          })
                                        : t('choosePlayer')
                                }
                                slotProps={{
                                    select: {
                                        renderValue: (selected) => selected as string,
                                    },
                                }}
                            >
                                {sortedPlayers.map(({ name, count }) => (
                                    <MenuItem key={name} value={name}>
                                        <ListItemText
                                            primary={name}
                                            secondary={t('gamesCount', { count })}
                                        />
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label={t('ratingSystem')}
                                value={ratingSystem}
                                onChange={(e) =>
                                    onUpdateRatingSystem(e.target.value as RatingSystem)
                                }
                                fullWidth
                                variant='outlined'
                            >
                                {Object.values(validRatingSystems).map((system) => (
                                    <MenuItem key={system} value={system}>
                                        <Stack
                                            direction='row'
                                            spacing={2}
                                            sx={{
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <RatingSystemIcon system={system} size='small' />
                                            </Box>
                                            <Typography>
                                                {formatRatingSystem(system, tRating)}
                                            </Typography>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        <Button
                            variant='contained'
                            color='success'
                            onClick={handleFetchStats}
                            startIcon={<TimelineOutlined />}
                            loading={request.isLoading()}
                            disabled={!playerName}
                            sx={{
                                py: 1.5,
                                borderRadius: 2,
                                fontWeight: 'bold',
                                textTransform: 'none',
                                fontSize: '1.1rem',
                            }}
                        >
                            {t('generateStats')}
                        </Button>
                    </Stack>

                    {request.data && (
                        <DirectoryStats
                            stats={request.data.stats}
                            playerName={playerName}
                            ratingSystem={ratingSystem}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{t('close')}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function DirectoryStats({
    stats,
    playerName,
    ratingSystem,
}: {
    stats: PerformanceStats;
    playerName: string;
    ratingSystem: RatingSystem;
}) {
    const t = useTranslations('profile.directories');
    const tRating = useTranslations('enums.ratingSystem');
    return (
        <Fade in timeout={500}>
            <Stack
                spacing={4}
                sx={{
                    mt: 6,
                }}
            >
                <Typography
                    variant='h4'
                    color='primary'
                    sx={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        mb: -2,
                    }}
                >
                    {t('playerPerformance', { name: playerName })}
                </Typography>

                <Stack spacing={2}>
                    <Typography
                        variant='h6'
                        sx={{
                            fontWeight: 'bold',
                        }}
                    >
                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <RatingSystemIcon system={ratingSystem} size='medium' />
                            <span>
                                {t('ratingPerformance', {
                                    system: formatRatingSystem(ratingSystem, tRating),
                                })}
                            </span>
                        </Stack>
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <RatingCard
                            title={t('overallPerformance')}
                            rating={stats.rating.total}
                            normalizedRating={stats.normalizedRating.total}
                            wins={stats.wins.total}
                            draws={stats.draws.total}
                            losses={stats.losses.total}
                            color='success'
                            icon={<Assessment />}
                            delay={0}
                        />
                        <RatingCard
                            title={t('performanceAsWhite')}
                            rating={stats.rating.white}
                            normalizedRating={stats.normalizedRating.white}
                            wins={stats.wins.white}
                            draws={stats.draws.white}
                            losses={stats.losses.white}
                            color='primary'
                            icon={<PawnIcon />}
                            delay={1}
                        />
                        <RatingCard
                            title={t('performanceAsBlack')}
                            rating={stats.rating.black}
                            normalizedRating={stats.normalizedRating.black}
                            wins={stats.wins.black}
                            draws={stats.draws.black}
                            losses={stats.losses.black}
                            color='primary'
                            icon={<PawnIcon />}
                            delay={2}
                        />
                    </Stack>
                </Stack>

                <Stack spacing={2}>
                    <Typography
                        variant='h6'
                        sx={{
                            fontWeight: 'bold',
                        }}
                    >
                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <StarBorder color='primary' />
                            <span>{t('avgOpponentRating')}</span>
                        </Stack>
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <RatingCard
                            title={t('overall')}
                            rating={stats.avgOppRating.total}
                            normalizedRating={stats.normalizedAvgOppRating.total}
                            color='warning'
                            icon={<StarBorder />}
                            delay={0}
                        />
                        <RatingCard
                            title={t('whenPlayWhite')}
                            rating={stats.avgOppRating.white}
                            normalizedRating={stats.normalizedAvgOppRating.white}
                            color='warning'
                            icon={<StarBorder />}
                            delay={1}
                        />
                        <RatingCard
                            title={t('whenPlayBlack')}
                            rating={stats.avgOppRating.black}
                            normalizedRating={stats.normalizedAvgOppRating.black}
                            color='warning'
                            icon={<StarBorder />}
                            delay={2}
                        />
                    </Stack>
                </Stack>

                <CohortStatsTable stats={stats} />
            </Stack>
        </Fade>
    );
}

interface RatingCardProps {
    title: string;
    rating?: number;
    normalizedRating?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    color?: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'white' | 'grey';
    icon?: React.ReactNode;
    delay?: number;
}

function RatingCard({
    title,
    rating = 0,
    normalizedRating = 0,
    wins = 0,
    draws = 0,
    losses = 0,
    color = 'primary',
    icon,
    delay = 0,
}: RatingCardProps) {
    const t = useTranslations('profile.directories');
    const theme = useTheme();

    const getColorValue = (colorName: string) => {
        switch (colorName) {
            case 'success':
                return theme.palette.success.main;
            case 'error':
                return theme.palette.error.main;
            case 'warning':
                return theme.palette.warning.main;
            case 'info':
                return theme.palette.info.main;
            case 'white':
                return '#ffffff';
            case 'grey':
                return theme.palette.grey[600];
            default:
                return theme.palette.primary.main;
        }
    };
    const colorValue = getColorValue(color);
    const totalGames = wins + draws + losses;

    return (
        <Zoom in timeout={300 + delay * 100}>
            <Card
                elevation={1}
                sx={{
                    minHeight: 1,
                    flexGrow: 1,
                    color: colorValue,
                    backgroundColor: alpha(colorValue, color === 'white' ? 0.1 : 0.08),
                    border: `1px solid ${alpha(colorValue, color === 'white' ? 0.3 : 0.2)}`,
                    borderRadius: 2,
                }}
            >
                <CardContent
                    sx={{
                        minHeight: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack spacing={2}>
                        <Stack
                            direction='row'
                            sx={{
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Stack
                                direction='row'
                                spacing={1}
                                sx={{
                                    alignItems: 'center',
                                    color: colorValue,
                                }}
                            >
                                {icon}
                                <Typography
                                    component='span'
                                    variant='body2'
                                    sx={{
                                        color: 'text.secondary',
                                        fontWeight: 500,
                                        pt: '2px',
                                    }}
                                >
                                    {title}
                                </Typography>
                            </Stack>
                        </Stack>

                        <Typography
                            component='p'
                            variant='h4'
                            sx={{
                                fontWeight: 'bold',
                                color: 'inherit',
                            }}
                        >
                            {rating > 0 ? Math.round(rating) : 'N/A'}{' '}
                            {rating > 0 && (
                                <Tooltip title={t('normalizedRatingTooltip')}>
                                    <Typography
                                        component='span'
                                        variant='h5'
                                        sx={{
                                            color: 'text.secondary',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        ({Math.round(normalizedRating)}{' '}
                                        <ChessDojoIcon
                                            fontSize='small'
                                            sx={{ verticalAlign: 'middle', paddingBottom: '4px' }}
                                        />
                                        )
                                    </Typography>
                                </Tooltip>
                            )}
                        </Typography>

                        {totalGames > 0 && (
                            <Typography
                                sx={{
                                    whiteSpace: 'pre',
                                }}
                            >
                                <Typography
                                    component='span'
                                    color='success'
                                    sx={{
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {wins} W
                                </Typography>
                                <Typography
                                    component='span'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
                                    {'  '}/{'  '}
                                </Typography>
                                <Typography
                                    component='span'
                                    color='info'
                                    sx={{
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {draws} D
                                </Typography>
                                <Typography
                                    component='span'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
                                    {'  '}/{'  '}
                                </Typography>

                                <Typography
                                    component='span'
                                    sx={{
                                        color: 'error.light',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {losses} L
                                </Typography>
                            </Typography>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Zoom>
    );
}

const COHORT_TABLE_COLUMNS = [
    'colOpponentCohort',
    'colPerformance',
    'colAvgOppRating',
    'colGames',
    'colWinPct',
    'colDrawPct',
    'colLossPct',
] as const;

function CohortStatsTable({ stats }: { stats: PerformanceStats }) {
    const t = useTranslations('profile.directories');
    if (!stats?.cohortRatings || Object.entries(stats.cohortRatings).length === 0) {
        return null;
    }

    return (
        <Stack spacing={2}>
            <Typography
                variant='h6'
                sx={{
                    fontWeight: 'bold',
                }}
            >
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <PeopleAlt color='primary' />
                    <span>{t('performanceByCohort')}</span>
                </Stack>
            </Typography>

            <Card elevation={1} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {COHORT_TABLE_COLUMNS.map((key, i) => (
                                        <TableCell key={key} align={i === 0 ? 'left' : 'center'}>
                                            <Typography
                                                variant='subtitle2'
                                                sx={{
                                                    fontWeight: 'bold',
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {t(key)}
                                            </Typography>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {Object.entries(stats.cohortRatings)
                                    .sort((lhs, rhs) => compareCohorts(lhs[0], rhs[0]))
                                    .map(([cohort, cohortData]) => (
                                        <CohortStatsTableRow
                                            key={cohort}
                                            cohort={cohort}
                                            cohortData={cohortData}
                                        />
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Stack>
    );
}

function CohortStatsTableRow({
    cohort,
    cohortData,
}: {
    cohort: string;
    cohortData: CohortPerformanceStats;
}) {
    const t = useTranslations('profile.directories');
    const totalGames = cohortData.wins.total + cohortData.draws.total + cohortData.losses.total;
    if (totalGames === 0) {
        return null;
    }

    return (
        <TableRow key={cohort}>
            <TableCell align='center'>
                <Stack
                    direction='row'
                    sx={{
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <CohortIcon cohort={cohort} size={24} />
                    <Typography
                        variant='body2'
                        sx={{
                            fontWeight: '600',
                        }}
                    >
                        {cohort}
                    </Typography>
                </Stack>
            </TableCell>

            <TableCell align='center'>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 'bold',
                        color: 'success.main',
                        textAlign: 'center',
                    }}
                >
                    {cohortData.rating.total > 0 ? Math.round(cohortData.rating.total) : 'N/A'}{' '}
                    {cohortData.normalizedRating.total > 0 && (
                        <Tooltip title={t('normalizedRatingTooltip')}>
                            <Typography
                                component='span'
                                variant='body2'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                ({Math.round(cohortData.normalizedRating.total)}{' '}
                                <ChessDojoIcon
                                    fontSize='inherit'
                                    sx={{ verticalAlign: 'middle', paddingBottom: '4px' }}
                                />
                                )
                            </Typography>
                        </Tooltip>
                    )}
                </Typography>
            </TableCell>

            <TableCell align='center'>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 'bold',
                        color: 'warning.main',
                        textAlign: 'center',
                    }}
                >
                    {cohortData.avgOppRating.total > 0
                        ? round(cohortData.avgOppRating.total)
                        : 'N/A'}{' '}
                    {cohortData.normalizedAvgOppRating.total > 0 && (
                        <Tooltip title={t('normalizedRatingTooltip')}>
                            <Typography
                                component='span'
                                variant='body2'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                ({Math.round(cohortData.normalizedAvgOppRating.total)}{' '}
                                <ChessDojoIcon
                                    fontSize='inherit'
                                    sx={{ verticalAlign: 'middle', paddingBottom: '4px' }}
                                />
                                )
                            </Typography>
                        </Tooltip>
                    )}
                </Typography>
            </TableCell>

            <TableCell align='center'>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 'bold',
                        color: 'info.main',
                        textAlign: 'center',
                    }}
                >
                    {totalGames}
                </Typography>
            </TableCell>

            <TableCell align='center'>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 'bold',
                        color: 'success.main',
                        textAlign: 'center',
                    }}
                >
                    {round((cohortData.wins.total / totalGames) * 100)}%
                </Typography>
            </TableCell>

            <TableCell align='center'>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 'bold',
                        color: 'info.main',
                        textAlign: 'center',
                    }}
                >
                    {round((cohortData.draws.total / totalGames) * 100)}%
                </Typography>
            </TableCell>

            <TableCell align='center'>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 'bold',
                        color: 'error.main',
                        textAlign: 'center',
                    }}
                >
                    {round((cohortData.losses.total / totalGames) * 100)}%
                </Typography>
            </TableCell>
        </TableRow>
    );
}

function round(num: number, decimals = 1): number {
    const multiple = 10 * decimals;
    return Math.round(num * multiple) / multiple;
}
