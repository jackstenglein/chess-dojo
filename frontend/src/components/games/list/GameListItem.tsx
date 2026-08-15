import { useAuth } from '@/auth/Auth';
import { getIncrement, getInitialClock } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { toDojoDateString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { GameInfo, GameResult, PgnHeaders } from '@/database/game';
import { dojoCohorts } from '@/database/user';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { useLightMode } from '@/style/useLightMode';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import CircleIcon from '@mui/icons-material/Circle';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import { Box, Grid, Stack, Typography } from '@mui/material';
import {
    gridColumnVisibilityModelSelector,
    GridRenderCellParams,
    useGridApiContext,
    useGridSelector,
} from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';

export const MastersCohort = 'masters';
export const MastersOwnerDisplayName = 'Masters DB';

export function RenderPlayersCell(params: GridRenderCellParams<GameInfo>) {
    const headers = params.row.headers;

    return (
        <RenderPlayers
            fullHeight
            whiteElo={headers.WhiteElo}
            white={headers.White}
            black={headers.Black}
            blackElo={headers.BlackElo}
            result={headers.Result}
        />
    );
}

export function GameResultIcon({ result, asWhite }: { result?: string | null; asWhite: boolean }) {
    if (result === GameResult.White) {
        return asWhite ? <WinIcon /> : <LoseIcon />;
    }

    if (result === GameResult.Black) {
        return asWhite ? <LoseIcon /> : <WinIcon />;
    }

    if (result === GameResult.Draw) {
        return <DrawIcon />;
    }

    if (result === GameResult.Incomplete) {
        return <IncompleteIcon />;
    }

    return <IncompleteIcon />;
}

export function IncompleteIcon() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography
                sx={{
                    color: 'text.secondary',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '0.875rem',
                    width: '0.875rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    paddingTop: '0.4375rem',
                }}
            >
                *
            </Typography>
        </Box>
    );
}

export function WinIcon() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography
                sx={{
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 0.5,
                    height: '0.875rem',
                    width: '0.875rem',
                    fontWeight: 'bold',
                }}
            >
                +
            </Typography>
        </Box>
    );
}

export function LoseIcon() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography
                sx={{
                    bgcolor: 'error.main',
                    color: 'success.contrastText',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 0.5,
                    height: '0.875rem',
                    width: '0.875rem',
                    fontWeight: 'bold',
                }}
            >
                –
            </Typography>
        </Box>
    );
}

export function DrawIcon() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography
                sx={{
                    bgcolor: 'text.secondary',
                    color: 'success.contrastText',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 0.5,
                    height: '0.875rem',
                    width: '0.875rem',
                    fontWeight: 'bold',
                }}
            >
                =
            </Typography>
        </Box>
    );
}

interface RenderPlayersProps {
    white?: string;
    whiteElo?: string | number | null;
    whiteProvisional?: boolean;
    black?: string;
    blackElo?: string | number | null;
    blackProvisional?: boolean;
    fullHeight?: boolean;
    result?: GameResult | string | null;
}

export function RenderGameResultStack({ result }: { result: string | undefined | null }) {
    return (
        <Stack
            spacing={0.25}
            sx={{
                justifyContent: 'center',
                height: '100%',
            }}
        >
            <GameResultIcon result={result} asWhite />
            <GameResultIcon result={result} asWhite={false} />
        </Stack>
    );
}

export function BlackIcon() {
    return (
        <CircleIcon
            sx={{
                fontSize: { xs: '0.75rem', sm: 'initial' },
                color: 'grey.700',
            }}
        />
    );
}

export function RenderRatingHeader({ white }: { white: boolean }) {
    const t = useTranslations('games.listItem');
    return (
        <Stack
            direction='row'
            sx={{
                columnGap: '0.125rem',
            }}
        >
            {white ? <WhiteIcon /> : <BlackIcon />} {t('rating')}
        </Stack>
    );
}

export function WhiteIcon() {
    const light = useLightMode();

    return light ? (
        <CircleOutlinedIcon sx={{ fontSize: { xs: '0.75rem', sm: 'initial' } }} />
    ) : (
        <CircleIcon
            sx={{
                fontSize: { xs: '0.75rem', sm: 'initial' },
                color: 'white',
            }}
        />
    );
}

export function RenderPlayers({
    white,
    whiteElo,
    whiteProvisional,
    black,
    blackElo,
    blackProvisional,
    fullHeight,
}: RenderPlayersProps) {
    return (
        <Stack
            sx={{
                height: fullHeight ? 1 : undefined,
                justifyContent: 'center',
            }}
        >
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    columnGap: '0.25rem',
                }}
            >
                <WhiteIcon />
                <Typography variant='body2'>{white}</Typography>
                {whiteElo && (
                    <Typography
                        variant='body2'
                        sx={{
                            overflow: 'hidden',
                        }}
                    >
                        {getPlayerRating(whiteElo, whiteProvisional)}
                    </Typography>
                )}
            </Stack>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    columnGap: '0.25rem',
                }}
            >
                <BlackIcon />
                <Typography variant='body2'>{black}</Typography>
                {blackElo && (
                    <Typography
                        variant='body2'
                        sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        }}
                    >
                        {getPlayerRating(blackElo, blackProvisional)}
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
}

