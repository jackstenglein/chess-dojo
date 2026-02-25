import NotFoundPage from '@/NotFoundPage';
import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { NavigationMenu } from '@/components/directories/navigation/NavigationMenu';
import { GameCell } from '@/components/games/list/GameListItem';
import { PAGE_SIZE_OPTIONS } from '@/components/ui/pagination';
import { GameResult } from '@/database/game.ts';
import { useDataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import {
    ALL_MY_UPLOADS_DIRECTORY_ID,
    compareRoles,
    DirectoryAccessRole,
    DirectoryItem,
    DirectoryItemTypes,
    DirectoryVisibility,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Folder, Visibility, VisibilityOff } from '@mui/icons-material';
import { Badge, Grid, Stack, SxProps, Typography, useMediaQuery } from '@mui/material';
import {
    DataGridPro,
    GridColumnVisibilityModel,
    GridDensity,
    GridListViewColDef,
    GridRenderCellParams,
    GridRowHeightParams,
    GridRowOrderChangeParams,
    GridRowParams,
    GridRowSelectionModel,
    GridSortModel,
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
} from '@mui/x-data-grid-pro';
import React, { useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { AddButton } from './AddButton';
import { AllUploadsSection } from './AllUploadsSection';
import { BulkItemEditor } from './BulkItemEditor';
import { ContextMenu } from './ContextMenu';
import { DirectoryBreadcrumbs } from './DirectoryBreadcrumbs';
import { useDirectory } from './DirectoryCache';
import { adminColumns, DirectoryCreatedAt, publicColumns } from './DirectoryGridColumns';
import { ShareButton } from './share/ShareButton';
import { StatsButton } from './stats/StatsButton';

interface DirectoriesSectionProps {
    /** The namespace for the local storage data. */
    namespace: string;

    /** The default directory owner if not specified in query params. */
    defaultDirectoryOwner: string;

    /** Whether to enable the navigation menu. */
    enableNavigationMenu: boolean;

    /** Whether to default the navigation menu to open. */
    defaultNavigationMenuOpen?: boolean;

    /** The default column visibility, if the user has not changed any settings. */
    defaultColumnVisibility?: Record<string, boolean>;

    isMobile?: boolean;

    /** The sx prop passed to the DataGrid component. */
    sx?: SxProps;
}

export const DirectoriesSection = (props: DirectoriesSectionProps) => {
    const { searchParams } = useNextSearchParams({ directory: 'home' });
    const directoryId = searchParams.get('directory') || 'home';
    const directoryOwner = searchParams.get('directoryOwner') || props.defaultDirectoryOwner;
    const isMobile = useMediaQuery('(max-width:800px)');

    if (directoryId === ALL_MY_UPLOADS_DIRECTORY_ID) {
        return (
            <AllUploadsSection
                namespace={props.namespace}
                username={directoryOwner}
                enableNavigationMenu={props.enableNavigationMenu}
                defaultNavigationMenuOpen={props.defaultNavigationMenuOpen}
                isMobile={isMobile}
            />
        );
    }

    return <DirectorySection isMobile={isMobile} {...props} />;
};

const DirectorySection = ({
    namespace,
    defaultDirectoryOwner,
    enableNavigationMenu,
    defaultNavigationMenuOpen,
    defaultColumnVisibility,
    isMobile,
    sx,
}: DirectoriesSectionProps) => {
    const api = useApi();
    const { searchParams, updateSearchParams } = useNextSearchParams({
        directory: 'home',
    });
    const router = useRouter();

    const [columnVisibility, setColumnVisibility] = useLocalStorage<GridColumnVisibilityModel>(
        `/DirectoryTable/${namespace}/visibility`,
        {
            type: true,
            name: true,
            result: true,
            ...(defaultColumnVisibility ?? {}),
        },
    );
    const [density, setDensity] = useLocalStorage<GridDensity>(
        `/DirectoryTable/density`,
        'standard',
    );

    const [sortModel, setSortModel] = useLocalStorage<GridSortModel>(
        `/DirectoriesSection/${namespace}/sortModel`,
        [
            {
                field: 'createdAt',
                sort: 'desc',
            },
        ],
    );

    const directoryId = searchParams.get('directory') || 'home';
    const directoryOwner = searchParams.get('directoryOwner') || defaultDirectoryOwner;

    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
        type: 'include',
        ids: new Set(),
    });
    const contextMenu = useDataGridContextMenu(rowSelectionModel);

    const { directory, accessRole, request, putDirectory } = useDirectory(
        directoryOwner,
        directoryId,
    );
    const reorderRequest = useRequest();

    const rows = useMemo(() => {
        const seen = new Set<string>();
        return (
            (directory?.itemIds
                .filter((id) => {
                    const result = !seen.has(id);
                    seen.add(id);
                    return result;
                })
                .map((id) => {
                    const item = directory.items[id];
                    if (!item) {
                        return undefined;
                    }

                    return {
                        ...item,
                        __reorder__:
                            item.type === DirectoryItemTypes.DIRECTORY
                                ? item.metadata.name
                                : `${item.metadata.white} - ${item.metadata.black}`,
                    };
                })
                .filter((item) => Boolean(item)) as DirectoryItem[]) ?? []
        );
    }, [directory]);

    if (!directory && (!request.isSent() || request.isLoading())) {
        return <LoadingPage />;
    }

    if (!directory) {
        return <NotFoundPage />;
    }

    const onClickRow = (params: GridRowParams<DirectoryItem>, event: React.MouseEvent) => {
        if (params.row.type === DirectoryItemTypes.DIRECTORY) {
            updateSearchParams({
                directory: params.row.id,
                directoryOwner:
                    directory.id === SHARED_DIRECTORY_ID
                        ? (params.row.addedBy ?? directory.owner)
                        : directory.owner,
            });
            setRowSelectionModel({ type: 'include', ids: new Set() });
        } else {
            const url = `/games/${params.row.metadata.cohort.replaceAll('+', '%2B')}/${params.row.metadata.id.replaceAll(
                '?',
                '%3F',
            )}?directory=${directory.id}&directoryOwner=${directory.owner}`;
            if (event.shiftKey) {
                window.open(url, '_blank');
            } else {
                router.push(url);
            }
        }
    };

    const handleRowOrderChange = (params: GridRowOrderChangeParams) => {
        const newIds = rows.map((row) => row.id);
        const id = newIds.splice(params.oldIndex, 1)[0];
        newIds.splice(params.targetIndex, 0, id);

        api.updateDirectory({
            owner: directory.owner,
            id: directory.id,
            itemIds: newIds,
        })
            .then((resp) => {
                putDirectory(resp.data.directory);
            })
            .catch((err) => {
                reorderRequest.onFailure(err);
            });
    };

    const isEditor =
        compareRoles(DirectoryAccessRole.Editor, accessRole) && directoryId !== SHARED_DIRECTORY_ID;
    const isAdmin = compareRoles(DirectoryAccessRole.Admin, accessRole);

    return (
        <Stack direction={isMobile ? 'column' : 'row'} columnGap={2}>
            <NavigationMenu
                namespace={namespace}
                id={directoryId}
                owner={directoryOwner}
                enabled={enableNavigationMenu}
                defaultValue={defaultNavigationMenuOpen}
                horizontal={isMobile}
            />

            <Stack spacing={2} alignItems='start' flexGrow={1} mt={isMobile ? 2 : 0}>
                <DirectoryBreadcrumbs
                    owner={directoryOwner}
                    id={directoryId}
                    currentProfile={defaultDirectoryOwner}
                />

                {isEditor && (
                    <Stack direction='row' alignItems='center' gap={2} width={1} flexWrap='wrap'>
                        <AddButton directory={directory} accessRole={accessRole} />
                        <ShareButton directory={directory} accessRole={accessRole} />
                        <StatsButton directory={directory} />

                        <BulkItemEditor
                            directory={directory}
                            itemIds={[...rowSelectionModel.ids] as string[]}
                            accessRole={accessRole}
                            onClear={() =>
                                setRowSelectionModel({ type: 'include', ids: new Set() })
                            }
                        />
                    </Stack>
                )}

                <DataGridPro
                    autoHeight
                    listViewColumn={listViewColDef}
                    listView={isMobile}
                    rows={rows}
                    columns={isAdmin ? adminColumns : publicColumns}
                    columnVisibilityModel={columnVisibility}
                    onColumnVisibilityModelChange={(model) => setColumnVisibility(model)}
                    density={density}
                    onDensityChange={(d) => setDensity(d)}
                    onRowClick={onClickRow}
                    loading={!directory && request.isLoading()}
                    slots={{
                        toolbar: CustomGridToolbar,
                    }}
                    slotProps={{
                        root: { 'data-cy': 'directories-data-grid' },
                        row: isEditor
                            ? {
                                  onContextMenu: contextMenu.open,
                              }
                            : undefined,
                    }}
                    initialState={{
                        density: 'standard',
                        pagination: {
                            paginationModel: { pageSize: 10 },
                        },
                    }}
                    sortModel={sortModel}
                    onSortModelChange={(newSortModel) => {
                        setSortModel(newSortModel);
                    }}
                    getRowHeight={isMobile ? getRowHeightMobile : getRowHeight}
                    checkboxSelection={isEditor}
                    checkboxSelectionVisibleOnly
                    disableRowSelectionOnClick
                    onRowSelectionModelChange={setRowSelectionModel}
                    rowSelectionModel={rowSelectionModel}
                    rowReordering={isAdmin && !isMobile}
                    onRowOrderChange={handleRowOrderChange}
                    pagination
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    sx={{ width: 1, display: 'grid', ...sx }}
                    showToolbar={!isMobile}
                />

                <ContextMenu
                    directory={directory}
                    accessRole={accessRole}
                    itemIds={contextMenu.rowIds as string[]}
                    onClose={contextMenu.close}
                    position={contextMenu.position}
                />
            </Stack>
        </Stack>
    );
};

