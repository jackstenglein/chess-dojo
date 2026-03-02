'use client';

import { useNotifications } from '@/api/cache/Cache';
import GameTable from '@/components/games/list/GameTable';
import { ListItemContextMenu } from '@/components/games/list/ListItemContextMenu';
import { GameInfo } from '@/database/game';
import { useDataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { NotificationTypes } from '@jackstenglein/chess-dojo-common/src/database/notification';
import { Container } from '@mui/material';

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

    const onClick = ({ cohort, id }: GameInfo, event: React.MouseEvent) => {
        const url = `/games/${cohort.replaceAll('+', '%2B')}/${id.replaceAll('?', '%3F')}`;
        if (event.shiftKey) {
            window.open(url, '_blank');
        } else {
            router.push(url);
        }
    };

    const games = (notification.explorerGameMetadata as unknown as GameInfo[]) ?? [];
    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <GameTable
                namespace='notifications'
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
                onRowClick={(params, event) => onClick(params.row, event)}
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
