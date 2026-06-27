import { Link } from '@/components/navigation/Link';
import { OpenClassical, OpenClassicalPlayer } from '@/database/tournament';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface EntrantsTableProps {
    openClassical?: OpenClassical;
    region: string;
    ratingRange: string;
}

const EntrantsTable: React.FC<EntrantsTableProps> = ({ openClassical, region, ratingRange }) => {
    const t = useTranslations('tournaments.openClassical.entrants');

    const columns = useMemo<GridColDef<OpenClassicalPlayer>[]>(
        () => [
            {
                field: 'displayName',
                headerName: t('columnName'),
                flex: 1,
                renderCell(params) {
                    return <Link href={`/profile/${params.row.username}`}>{params.value}</Link>;
                },
            },
            {
                field: 'lichessUsername',
                headerName: t('columnLichess'),
                flex: 1,
                renderCell(params) {
                    return (
                        <Link
                            href={`https://lichess.org/@/${params.value}`}
                            target='_blank'
                            rel='noopener'
                        >
                            {params.value}
                        </Link>
                    );
                },
            },
            {
                field: 'discordUsername',
                headerName: t('columnDiscord'),
                flex: 1,
                renderCell(params) {
                    return (
                        <Link
                            href={`https://discord.com/users/${params.row.discordId}`}
                            target='_blank'
                            rel='noopener'
                        >
                            {params.value}
                        </Link>
                    );
                },
            },
            {
                field: 'rating',
                headerName: t('columnRating'),
            },
        ],
        [t],
    );

    const rows = useMemo(() => {
        if (!openClassical) {
            return [];
        }
        const section = openClassical.sections[`${region}_${ratingRange}`];
        if (!section) {
            return [];
        }

        return Object.values(section.players);
    }, [openClassical, region, ratingRange]);

    if (!openClassical) {
        return null;
    }

    return (
        <DataGridPro
            getRowId={(player) => player.username}
            rows={rows}
            columns={columns}
            autoHeight
            initialState={{
                sorting: {
                    sortModel: [{ field: 'rating', sort: 'desc' }],
                },
            }}
        />
    );
};

export default EntrantsTable;
