import { Link } from '@/components/navigation/Link';
import { OpenClassical, OpenClassicalPairing, OpenClassicalPlayer } from '@/database/tournament';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import { OpenInNew, Warning } from '@mui/icons-material';
import { Stack, Tooltip } from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { SiLichess } from 'react-icons/si';

export function PlayerCell({ player }: { player: OpenClassicalPlayer }) {
    const t = useTranslations('tournaments.openClassical.pairings');

    if (player.lichessUsername === 'No Opponent' || player.lichessUsername === '') {
        return (
            <Stack
                sx={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 1,
                }}
            >
                {t('noOpponent')}
            </Stack>
        );
    }

    return (
        <Stack
            sx={{
                my: 1,
                alignItems: 'center',
                gap: 0.5,
            }}
        >
            <Link href={`/profile/${player.username}`}>{player.displayName}</Link>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <SiLichess width={20} height={20} />
                <Link
                    href={`https://lichess.org/@/${player.lichessUsername}`}
                    target='_blank'
                    rel='noopener'
                >
                    {player.lichessUsername}
                </Link>
            </Stack>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    gap: 1,
                }}
            >
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

export function getPairingTableColumns(
    t: (key: string) => string,
): GridColDef<OpenClassicalPairing>[] {
    return [
        {
            field: 'white',
            headerName: t('headerWhite'),
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
            headerName: t('headerBlack'),
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
            headerName: t('headerResult'),
            flex: 0.5,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<OpenClassicalPairing, string>) => {
                if (params.value === '*' || params.value === '' || params.row.verified) {
                    return (
                        <Stack
                            sx={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 1,
                            }}
                        >
                            {params.value}
                        </Stack>
                    );
                }
                return (
                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 1,
                        }}
                    >
                        <div>{params.value}</div>
                        <Tooltip title={t('unverifiedResultTooltip')}>
                            <Warning color='warning' fontSize='small' />
                        </Tooltip>
                    </Stack>
                );
            },
        },
        {
            field: 'gameUrl',
            headerName: t('headerGame'),
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
                        <Stack
                            sx={{
                                height: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
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
}

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
    const t = useTranslations('tournaments.openClassical.pairings');
    const columns = useMemo(() => getPairingTableColumns(t), [t]);
    const pairings =
        openClassical.sections[`${region}_${ratingRange}`]?.rounds[round - 1]?.pairings ?? [];

    return (
        <DataGridPro
            columns={columns}
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
