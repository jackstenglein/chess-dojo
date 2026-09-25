import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useReconcile } from '@/board/Board';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import { GameInfo } from '@/database/game';
import { DataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { CircularProgress, Menu, MenuItem } from '@mui/material';
import { useTranslations } from 'next-intl';
import { citeGame, gameUrl, insertGame } from './gameActions';

export function GameContextMenu({
    source,
    menu,
}: {
    source?: GameInfo;
    menu: DataGridContextMenu;
}) {
    const { chess } = useChess();
    const { isOwner, unsaved } = useGame();
    const canEdit = !!chess && !!(isOwner || unsaved);
    const api = useApi();
    const reconcile = useReconcile();
    const t = useTranslations('analysisBoard.explorer.gameActions');
    const request = useRequest<string>();
    const loading = request.isLoading();

    const insert = async () => {
        if (!source || !chess || !canEdit) return;
        request.onStart();
        try {
            const response = await api.getGame(source.cohort, source.id);
            try {
                insertGame(chess, response.data.pgn, response.data, window.location.origin);
            } catch {
                request.onFailure({ message: t('invalidSource') });
                return;
            }
            reconcile();
            request.onSuccess(t('inserted'));
        } catch (error) {
            request.onFailure(error);
        } finally {
            menu.close();
        }
    };

    const cite = () => {
        if (!source || !chess) return;
        citeGame(chess, source, window.location.origin);
        reconcile();
        menu.close();
        request.onSuccess(t('cited'));
    };

    return (
        <>
            {source && menu.position && (
                <Menu
                    open
                    onClose={menu.close}
                    anchorReference='anchorPosition'
                    anchorPosition={menu.position}
                    slotProps={{
                        root: {
                            onContextMenu: (event: React.MouseEvent) => {
                                event.preventDefault();
                                menu.close();
                            },
                        },
                    }}
                >
                    {canEdit && (
                        <MenuItem disabled={loading} onClick={() => void insert()}>
                            {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
                            {t('insert')}
                        </MenuItem>
                    )}
                    {canEdit && (
                        <MenuItem disabled={loading} onClick={cite}>
                            {t('cite')}
                        </MenuItem>
                    )}
                    <MenuItem
                        onClick={() => {
                            window.open(gameUrl(source), '_blank', 'noopener');
                            menu.close();
                        }}
                    >
                        {t('open')}
                    </MenuItem>
                </Menu>
            )}
            <RequestSnackbar request={request} showSuccess />
        </>
    );
}
