import { useFreeTier } from '@/auth/Auth';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { ViewerDateString } from '@/components/ui/ViewerDateString';
import { GameInfo } from '@/database/game';
import { DataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { PaginationResult } from '@/hooks/usePagination';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Tooltip, useMediaQuery, useTheme } from '@mui/material';
import {
    DataGridPro,
    DataGridProProps,
    GridColDef,
    GridColumnVisibilityModel,
    GridListViewColDef,
    GridRenderCellParams,
    GridRowParams,
    GridSortModel,
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
    PaginationPropsOverrides,
    useGridApiRef,
} from '@mui/x-data-grid-pro';
import { useCallback, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
    formatMoves,
    formatPublishedAt,
    getPublishedAt,
    getTimeControl,
    ListViewCell,
    RenderCohort,
    RenderGameResultStack,
    RenderOwner,
    RenderPlayersCell,
    RenderRatingHeader,
    RenderTimeControl,
} from './GameListItem';

export const gameTableColumns: GridColDef<GameInfo>[] = [
    {
        field: 'cohort',
        headerName: 'Cohort',
        renderCell: (params: GridRenderCellParams<GameInfo, string>) => RenderCohort(params.row),
        align: 'center',
        headerAlign: 'center',
        width: 70,
    },
    {
        field: 'result',
        headerName: 'Result',
        valueGetter: (_value, row) => row.headers?.Result,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => <RenderGameResultStack result={params.row.headers.Result} />,
        width: 50,
    },
    {
        field: 'players',
        headerName: 'Players',
        valueGetter: (_value, row) => `${row.headers.White} ${row.headers.Black}`,
        renderCell: RenderPlayersCell,
        minWidth: 150,
        flex: 1,
    },
    {
        field: 'whiteRating',
        headerName: 'White Rating',
        renderHeader: () => <RenderRatingHeader white={true} />,
        valueGetter: (_value, row) => Number(row.headers?.WhiteElo) || '',
        headerAlign: 'center',
        align: 'center',
        width: 75,
    },
    {
        field: 'blackRating',
        headerName: 'Black Rating',
        renderHeader: () => <RenderRatingHeader white={false} />,
        valueGetter: (_value, row) => Number(row.headers?.BlackElo) || '',
        headerAlign: 'center',
        align: 'center',
        width: 75,
    },
    {
        field: 'timeControl',
        headerName: 'Time',
        renderCell: (params: GridRenderCellParams<GameInfo, string>) =>
            RenderTimeControl({ timeControl: params.row.headers.TimeControl }),
        valueGetter: (_, row) => getTimeControl({ timeControl: row.headers.TimeControl }),
        width: 75,
    },
    {
        field: 'moves',
        headerName: 'Moves',
        valueGetter: (_value, row) => formatMoves(row.headers?.PlyCount),
        align: 'center',
        headerAlign: 'center',
        width: 75,
    },
    {
        field: 'date',
        headerName: 'Played',
        align: 'right',
        headerAlign: 'right',
    },
    {
        field: 'publishedAt',
        headerName: 'Published',
        valueGetter: (_value, row) => getPublishedAt(row),
        valueFormatter: formatPublishedAt,
        align: 'right',
        headerAlign: 'right',
    },
    {
        field: 'updatedAt',
        headerName: 'Updated',
        renderCell: (params: GridRenderCellParams<GameInfo, string>) => (
            <ViewerDateString date={params.value} />
        ),
        align: 'center',
        headerAlign: 'center',
    },
    {
        field: 'owner',
        headerName: 'Uploaded By',
        renderCell: (params: GridRenderCellParams<GameInfo, string>) => RenderOwner(params.row),
        flex: 1,
    },
    {
        field: 'unlisted',
        headerName: 'Visibility',
        align: 'center',
        headerAlign: 'center',
        minWidth: 75,
        width: 75,
        renderCell: (params: GridRenderCellParams<GameInfo, string>) => {
            if (params.row.unlisted) {
                return (
                    <Tooltip title='Unlisted'>
                        <VisibilityOff sx={{ color: 'text.secondary', height: 1 }} />
                    </Tooltip>
                );
            }
            return (
                <Tooltip title='Public'>
                    <Visibility sx={{ color: 'text.secondary', height: 1 }} />
                </Tooltip>
            );
        },
    },
];

const listColDef: GridListViewColDef<GameInfo> = {
    field: 'listColumn',
    renderCell: ListViewCell,
};

