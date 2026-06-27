import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import {
    RoundRobin,
    RoundRobinPairing,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ChangeEvent, useState } from 'react';

/**
 * Renders the pairings for the given Round Robin tournament.
 * @param tournament The tournament to render the pairings for.
 */
export function Pairings({ tournament }: { tournament: RoundRobin }) {
    const { user } = useAuth();
    const isPlayer = user && tournament.players[user.username];
    const [round, setRound] = useState<number>(isPlayer ? 0 : 1);
    const t = useTranslations('tournaments.roundRobin.pairings');

    const handleRoundChange = (event: ChangeEvent<HTMLInputElement>) => {
        setRound(Number(event.target.value));
    };

    return (
        <Stack spacing={2}>
            <TextField
                select
                value={round}
                onChange={handleRoundChange}
                fullWidth
                helperText={t('helperText')}
            >
                {isPlayer && (
                    <MenuItem key={0} value={0}>
                        {t('myPairings')}
                    </MenuItem>
                )}
                {[...Array(tournament.pairings.length).keys()].map((roundIdx) => (
                    <MenuItem key={roundIdx + 1} value={roundIdx + 1}>
                        {t('roundNumber', { number: roundIdx + 1 })}
                    </MenuItem>
                ))}
            </TextField>

            <Table>
                <TableHead>
                    <TableRow>
                        {round === 0 && (
                            <TableCell align='center'>
                                <Typography fontWeight='bold'>{t('columnRound')}</Typography>
                            </TableCell>
                        )}
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>{t('columnWhite')}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>{t('columnBlack')}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>{t('columnResult')}</Typography>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {round === 0 ? (
                        tournament.pairings.flatMap((roundPairings, idx) =>
                            roundPairings.map((pair) => {
                                if (
                                    pair.white === user?.username ||
                                    pair.black === user?.username
                                ) {
                                    return (
                                        <Pairing
                                            key={idx}
                                            pairing={pair}
                                            tournament={tournament}
                                            round={idx + 1}
                                        />
                                    );
                                }
                                return null;
                            }),
                        )
                    ) : tournament.pairings?.[round - 1] ? (
                        tournament.pairings[round - 1].map((pair, index) => (
                            <Pairing key={index} pairing={pair} tournament={tournament} />
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3}>
                                <Typography textAlign={'center'}>{t('noPairings')}</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Stack>
    );
}

function Pairing({
    pairing,
    tournament,
    round,
}: {
    pairing: RoundRobinPairing;
    tournament: RoundRobin;
    round?: number;
}) {
    const t = useTranslations('tournaments.roundRobin.pairings');
    const whiteWithdrawn =
        pairing.white &&
        tournament.players[pairing.white].status === RoundRobinPlayerStatuses.WITHDRAWN;
    const blackWithdrawn =
        pairing.black &&
        tournament.players[pairing.black].status === RoundRobinPlayerStatuses.WITHDRAWN;

    const White = pairing.white ? (
        <Link href={`/profile/${pairing.white}`}>
            {tournament.players[pairing.white].displayName}
        </Link>
    ) : (
        t('bye')
    );

    const Black = pairing.black ? (
        <Link href={`/profile/${pairing.black}`}>
            {tournament.players[pairing.black].displayName}
        </Link>
    ) : (
        t('bye')
    );

    const result =
        whiteWithdrawn && !blackWithdrawn
            ? '0-1'
            : blackWithdrawn && !whiteWithdrawn
              ? '1-0'
              : whiteWithdrawn && blackWithdrawn
                ? '0-0'
                : pairing.result;

    return (
        <TableRow>
            {round && (
                <TableCell align='center'>
                    <Typography>{round}</Typography>
                </TableCell>
            )}
            <TableCell align='center'>
                <Typography>
                    {whiteWithdrawn
                        ? t.rich('byeWithdrew', {
                              player: () => White,
                          })
                        : White}
                </Typography>
            </TableCell>
            <TableCell align='center'>
                <Typography>
                    {blackWithdrawn
                        ? t.rich('byeWithdrew', {
                              player: () => Black,
                          })
                        : Black}
                </Typography>
            </TableCell>
            <TableCell align='center'>
                <Typography>
                    {pairing.url ? <Link href={pairing.url}>{result}</Link> : result}
                </Typography>
            </TableCell>
        </TableRow>
    );
}
