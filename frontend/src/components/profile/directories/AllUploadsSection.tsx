import { useApi } from '@/api/Api';
import { RequestSnackbar } from '@/api/Request';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { NavigationMenu } from '@/components/directories/navigation/NavigationMenu';
import { BulkGameEditor } from '@/components/games/list/BulkGameEditor';
import GameTable, { getOpenGame } from '@/components/games/list/GameTable';
import { ListItemContextMenu } from '@/components/games/list/ListItemContextMenu';
import { RequirementCategory } from '@/database/requirement';
import { useDataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { usePagination } from '@/hooks/usePagination';
import { useRouter } from '@/hooks/useRouter';
import Icon from '@/style/Icon';
import UpsellAlert from '@/upsell/UpsellAlert';
import { ALL_MY_UPLOADS_DIRECTORY_ID } from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Button, Stack } from '@mui/material';
import { GridPaginationModel, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { DirectoryBreadcrumbs } from './DirectoryBreadcrumbs';

/**
 * Renders a table of all uploaded games for the given user.
 */
export function AllUploadsSection({
    username,
    enableNavigationMenu,
    defaultNavigationMenuOpen,
    isMobile,
    namespace,
}: {
    /** The username to get uploaded games for. */
    username: string;
    /** Whether to enable the navigation menu. */
    enableNavigationMenu: boolean;
    /** Whether to default the navigation menu to open. */
    defaultNavigationMenuOpen?: boolean;
    /** Whether the current render should use the mobile layout */
    isMobile: boolean;
    /** The namespace for the local storage data. */
    namespace: string;
}) {
    const t = useTranslations('profile.directories');
    const api = useApi();
    const { user: currentUser } = useAuth();
    const isFreeTier = useFreeTier();
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
        type: 'include',
        ids: new Set(),
    });
    const contextMenu = useDataGridContextMenu(rowSelectionModel);
    const router = useRouter();

    const searchByOwner = useCallback(
        (startKey: string) => api.listGamesByOwner(username, startKey),
        [api, username],
    );

    const pagination = usePagination(searchByOwner, 0, 10);
    const { request, data, pageSize, setPageSize, setGames } = pagination;

    const onPaginationModelChange = (model: GridPaginationModel) => {
        if (model.pageSize !== pageSize) {
            setPageSize(model.pageSize);
        }
    };

    const onSubmit = () => {
        router.push('/games/import');
    };

    return (
        <Stack
            direction={isMobile ? 'column' : 'row'}
            sx={{
                columnGap: 2,
            }}
        >
            <RequestSnackbar request={request} />

            <NavigationMenu
                namespace={namespace}
                id={ALL_MY_UPLOADS_DIRECTORY_ID}
                owner={username}
                enabled={enableNavigationMenu}
                defaultValue={defaultNavigationMenuOpen}
                horizontal={isMobile}
            />

            <Stack
                spacing={2}
                sx={{
                    alignItems: 'start',
                    flexGrow: 1,
                    minWidth: '0',
                    mt: isMobile ? 2 : 0,
                }}
            >
                <DirectoryBreadcrumbs
                    owner={username}
                    id={ALL_MY_UPLOADS_DIRECTORY_ID}
                    currentProfile={currentUser?.username}
                />

                {currentUser?.username === username && (
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            gap: 2,
                            width: 1,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Button
                            variant='contained'
                            onClick={onSubmit}
                            color='success'
                            startIcon={<Icon name={RequirementCategory.Games} />}
                        >
                            {t('analyzeGame')}
                        </Button>
                        <BulkGameEditor
                            games={[...rowSelectionModel.ids]
                                .map((id) => data.find((g) => g.id === id))
                                .filter((g) => !!g)}
                            onClear={() =>
                                setRowSelectionModel({ type: 'include', ids: new Set() })
                            }
                            setGames={setGames}
                        />
                    </Stack>
                )}

                {isFreeTier && currentUser?.username !== username && (
                    <Stack
                        sx={{
                            alignItems: 'center',
                            mb: 5,
                        }}
                    >
                        <UpsellAlert>{t('freeTierGamesRestriction')}</UpsellAlert>
                    </Stack>
                )}

                {(!isFreeTier || currentUser?.username === username) && (
                    <GameTable
                        namespace='games-profile-tab'
                        pagination={pagination}
                        onPaginationModelChange={onPaginationModelChange}
                        onRowClick={getOpenGame(router)}
                        contextMenu={contextMenu}
                        defaultVisibility={{
                            publishedAt: false,
                            cohort: false,
                            owner: false,
                            unlisted: currentUser?.username === username,
                        }}
                        checkboxSelection={currentUser?.username === username}
                        checkboxSelectionVisibleOnly
                        onRowSelectionModelChange={setRowSelectionModel}
                        rowSelectionModel={rowSelectionModel}
                    />
                )}

                <ListItemContextMenu
                    games={contextMenu.rowIds
                        .map((id) => data.find((g) => g.id === id))
                        .filter((g) => !!g)}
                    onClose={contextMenu.close}
                    position={contextMenu.position}
                    setGames={setGames}
                    allowEdits
                />
            </Stack>
        </Stack>
    );
}