function ListViewCell(params: GridRenderCellParams<DirectoryItem>) {
    if (params.row.type !== DirectoryItemTypes.DIRECTORY) {
        return (
            <GameCell
                {...params.row.metadata}
                date={params.row.metadata.createdAt}
                headers={{
                    White: params.row.metadata.white,
                    Black: params.row.metadata.black,
                    WhiteElo: params.row.metadata.whiteElo ?? '',
                    BlackElo: params.row.metadata.blackElo ?? '',
                    Result: params.row.metadata.result as GameResult,
                }}
                showVisibility
            />
        );
    }

    return (
        <Stack height={1} justifyContent='center' py={1}>
            <Grid container columnSpacing={0.5}>
                <Grid size={1} display='flex' justifyContent='center'>
                    <Badge
                        badgeContent={params.row.metadata.gameCount || 0}
                        color='secondary'
                        sx={{
                            alignSelf: 'flex-start',
                            '& .MuiBadge-badge': {
                                fontSize: '0.65rem',
                                minWidth: 16,
                                height: 16,
                                ml: '4px',
                            },
                        }}
                        showZero
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    >
                        <Folder />
                    </Badge>
                </Grid>
                <Grid size={11}>
                    <Stack
                        direction='row'
                        flexWrap='wrap'
                        justifyContent='space-between'
                        alignItems='center'
                    >
                        <Stack gap={0.25}>
                            <Typography variant='body2'>{params.row.metadata.name}</Typography>
                            {params.row.metadata.description && (
                                <Typography variant='body2' color='text.secondary'>
                                    {params.row.metadata.description}
                                </Typography>
                            )}
                        </Stack>

                        {params.row.metadata.visibility === DirectoryVisibility.PUBLIC ? (
                            <Visibility sx={{ color: 'text.secondary' }} />
                        ) : (
                            <VisibilityOff sx={{ color: 'text.secondary' }} />
                        )}
                    </Stack>
                </Grid>

                <Grid size={1} />
                <Grid size={11} mt={0.25}>
                    <Typography variant='body2' color='text.secondary'>
                        Created <DirectoryCreatedAt createdAt={params.row.metadata.createdAt} />
                    </Typography>
                </Grid>
            </Grid>
        </Stack>
    );
}

const listViewColDef: GridListViewColDef = {
    field: 'listColumn',
    renderCell: ListViewCell,
};

function CustomGridToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarDensitySelector />
            <GridToolbarFilterButton />
        </GridToolbarContainer>
    );
}

function getRowHeight(params: GridRowHeightParams) {
    if (typeof params.id === 'string' && params.id.includes('/')) {
        return 70;
    }
}

function getRowHeightMobile(): number | 'auto' {
    return 'auto';
}
