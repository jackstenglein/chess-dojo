import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { RenderGameResultStack, RenderPlayers } from '@/components/games/list/GameListItem';
import { Link } from '@/components/navigation/Link';
import { MastersCohort, MastersOwnerDisplayName } from '@/database/game';
import { dojoCohorts } from '@/database/user';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    DirectoryItem,
    DirectoryItemType,
    DirectoryItemTypes,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Folder, Visibility, VisibilityOff } from '@mui/icons-material';
import { Badge, Stack, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';

export const publicColumns: GridColDef<DirectoryItem>[] = [
    {
        field: 'type',
        headerName: 'Type',
        valueGetter(_value, row) {
            if (row.type === DirectoryItemTypes.DIRECTORY) {
                return -1;
            }
            if (row.metadata.cohort === MastersCohort) {
                return 2500;
            }
            return parseInt(row.metadata.cohort);
        },
        renderCell(params: GridRenderCellParams<DirectoryItem, DirectoryItemType>) {
            const item = params.row;

            if (item.type === DirectoryItemTypes.DIRECTORY) {
                return (
                    <Badge
                        badgeContent={item.metadata.gameCount}
                        color='secondary'
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}
                    >
                        <Folder sx={{ height: 1 }} />
                    </Badge>
                );
            }

            let value = item.metadata.cohort;
            if (value && value !== dojoCohorts[0] && value !== dojoCohorts.slice(-1)[0]) {
                value = value.replace('00', '');
            }

            return (
                <Stack sx={{ height: 1 }} alignItems='center' justifyContent='center'>
                    <CohortIcon
                        cohort={item.metadata.cohort}
                        tooltip={item.metadata.cohort}
                        size={30}
                    />
                    <Typography variant='caption' sx={{ fontSize: '0.65rem' }}>
                        {item.metadata.cohort === MastersCohort ? 'masters' : value}
                    </Typography>
                </Stack>
            );
        },
        align: 'center',
        headerAlign: 'center',
        width: 52,
        disableColumnMenu: true,
        resizable: false,
    },
    {
        field: 'name',
        headerName: 'Name',
        valueGetter: (_value, row) => {
            switch (row.type) {
                case DirectoryItemTypes.DIRECTORY:
                    return row.metadata.name;
            }
            return `${row.metadata.white} ${row.metadata.black}`;
        },
        renderCell: (params: GridRenderCellParams<DirectoryItem, string>) => {
            const item = params.row;
            if (item.type === DirectoryItemTypes.DIRECTORY) {
                return (
                    <Stack sx={{ height: 1, justifyContent: 'center', rowGap: '2px' }}>
                        <Link color='inherit' sx={{ cursor: 'pointer', lineHeight: 'initial' }}>
                            {params.value}
                        </Link>
                        {item.metadata.description && (
                            <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{
                                    lineHeight: 'initial',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                }}
                            >
                                {item.metadata.description}
                            </Typography>
                        )}
                    </Stack>
                );
            }

            return RenderPlayers({ ...item.metadata, fullHeight: true });
        },
        flex: 1,
    },
    {
        field: 'result',
        headerName: 'Result',
        headerAlign: 'center',
        valueGetter: (_value, row) => {
            switch (row.type) {
                case DirectoryItemTypes.DIRECTORY:
                    return '';
                default:
                    return row.metadata.result;
            }
        },
        renderCell: (params) => {
            if (params.row.type === DirectoryItemTypes.DIRECTORY) {
                return null;
            }
            return <RenderGameResultStack result={params.row.metadata.result} />;
        },
        width: 50,
        disableColumnMenu: true,
        flex: 0.25,
    },
    {
        field: 'owner',
        headerName: 'Owner',
        valueGetter: (_value, row) => {
            switch (row.type) {
                case DirectoryItemTypes.DIRECTORY:
                    return '';
                default:
                    return row.metadata.owner;
            }
        },
        renderCell: (params: GridRenderCellParams<DirectoryItem, string>) => {
            const item = params.row;
            if (
                item.type === DirectoryItemTypes.DIRECTORY ||
                item.metadata.ownerDisplayName === ''
            ) {
                return null;
            }

            if (item.metadata.ownerDisplayName === MastersOwnerDisplayName) {
                return MastersOwnerDisplayName;
            }

            return (
                <Stack
                    direction='row'
                    spacing={1}
                    alignItems='center'
                    onClick={(e) => e.stopPropagation()}
                >
                    <Avatar
                        username={item.metadata.owner}
                        displayName={item.metadata.ownerDisplayName}
                        size={32}
                    />
                    <Link href={`/profile/${item.metadata.owner}`}>
                        {item.metadata.ownerDisplayName}
                    </Link>
                </Stack>
            );
        },
        flex: 0.5,
    },
    {
        field: 'createdAt',
        headerName: 'Date Created',
        valueGetter: (_value, row) => row.metadata.createdAt,
        renderCell(params: GridRenderCellParams<DirectoryItem, string>) {
            return <DirectoryCreatedAt createdAt={params.value} />;
        },
        width: 110,
        align: 'center',
    },
];

export const adminColumns: GridColDef<DirectoryItem>[] = [
    ...publicColumns.slice(0, 2),
    {
        field: 'visibility',
        headerName: 'Visibility',
        headerAlign: 'center',
        valueGetter: (_value, row) => {
            switch (row.type) {
                case DirectoryItemTypes.DIRECTORY:
                    return row.metadata.visibility;
                default:
                    return row.metadata.unlisted
                        ? DirectoryVisibility.PRIVATE
                        : DirectoryVisibility.PUBLIC;
            }
        },
        renderCell: (params) => {
            let isPublic = false;
            if (params.row.type === DirectoryItemTypes.DIRECTORY) {
                isPublic = params.row.metadata.visibility === DirectoryVisibility.PUBLIC;
            } else {
                isPublic = !params.row.metadata.unlisted;
            }

            return (
                <Stack width={1} height={1} alignItems='center' justifyContent='center'>
                    <Tooltip
                        title={
                            isPublic
                                ? 'Public'
                                : params.row.type === DirectoryItemTypes.DIRECTORY
                                  ? 'Private'
                                  : 'Unlisted'
                        }
                    >
                        {isPublic ? (
                            <Visibility sx={{ color: 'text.secondary' }} />
                        ) : (
                            <VisibilityOff sx={{ color: 'text.secondary' }} />
                        )}
                    </Tooltip>
                </Stack>
            );
        },
        width: 50,
        disableColumnMenu: true,
        flex: 0.25,
    },
    ...publicColumns.slice(2),
];

export function DirectoryCreatedAt({ createdAt }: { createdAt?: string }) {
    const { user } = useAuth();

    if (!createdAt) {
        return null;
    }

    const d = new Date(createdAt);
    const date = toDojoDateString(d, user?.timezoneOverride);
    const time = toDojoTimeString(d, user?.timezoneOverride, user?.timeFormat);

    return (
        <Tooltip title={`${date} • ${time}`}>
            <span>{date}</span>
        </Tooltip>
    );
}
