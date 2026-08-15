import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import {
    RoundRobin,
    RoundRobinPlayer,
    RoundRobinPlayerStatuses,
    RoundRobinWaitlist,
    calculatePlayerStats,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { Edit, EmojiEvents } from '@mui/icons-material';
import {
    Chip,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AdminEditPlayerDialog } from './AdminEditPlayerDialog';

export function Players({
    tournament,
    onUpdate,
}: {
    tournament: RoundRobin | RoundRobinWaitlist;
    onUpdate?: (tournament: RoundRobin | RoundRobinWaitlist) => void;
}) {
    const { user } = useAuth();
    const isAdmin = Boolean(user?.isAdmin || user?.isTournamentAdmin);
    const [editingPlayer, setEditingPlayer] = useState<RoundRobinPlayer>();
    const t = useTranslations('tournaments.roundRobin.players');

    if (Object.values(tournament.players).length === 0) {
        return null;
    }

    const isTournament = isRoundRobin(tournament);

    const players = isTournament
        ? tournament.playerOrder.map((username) => tournament.players[username])
        : Object.values(tournament.players);

    const stats = isTournament ? calculatePlayerStats(tournament) : undefined;

    players.sort((lhs, rhs) => {
        if (!stats) {
            return 0;
        }
        return (
            (stats[rhs.username]?.score ?? 0) - (stats[lhs.username]?.score ?? 0) ||
            (stats[rhs.username]?.tiebreakScore ?? 0) - (stats[lhs.username]?.tiebreakScore ?? 0)
        );
    });

    return (
        <>
            <Table sx={{ mt: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <Typography
                                sx={{
                                    fontWeight: 'bold',
                                }}
                            >
                                {t('columnPlayer')}
                            </Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography
                                sx={{
                                    fontWeight: 'bold',
                                }}
                            >
                                {t('columnLichess')}
                            </Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography
                                sx={{
                                    fontWeight: 'bold',
                                }}
                            >
                                {t('columnChesscom')}
                            </Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography
                                sx={{
                                    fontWeight: 'bold',
                                }}
                            >
                                {t('columnDiscord')}
                            </Typography>
                        </TableCell>
                        {isTournament && (
                            <TableCell align='center'>
                                <Typography
                                    sx={{
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {t('columnScore')}
                                </Typography>
                            </TableCell>
                        )}
                        {isAdmin && (
                            <TableCell align='center'>
                                <Typography
                                    sx={{
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {t('columnActions')}
                                </Typography>
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {players.map((player) => (
                        <TableRow key={player.username}>
                            <TableCell>
                                <Stack
                                    direction='row'
                                    sx={{
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    {isTournament &&
                                        tournament.winners?.includes(player.username) && (
                                            <Chip
                                                color='success'
                                                size='small'
                                                icon={<EmojiEvents />}
                                                sx={{ '& .MuiChip-label': { pr: 0 } }}
                                            />
                                        )}

                                    <Typography>
                                        <Link href={`/profile/${player.username}`}>
                                            {player.displayName}
                                        </Link>
                                        {player.status === RoundRobinPlayerStatuses.WITHDRAWN &&
                                            t('withdrawnSuffix')}
                                    </Typography>
                                </Stack>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    <Link
                                        href={`https://lichess.org/@/${player.lichessUsername}`}
                                        target='_blank'
                                        rel='noopener'
                                    >
                                        {player.lichessUsername}
                                    </Link>
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    <Link
                                        href={`https://www.chess.com/member/${player.chesscomUsername}`}
                                        target='_blank'
                                        rel='noopener'
                                    >
                                        {player.chesscomUsername}
                                    </Link>
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    {player.discordId ? (
                                        <Link
                                            href={`https://discord.com/users/${player.discordId}`}
                                            target='_blank'
                                            rel='noopener'
                                        >
                                            {player.discordUsername}
                                        </Link>
                                    ) : (
                                        player.discordUsername
                                    )}
                                </Typography>
                            </TableCell>
                            {stats && (
                                <TableCell align='center'>
                                    <Typography>{stats[player.username]?.score ?? 0}</Typography>
                                </TableCell>
                            )}
                            {isAdmin && (
                                <TableCell align='center'>
                                    <Tooltip title={t('editPlayer')}>
                                        <IconButton
                                            size='small'
                                            aria-label={t('editPlayer')}
                                            onClick={() => setEditingPlayer(player)}
                                        >
                                            <Edit fontSize='small' />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {editingPlayer && onUpdate && (
                <AdminEditPlayerDialog
                    open
                    onClose={() => setEditingPlayer(undefined)}
                    cohort={tournament.cohort}
                    startsAt={tournament.startsAt}
                    player={editingPlayer}
                    onUpdate={(updated) => {
                        onUpdate(updated);
                        setEditingPlayer(undefined);
                    }}
                />
            )}
        </>
    );
}

function isRoundRobin(value: unknown): value is RoundRobin {
    return typeof value === 'object' && value !== null && 'playerOrder' in value;
}
