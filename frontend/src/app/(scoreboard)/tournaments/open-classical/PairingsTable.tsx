import { Link } from '@/components/navigation/Link';
import { OpenClassical, OpenClassicalPairing, OpenClassicalPlayer } from '@/database/tournament';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import { OpenInNew, Warning } from '@mui/icons-material';
import { Stack, Tooltip } from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { SiLichess } from 'react-icons/si';

export function PlayerCell({ player }: { player: OpenClassicalPlayer }) {
    const t = useTranslations('tournaments.openClassical.pairings');

    if (player.lichessUsername === 'No Opponent' || player.lichessUsername === '') {
        return (
            <Stack alignItems='center' justifyContent='center' height={1}>
                {t('noOpponent')}
            </Stack>
        );
    }

    return (
        <Stack my={1} alignItems='center' gap={0.5}>
            <Link href={`/profile/${player.username}`}>{player.displayName}</Link>
            <Stack direction='row' alignItems='center' gap={1}>
                <SiLichess width={20} height={20} />
                <Link
                    href={`https://lichess.org/@/${player.lichessUsername}`}
                    target='_blank'
                    rel='noopener'
                >
                    {player.lichessUsername}
                </Link>
            </Stack>
            <Stack direction='row' alignItems='center' gap={1}>
                <DiscordIcon sx={{ color: '#5865f2' }} />
                <Link
                    href={
                        player.discordId
                            ? `https://discord.com/users/${player.discordId}`
                            : undefined
                    }
                    target='_blank'
                    rel='noopener'
                >
                    {player.discordUsername}
                </Link>
            </Stack>
        </Stack>
    );
}

export const pairingTableColumns: GridColDef<OpenClassicalPairing>[] = [
    {
        field: 'white',
        headerName: 'White',
        headerAlign: 'center',
        valueGetter: (_value, row) =>
            `${row.white.displayName} ${row.white.lichessUsername} ${row.white.discordUsername}`,
        flex: 1,
        renderCell(params) {
            return <PlayerCell player={params.row.white} />;
        },
    },
    {
        field: 'black',
        headerName: 'Black',
        headerAlign: 'center',
        valueGetter: (_value, row) =>
            `${row.black.displayName} ${row.black.lichessUsername} ${row.black.discordUsername}`,
        flex: 1,
        renderCell(params) {
            return <PlayerCell player={params.row.black} />;
        },
    },
    {
        field: 'result',
        headerName: 'Result',
        flex: 0.5,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<OpenClassicalPairing, string>) => {
            if (params.value === '*' || params.value === '' || params.row.verified) {
                return (
                    <Stack alignItems='center' justifyContent='center' height={1}>
                        {params.value}
                    </Stack>
                );
            }
            return (
                <Stack
                    direction='row'
                    alignItems='center'
                    justifyContent='center'
                    spacing={1}
                    height={1}
                >
                    <div>{params.value}</div>
                    <Tooltip title='This result has not been verified and may be changed later by the TD'>
                        <Warning color='warning' fontSize='small' />
                    </Tooltip>
                </Stack>
            );
        },
    },
    {
        field: 'gameUrl',
        headerName: 'Game',
        width: 75,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<OpenClassicalPairing, string>) => {
            if (
                params.value &&
                (params.value.startsWith('https://lichess.org/') ||
                    params.value.startsWith('https://www.chess.com/'))
            ) {
                return (
                    <Stack height={1} alignItems='center' justifyContent='center'>
                        <a target='_blank' rel='noopener noreferrer' href={params.value}>
                            <OpenInNew color='primary' fontSize='small' />
                        </a>
                    </Stack>
                );
            }
            return null;
        },
    },
];

export interface PairingsTableProps {
    openClassical: OpenClassical;
    region: string;
    ratingRange: string;
    round: number;
}

const PairingsTable: React.FC<PairingsTableProps> = ({
    openClassical,
    region,
    ratingRange,
    round,
}) => {
    const pairings =
        openClassical.sections[`${region}_${ratingRange}`]?.rounds[round - 1]?.pairings ?? [];

    return (
        <DataGridPro
            columns={pairingTableColumns}
            rows={pairings}
            getRowId={(pairing) =>
                `${pairing.white.lichessUsername}-${pairing.black.lichessUsername}`
            }
            getRowHeight={() => 'auto'}
            autoHeight
        />
    );
};

export default PairingsTable;