export function RenderCohort({ cohort }: { cohort: string }) {
    const t = useTranslations('games.listItem');
    let display = cohort;
    if (cohort && cohort !== dojoCohorts[0] && cohort !== dojoCohorts.slice(-1)[0]) {
        display = cohort.replace('00', '');
    }

    return (
        <Stack
            sx={{
                alignItems: 'center',
                justifyContent: 'center',
                height: 1,
            }}
        >
            <CohortIcon cohort={cohort} tooltip={cohort} size={28} />
            <Typography variant='caption' sx={{ fontSize: '0.6rem' }}>
                {display === MastersCohort ? t('mastersDb') : display}
            </Typography>
        </Stack>
    );
}

export function RenderOwner({
    ownerDisplayName,
    owner,
    avatarSize = 24,
}: {
    ownerDisplayName: GameInfo['ownerDisplayName'];
    owner: GameInfo['owner'];
    avatarSize?: number;
}) {
    if (ownerDisplayName === '' || ownerDisplayName === MastersOwnerDisplayName) {
        return '';
    }

    return (
        <Stack
            direction='row'
            spacing={1}
            onClick={(e) => e.stopPropagation()}
            sx={{
                alignItems: 'center',
            }}
        >
            {avatarSize > 0 && (
                <Avatar username={owner} displayName={ownerDisplayName} size={avatarSize} />
            )}
            <Link href={`/profile/${owner}`}>{ownerDisplayName}</Link>
        </Stack>
    );
}

export function getTimeControl({ timeControl }: { timeControl?: string }) {
    const initialClock = getInitialClock(timeControl);
    if (!initialClock) {
        return null;
    }

    const increment = getIncrement(timeControl);

    return `${Math.round(initialClock / 60)}+${increment ?? 0}`;
}

export function RenderTimeControl({ timeControl }: { timeControl?: string }) {
    if (!timeControl) {
        return null;
    }

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Typography variant='body2'>{getTimeControl({ timeControl })}</Typography>
        </Box>
    );
}

export function formatPublishedAt(value: string) {
    return value.split('T')[0].replaceAll('-', '.');
}

export function formatMoves(ply?: string) {
    return ply ? Math.ceil(parseInt(ply) / 2) : '?';
}

export function getPublishedAt(game: GameInfo) {
    return game.publishedAt || game.createdAt || game.id.split('_')[0];
}

function getPlayerRating(rating?: string | number, provisional?: boolean) {
    if (!rating) {
        return '';
    }

    let str = `(${rating}`;
    if (provisional) {
        str += '?';
    }
    str += ')';

    return str;
}

export function ListViewCell(params: GridRenderCellParams<GameInfo>) {
    const apiRef = useGridApiContext();
    const columnVisibilityModel = useGridSelector(apiRef, gridColumnVisibilityModelSelector);
    const showVisibility = columnVisibilityModel.unlisted;

    return <GameCell {...params.row} showVisibility={showVisibility} />;
}

export function GameCell({
    cohort,
    owner,
    ownerDisplayName,
    unlisted,
    date,
    headers,
    showVisibility,
}: {
    cohort: string;
    owner?: string;
    ownerDisplayName?: string | null;
    unlisted?: boolean;
    date?: string;
    headers?: Partial<PgnHeaders>;
    showVisibility?: boolean;
}) {
    const { user } = useAuth();
    const t = useTranslations('games.listItem');

    let description = getTimeControl({ timeControl: headers?.TimeControl }) || '';

    const moves = formatMoves(headers?.PlyCount);
    if (moves !== '?') {
        if (description) {
            description += ' • ';
        }
        description += t('moves', { count: moves });
    }

    if (date) {
        if (description) {
            description += ' • ';
        }
        const d = new Date(date);
        date = toDojoDateString(d, user?.timezoneOverride);
        description += date;
    }

    return (
        <Stack
            sx={{
                height: 1,
                justifyContent: 'center',
                py: 1,
            }}
        >
            <Grid container>
                <Grid size={1}>
                    <RenderGameResultStack result={headers?.Result} />
                </Grid>

                <Grid size={11}>
                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {RenderPlayers({
                            white: headers?.White,
                            whiteElo: headers?.WhiteElo,
                            black: headers?.Black,
                            blackElo: headers?.BlackElo,
                        })}

                        {showVisibility && unlisted && (
                            <VisibilityOff sx={{ color: 'text.secondary' }} />
                        )}
                        {showVisibility && !unlisted && (
                            <Visibility sx={{ color: 'text.secondary' }} />
                        )}
                    </Stack>
                </Grid>

                <Grid size={1}></Grid>
                <Grid size={11} sx={{ mt: 1 }}>
                    <Typography
                        variant='body2'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {description}
                    </Typography>
                </Grid>

                <Grid size={1}></Grid>
                <Grid size={11}>
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <CohortIcon cohort={cohort} tooltip={cohort} size={16} />
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                                ml: 0.5,
                            }}
                        >
                            {cohort === MastersCohort ? t('mastersDb') : cohort}
                        </Typography>

                        {cohort !== MastersCohort && ownerDisplayName && owner && (
                            <>
                                <Typography
                                    variant='body2'
                                    sx={{
                                        color: 'text.secondary',
                                        mx: 0.5,
                                    }}
                                >
                                    •
                                </Typography>
                                {RenderOwner({ ownerDisplayName, owner, avatarSize: 0 })}
                            </>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        </Stack>
    );
}
