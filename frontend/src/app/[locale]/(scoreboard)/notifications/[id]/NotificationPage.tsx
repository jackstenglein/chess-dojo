'use client';

import { useNotifications } from '@/api/cache/Cache';
import {
    RenderCohort,
    RenderGameResultStack,
    RenderPlayersCell,
    RenderTimeControl,
    formatMoves,
} from '@/components/games/list/GameListItem';
import GameTable, { gameTableColumns } from '@/components/games/list/GameTable';
import { ListItemContextMenu } from '@/components/games/list/ListItemContextMenu';
import { Link } from '@/components/navigation/Link';
import { GameInfo } from '@/database/game';
import { useDataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { NotificationTypes } from '@jackstenglein/chess-dojo-common/src/database/notification';
import { Box, Container } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import type { ReactNode } from 'react';

function renderGameLinkCell(
    row: GameInfo,
    child: ReactNode,
    justifyContent: 'flex-start' | 'center' = 'flex-start',
) {
    const href = `/games/${encodeURIComponent(row.cohort)}/${encodeURIComponent(row.id)}`;

    return (
        <Box sx={{ width: 1, height: 1 }} onClick={(e) => e.stopPropagation()}>
            <Link
                href={href}
                underline='none'
                color='inherit'
                sx={{
                    width: 1,
                    height: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent,
                }}
            >
                {child}
            </Link>
        </Box>
    );
}

const notificationColumns: GridColDef<GameInfo>[] = gameTableColumns.map((col) => {
    switch (col.field) {
        case 'cohort':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(params.row, RenderCohort(params.row), 'center'),
            };

        case 'result':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(
                        params.row,
                        <RenderGameResultStack result={params.row.headers.Result} />,
                        'center',
                    ),
            };

        case 'players':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(params.row, RenderPlayersCell(params)),
            };

        case 'timeControl':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(
                        params.row,
                        RenderTimeControl({ timeControl: params.row.headers.TimeControl }),
                        'center',
                    ),
            };

        case 'moves':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(
                        params.row,
                        <Box sx={{ width: 1, textAlign: 'center' }}>
                            {formatMoves(params.row.headers?.PlyCount)}
                        </Box>,
                        'center',
                    ),
            };
        case 'date':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(
                        params.row,
                        <Box sx={{ width: 1, textAlign: 'right' }}>{params.value ?? ''}</Box>,
                        'flex-start',
                    ),
            };

        case 'publishedAt':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(
                        params.row,
                        <Box sx={{ width: 1, textAlign: 'right' }}>
                            {params.formattedValue ?? params.value ?? ''}
                        </Box>,
                        'flex-start',
                    ),
            };

        case 'updatedAt':
            return {
                ...col,
                renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
                    renderGameLinkCell(
                        params.row,
                        <Box sx={{ width: 1 }}>
                            {col.renderCell ? col.renderCell(params) : (params.value ?? '')}
                        </Box>,
                        'flex-start',
                    ),
            };

        default:
            return col;
    }
});

export function NotificationPage({ id }: { id: string }) {
    const { notifications, request } = useNotifications();
    const contextMenu = useDataGridContextMenu();
    const router = useRouter();

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const notification = notifications.find((n) => n.id === id);
    if (notification?.type !== NotificationTypes.EXPLORER_GAME) {
        router.push('/notifications');
        return null;
    }

    const onClick = ({ cohort, id }: GameInfo) => {
        const url = `/games/${encodeURIComponent(cohort)}/${encodeURIComponent(id)}`;
        router.push(url);
    };

    const games = (notification.explorerGameMetadata as unknown as GameInfo[]) ?? [];
    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <GameTable
                namespace='notifications'
                columns={notificationColumns}
                pagination={{
                    data: games,
                    request,
                    page: 0,
                    pageSize: notification.explorerGameMetadata?.length ?? 0,
                    rowCount: notification.explorerGameMetadata?.length ?? 0,
                    hasMore: false,
                    setPage: noop,
                    setPageSize: noop,
                    setGames: noop,
                    onSearch: noop,
                    onDelete: noop,
                }}
                onRowClick={(params) => onClick(params.row)}
                contextMenu={contextMenu}
            />
            <ListItemContextMenu
                games={contextMenu.rowIds
                    .map((id) => games.find((g) => g.id === id))
                    .filter((g) => !!g)}
                onClose={contextMenu.close}
                position={contextMenu.position}
            />
        </Container>
    );
}

function noop() {
    return null;
}
