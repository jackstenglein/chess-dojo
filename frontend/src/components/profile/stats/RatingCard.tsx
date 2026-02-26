import { useAuth } from '@/auth/Auth';
import {
    RatingHistory,
    RatingSystem,
    formatRatingSystem,
    getNormalizedRating,
    getRatingBoundary,
    isCustom,
} from '@/database/user';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HelpIcon from '@mui/icons-material/Help';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Link,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { AxisOptions, Chart } from 'react-charts';

export function getMemberLink(ratingSystem: RatingSystem, username: string): string {
    switch (ratingSystem) {
        case RatingSystem.Chesscom:
            return `https://www.chess.com/member/${username}`;
        case RatingSystem.Lichess:
            return `https://lichess.org/@/${username}`;
        case RatingSystem.Fide:
            return `https://ratings.fide.com/profile/${username}`;
        case RatingSystem.Uscf:
            return `https://ratings.uschess.org/player/${username}`;
        case RatingSystem.Ecf:
            return `https://www.ecfrating.org.uk/v2/new/player.php?ECF_code=${username}`;
        case RatingSystem.Cfc:
            return `https://www.chess.ca/en/ratings/p/?id=${username}`;
        case RatingSystem.Dwz:
            return `https://www.schachbund.de/spieler/${username}.html`;
        case RatingSystem.Acf:
            return `https://sachess.org.au/ratings/player?id=${username}`;
        case RatingSystem.Knsb:
            return `https://ratingviewer.nl/lists/1/players/${username}`;
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return '';
    }
}

function everySevenDays(startDate: Date, endDate: Date): Date[] {
    const result: Date[] = [];
    const currentDate = startDate;
    while (currentDate <= endDate) {
        result.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
    }
    return result;
}

function datesAreSameDay(first: Date, second: Date) {
    return (
        first.getUTCFullYear() === second.getUTCFullYear() &&
        first.getUTCMonth() === second.getUTCMonth() &&
        first.getUTCDate() === second.getUTCDate()
    );
}

export function getChartData(ratingHistory: RatingHistory[] | undefined, currentRating: number) {
    if (!ratingHistory) {
        return [];
    }

    // Any 0 rating is probably a data collection error. Strip them out.
    const sanitizedHistory = ratingHistory.filter((r) => r.rating > 0);

    if (sanitizedHistory.length === 0) {
        return [];
    }

    // Map the rating history into the chart data, filling in any missing weeks with the last known rating.
    // NOTE: We never count today as a missing week, since we have today's rating data on-hand
    const dates = everySevenDays(new Date(sanitizedHistory[0].date), new Date());
    let data = [];
    if (dates.length === sanitizedHistory.length) {
        data = sanitizedHistory.map((r) => ({
            date: new Date(r.date),
            rating: r.rating,
        }));
    } else {
        let historyIndex = 0;
        for (const date of dates) {
            if (
                historyIndex < sanitizedHistory.length &&
                date >= new Date(sanitizedHistory[historyIndex].date)
            ) {
                data.push({
                    date,
                    rating: sanitizedHistory[historyIndex].rating,
                });
                historyIndex++;
            } else if (historyIndex > 0 && !datesAreSameDay(date, new Date())) {
                data.push({
                    date,
                    rating: sanitizedHistory[historyIndex - 1].rating,
                });
            }
        }
    }

    // If there isn't already a rating for today, append the current rating to the chart data.
    const now = new Date();
    if (data.length > 0 && !datesAreSameDay(now, data[data.length - 1].date)) {
        data.push({
            date: now,
            rating: currentRating,
        });
    }

    return [{ label: 'Rating', data }];
}

function RatingProfileLink({
    usernameHidden,
    username,
    system,
}: {
    usernameHidden: boolean;
    username: string;
    system: RatingSystem;
}) {
    if (usernameHidden || isCustom(system)) {
        return null;
    }
    return (
        <Stack direction='row' alignItems='end'>
            <Typography variant='subtitle1' color='text.secondary'>
                {username}
            </Typography>
            <Link target='_blank' rel='noopener noreferrer' href={getMemberLink(system, username)}>
                <OpenInNewIcon sx={{ fontSize: '1rem', ml: '3px' }} />
            </Link>
        </Stack>
    );
}

interface Datum {
    date: Date;
    rating: number;
}

export const primaryAxis: AxisOptions<Datum> = {
    scaleType: 'time',
    getValue: (datum) => datum.date,
};

export const secondaryAxes: AxisOptions<Datum>[] = [
    {
        scaleType: 'linear',
        getValue: (datum) => datum.rating,
        formatters: {
            scale: (value) => `${value}`,
        },
    },
];

interface RatingCardProps {
    system: RatingSystem;
    cohort: string;
    username: string;
    usernameHidden: boolean;
    currentRating: number;
    startRating: number;
    name?: string;
    isPreferred?: boolean;
    ratingHistory?: RatingHistory[];
    isProvisional?: boolean;
}