interface GameTableProps extends Omit<
    DataGridProProps<GameInfo>,
    'columns' | 'rows' | 'pagination' | 'columnVisibilityModel' | 'onColumnVisibilityModelChange'
> {
    namespace: string;
    pagination: PaginationResult;
    contextMenu?: DataGridContextMenu;
    limitFreeTier?: boolean;
    columns?: GridColDef<GameInfo>[];
    defaultVisibility?: Record<string, boolean>;
    onRowClick?: (params: GridRowParams<GameInfo>, event: React.MouseEvent) => void;
}

export default function GameTable({
    namespace,
    pagination,
    onPaginationModelChange,
    onRowClick,
    contextMenu,
    limitFreeTier,
    columns,
    defaultVisibility,
    ...dataGridProps
}: GameTableProps) {
    const apiRef = useGridApiRef();
    const freeTierLimited = useFreeTier() && limitFreeTier;
    const { data, request, page, pageSize, rowCount, hasMore, setPage, setPageSize } = pagination;
    const [columnVisibility, setColumnVisibility] = useLocalStorage<GridColumnVisibilityModel>(
        `/GameTable/${namespace}/visibility`,
        {
            whiteRating: false,
            blackRating: false,
            unlisted: false,
            updatedAt: false,
            ...(defaultVisibility ?? {}),
        },
    );

    const transformedColumns = useMemo(() => {
        let transformedColumns = columns ?? gameTableColumns;
        if (freeTierLimited) {
            transformedColumns = transformedColumns.map((col) => ({
                ...col,
                filterable: false,
                sortable: false,
            }));
        }
        return transformedColumns;
    }, [freeTierLimited, columns]);

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
    const isListView = dataGridProps.listView || isSmall;
    const density = apiRef.current?.state?.density;

    const getEstimatedRowHeight = useCallback(() => {
        if (isListView) {
            return 105;
        }
        switch (density) {
            case 'compact':
                return 50;
            case 'standard':
                return 65;
            case 'comfortable':
                return 75;
            default:
                return 65;
        }
    }, [isListView, density]);

    const getRowHeight = useCallback(() => {
        if (isListView) {
            return 'auto';
        }
        switch (density) {
            case 'compact':
                return 50;
            case 'standard':
                return 65;
            case 'comfortable':
                return 75;
            default:
                return 65;
        }
    }, [isListView, density]);

    const [sortModel, setSortModel] = useLocalStorage<GridSortModel>(
        `/GameTable/${namespace}/sortModel`,
        [
            {
                field: 'date',
                sort: 'desc',
            },
        ],
    );

    return (
        <DataGridPro
            apiRef={apiRef}
            {...dataGridProps}
            columns={transformedColumns}
            rows={data}
            pageSizeOptions={freeTierLimited ? [10] : [5, 10, 25]}
            columnVisibilityModel={columnVisibility}
            onColumnVisibilityModelChange={(model) => setColumnVisibility(model)}
            paginationModel={
                freeTierLimited
                    ? { page: 0, pageSize: 10 }
                    : { page: data.length > 0 ? page : 0, pageSize }
            }
            onPaginationModelChange={onPaginationModelChange}
            loading={request.isLoading()}
            autoHeight
            sx={{ width: 1 }}
            getRowHeight={getRowHeight}
            getEstimatedRowHeight={getEstimatedRowHeight}
            onRowClick={onRowClick}
            initialState={{
                density: 'standard',
            }}
            sortModel={sortModel}
            onSortModelChange={(newSortModel) => {
                setSortModel(newSortModel);
            }}
            slots={{
                basePagination: (props: PaginationPropsOverrides) => (
                    <CustomPagination
                        {...props}
                        page={page}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        count={rowCount}
                        hasMore={hasMore}
                        onPrevPage={() => setPage(page - 1)}
                        onNextPage={() => setPage(page + 1)}
                    />
                ),
                toolbar: isListView ? ListViewToolbar : CustomGridToolbar,
            }}
            slotProps={
                contextMenu
                    ? {
                          root: { 'data-testid': 'games-table' },
                          row: {
                              onContextMenu: contextMenu.open,
                          },
                      }
                    : { root: { 'data-testid': 'games-table' } }
            }
            pagination
            listView={isListView}
            listViewColumn={dataGridProps.listViewColumn || listColDef}
            showToolbar
        />
    );
}

function CustomGridToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarDensitySelector />
            <GridToolbarFilterButton />
        </GridToolbarContainer>
    );
}

function ListViewToolbar() {
    return null;
}
