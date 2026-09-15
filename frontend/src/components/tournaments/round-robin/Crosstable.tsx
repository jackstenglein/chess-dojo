import { Link } from '@/components/navigation/Link';
import {
    RoundRobin,
    RoundRobinPairing,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

/**
 * Renders the crosstable for the given tournament.
 */
export function Crosstable({ tournament }: { tournament: RoundRobin }) {
    const t = useTranslations('tournaments.roundRobin.crosstable');

    if (!tournament.players) {
        return (
            <Typography
                sx={{
                    textAlign: 'center',
                }}
            >
                {t('noData')}
            </Typography>
        );
    }

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align='center'></TableCell>
                        {tournament.playerOrder.map((username) => (
                            <TableCell key={username} align='center'>
                                <Link href={`/profile/${username}`}>
                                    {tournament.players[username].displayName}
                                </Link>
                                {tournament.players[username].status ===
                                    RoundRobinPlayerStatuses.WITHDRAWN && (
                                    <>
                                        <br />
                                        {t('withdrawn')}
                                    </>
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tournament.playerOrder.map((player) => (
                        <CrosstableRow key={player} player={player} tournament={tournament} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function CrosstableRow({ player, tournament }: { player: string; tournament: RoundRobin }) {
    const t = useTranslations('tournaments.roundRobin.crosstable');
    const withdrawn = tournament.players[player].status === RoundRobinPlayerStatuses.WITHDRAWN;

    return (
        <TableRow>
            <TableCell
                align='center'
                sx={{
                    borderLeft: '1px solid',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Link href={`/profile/${player}`}>{tournament.players[player].displayName}</Link>
                {withdrawn && (
                    <>
                        <br />
                        {t('withdrawn')}
                    </>
                )}
            </TableCell>

            {tournament.playerOrder.map((opponent) => {
                if (player === opponent) {
                    return (
                        <TableCell
                            key={`${player}-${opponent}`}
                            align='center'
                            sx={{
                                borderRight: '1px solid',
                                borderColor: 'divider',
                                backgroundColor: 'divider',
                            }}
                        ></TableCell>
                    );
                }

                let pairing: RoundRobinPairing | undefined = undefined;
                for (const round of tournament.pairings) {
                    for (const p of round) {
                        if (
                            (p.white === player && p.black === opponent) ||
                            (p.black === player && p.white === opponent)
                        ) {
                            pairing = p;
                            break;
                        }
                    }
                }

                let result = '';
                if (pairing?.result === '1-0') {
                    result = pairing.white === player ? '1' : '0';
                } else if (pairing?.result === '0-1') {
                    result = pairing.white === player ? '0' : '1';
                } else if (pairing?.result === '1/2-1/2') {
                    result = '1/2';
                }

                if (withdrawn) {
                    result = '0';
                } else if (
                    tournament.players[opponent].status === RoundRobinPlayerStatuses.WITHDRAWN
                ) {
                    result = '1';
                }

                return (
                    <TableCell
                        key={`${player}-${opponent}`}
                        align='center'
                        sx={{ borderRight: '1px solid', borderColor: 'divider' }}
                    >
                        <Typography variant='h6'>
                            {pairing?.url ? <Link href={pairing?.url}>{result}</Link> : result}
                        </Typography>
                    </TableCell>
                );
            })}
        </TableRow>
    );
}