const RatingCard: React.FC<RatingCardProps> = ({
    system,
    cohort,
    username,
    usernameHidden,
    currentRating,
    startRating,
    name,
    isPreferred,
    ratingHistory,
    isProvisional,
}) => {
    const { user } = useAuth();
    const dark = !user?.enableLightMode;
    const ratingChange = currentRating - startRating;
    const graduation = getRatingBoundary(cohort, system);

    const historyData = useMemo(() => {
        return getChartData(ratingHistory, currentRating);
    }, [ratingHistory, currentRating]);

    if (!system || (!currentRating && !startRating)) {
        return null;
    }

    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack direction='row' justifyContent='space-between' mb={2}>
                    <Stack direction='row' spacing={1.5} alignItems='center'>
                        <RatingSystemIcon system={system} />

                        <Stack>
                            <Typography variant='h6' sx={{ mb: -1 }}>
                                {formatRatingSystem(system)}
                                {isCustom(system) && name && ` (${name})`}
                            </Typography>
                            <RatingProfileLink
                                usernameHidden={usernameHidden}
                                username={username}
                                system={system}
                            />
                        </Stack>
                    </Stack>

                    {isPreferred && <Chip label='Preferred' variant='outlined' color='success' />}
                </Stack>

                <Grid container justifyContent='space-around' rowGap={2}>
                    <Grid
                        size={{ xs: 6, sm: 3, md: 'grow' }}
                        display='flex'
                        justifyContent='center'
                    >
                        <Stack alignItems='center'>
                            <Typography variant='subtitle2' color='text.secondary'>
                                Current
                            </Typography>
                            <Stack direction='row' alignItems='end'>
                                <Typography
                                    sx={{
                                        fontSize: '2.25rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {currentRating}
                                    {isProvisional && '?'}
                                </Typography>
                                <Tooltip title='Ratings are updated every 24 hours'>
                                    <HelpIcon
                                        sx={{
                                            mb: '5px',
                                            ml: '3px',
                                            color: 'text.secondary',
                                        }}
                                    />
                                </Tooltip>
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid
                        size={{ xs: 6, sm: 3, md: 'grow' }}
                        display='flex'
                        justifyContent='center'
                    >
                        <Stack alignItems='center'>
                            <Typography variant='subtitle2' color='text.secondary'>
                                Start
                            </Typography>

                            <Typography
                                sx={{
                                    fontSize: '2.25rem',
                                    lineHeight: 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                {startRating}
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid
                        size={{ xs: 6, sm: 3, md: 'grow' }}
                        display='flex'
                        justifyContent='center'
                    >
                        <Stack alignItems='center'>
                            <Typography variant='subtitle2' color='text.secondary'>
                                Change
                            </Typography>

                            <Stack direction='row' alignItems='start'>
                                {ratingChange >= 0 ? (
                                    <ArrowUpwardIcon
                                        sx={{
                                            fontSize: '2.25rem',
                                            fontWeight: 'bold',
                                            mt: '-3px',
                                        }}
                                        color='success'
                                    />
                                ) : (
                                    <ArrowDownwardIcon
                                        sx={{
                                            fontSize: '2.25rem',
                                            fontWeight: 'bold',
                                            mt: '-3px',
                                        }}
                                        color='error'
                                    />
                                )}

                                <Typography
                                    sx={{
                                        fontSize: '2.25rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                    color={ratingChange >= 0 ? 'success.main' : 'error.main'}
                                >
                                    {Math.abs(ratingChange)}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Grid>

                    {!isCustom(system) && (
                        <Grid
                            size={{ xs: 6, sm: 3, md: 'grow' }}
                            display='flex'
                            justifyContent='center'
                        >
                            <Stack alignItems='center'>
                                <Typography variant='subtitle2' color='text.secondary'>
                                    Normalized
                                </Typography>
                                <Stack direction='row' alignItems='end'>
                                    <Typography
                                        sx={{
                                            fontSize: '2.25rem',
                                            lineHeight: 1,
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {Math.round(getNormalizedRating(currentRating, system))}
                                    </Typography>
                                    <Tooltip title='Normalized Dojo rating using the table on Material > Rating Conversions'>
                                        <HelpIcon
                                            sx={{
                                                mb: '5px',
                                                ml: '3px',
                                                color: 'text.secondary',
                                            }}
                                        />
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </Grid>
                    )}

                    <Grid
                        size={{ xs: 6, sm: 3, md: 'grow' }}
                        display='flex'
                        justifyContent='center'
                    >
                        <Stack alignItems='center'>
                            <Typography
                                variant='subtitle2'
                                color='text.secondary'
                                whiteSpace='nowrap'
                            >
                                Next Graduation
                            </Typography>

                            <Typography
                                sx={{
                                    fontSize: '2.25rem',
                                    lineHeight: 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                {graduation || 'N/A'}
                            </Typography>
                        </Stack>
                    </Grid>
                </Grid>

                {historyData.length > 0 && (
                    <Stack>
                        <Box height={300} mt={2}>
                            <Chart
                                options={{
                                    data: historyData,
                                    primaryAxis,
                                    secondaryAxes,
                                    dark,
                                    interactionMode: 'closest',
                                    tooltip: false,
                                }}
                            />
                        </Box>
                        <Typography variant='caption' color='text.secondary' mt={0.5} ml={0.5}>
                            *Graphs are updated weekly
                        </Typography>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

export default RatingCard;
