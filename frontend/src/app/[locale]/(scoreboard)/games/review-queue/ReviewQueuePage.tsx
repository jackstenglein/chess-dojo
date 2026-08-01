'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar } from '@/api/Request';
import { isValidDate } from '@/components/calendar/eventEditor/useEventEditor';
import { RenderGameResultStack, RenderPlayersCell } from '@/components/games/list/GameListItem';
import { Link } from '@/components/navigation/Link';
import { ONE_WEEK_IN_MS } from '@/components/time/time';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { GameInfo, GameReviewType } from '@/database/game';
import { usePagination } from '@/hooks/usePagination';
import { useRouter } from '@/hooks/useRouter';
import Avatar from '@/profile/Avatar';
import { Container, Stack, Typography } from '@mui/material';
import {
    DataGridPro,
    GridColDef,
    GridPaginationModel,
    GridRenderCellParams,
    GridRowParams,
    PaginationPropsOverrides,
} from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

export function ReviewQueuePage() {
    const router = useRouter();
    const api = useApi();
    const t = useTranslations('games.reviewQueue');

    const columns: GridColDef<GameInfo>[] = [
        {
            field: 'cohort',
            headerName: t('cohort'),
            width: 115,
        },
        {
            field: 'owner',
            headerName: t('uploadedBy'),
            flex: 0.5,
            minWidth: 150,
            renderCell: (params: GridRenderCellParams<GameInfo, string>) => {
                if (params.row.ownerDisplayName === '') {
                    return '';
                }

                return (
                    <Stack
                        direction='row'
                        spacing={1}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Avatar
                            username={params.row.owner}
                            displayName={params.row.ownerDisplayName}
                            size={32}
                        />
                        <Link href={`/profile/${params.row.owner}`}>
                            {params.row.ownerDisplayName}
                        </Link>
                    </Stack>
                );
            },
        },
        {
            field: 'players',
            headerName: t('players'),
            renderCell: RenderPlayersCell,
            flex: 1,
            minWidth: 150,
        },
        {
            field: 'result',
            headerName: t('result'),
            valueGetter: (_value, row) => row.headers.Result,
            renderCell: (params) => <RenderGameResultStack result={params.row.headers.Result} />,
            align: 'center',
            headerAlign: 'center',
            width: 75,
        },
        {
            field: 'moves',
            headerName: t('moves'),
            valueGetter: (_value, row) =>
                row.headers.PlyCount ? Math.ceil(parseInt(row.headers.PlyCount) / 2) : '?',
            align: 'center',
            headerAlign: 'center',
            width: 75,
        },
        {
            field: 'date',
            headerName: t('datePlayed'),
            width: 130,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'reviewRequestedAt',
            headerName: t('dateRequested'),
            width: 145,
            align: 'right',
            headerAlign: 'right',
            valueFormatter: (value: string) => value.split('T')[0].replaceAll('-', '.'),
        },
        {
            field: 'review.type',
            headerName: t('reviewType'),
            align: 'center',
            headerAlign: 'center',
            width: 120,
            valueGetter: (_value, row) => {
                if (!row.review) {
                    return '';
                }
                switch (row.review.type) {
                    case GameReviewType.Quick:
                        return t('quick');
                    case GameReviewType.Deep:
                        return t('deepDive');
                }
            },
        },
        {
            field: 'deadline',
            headerName: t('deadline'),
            align: 'center',
            headerAlign: 'center',
            valueGetter: (_value, row) => {
                const d = new Date(row.reviewRequestedAt || '');
                if (!isValidDate(d)) {
                    return '';
                }
                return new Date(d.getTime() + ONE_WEEK_IN_MS)
                    .toISOString()
                    .split('T')[0]
                    .replaceAll('-', '.');
            },
        },
    ];
    const search = useCallback((startKey: string) => api.listGamesForReview(startKey), [api]);

    const { request, data, rowCount, page, pageSize, hasMore, setPage, setPageSize } =
        usePagination(search, 0, 10);

    const onClickRow = (params: GridRowParams<GameInfo>) => {
        router.push(
            `/games/${params.row.cohort.replaceAll('+', '%2B')}/${params.row.id.replaceAll(
                '?',
                '%3F',
            )}`,
        );
    };

    const onPaginationModelChange = (model: GridPaginationModel) => {
        if (model.pageSize !== pageSize) {
            setPageSize(model.pageSize);
        }
    };

    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <RequestSnackbar request={request} />

            <Typography
                sx={{
                    color: 'text.secondary',
                    mb: 3,
                }}
            >
                {t.rich('description', {
                    link: (chunks) => (
                        <Link
                            href='https://www.twitch.tv/chessdojo'
                            target='_blank'
                            rel='noreferrer'
                        >
                            {chunks}
                        </Link>
                    ),
                    strong: (chunks) => <strong>{chunks}</strong>,
                })}
            </Typography>

            <DataGridPro
                columns={columns}
                rows={data}
                rowCount={rowCount}
                pageSizeOptions={[5, 10, 25]}
                paginationModel={{ page: data.length > 0 ? page : 0, pageSize }}
                onPaginationModelChange={onPaginationModelChange}
                loading={request.isLoading()}
                autoHeight
                rowHeight={70}
                onRowClick={onClickRow}
                sx={{ width: 1 }}
                initialState={{
                    sorting: {
                        sortModel: [
                            {
                                field: 'reviewRequestedAt',
                                sort: 'asc',
                            },
                        ],
                    },
                }}
                pagination
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
                }}
            />
        </Container>
    );
}
