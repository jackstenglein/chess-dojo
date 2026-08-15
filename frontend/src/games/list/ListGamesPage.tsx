'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar } from '@/api/Request';
import { useAuth, useFreeTier } from '@/auth/Auth';
import GameTable, { getOpenGame } from '@/components/games/list/GameTable';
import { ListItemContextMenu } from '@/components/games/list/ListItemContextMenu';
import { Link } from '@/components/navigation/Link';
import ListGamesTutorial from '@/components/tutorial/ListGamesTutorial';
import { RequirementCategory } from '@/database/requirement';
import { useDataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { usePagination } from '@/hooks/usePagination';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import Icon from '@/style/Icon';
import UpsellAlert from '@/upsell/UpsellAlert';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import UpsellPage from '@/upsell/UpsellPage';
import { Badge, Button, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { GridPaginationModel } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import SearchFilters from './SearchFilters';

const ListGamesPage = () => {
    const t = useTranslations('games.list.listGamesPage');
    const isFreeTier = useFreeTier();
    const [upsellDialogOpen, setUpsellDialogOpen] = useState(false);
    const [upsellAction, setUpsellAction] = useState('');
    const params = useNextSearchParams().searchParams;
    const type = params.get('type') || '';
    const player = params.get('white') || params.get('black') || '';
    const api = useApi();
    const [reviewQueueLabel, setReviewQueueLabel] = useState('');
    const contextMenu = useDataGridContextMenu();
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        void api.listGamesForReview().then((resp) => {
            if (resp.data.games.length > 0) {
                setReviewQueueLabel(
                    `${resp.data.games.length}${resp.data.lastEvaluatedKey ? '+' : ''}`,
                );
            }
        });
    }, [setReviewQueueLabel, api]);

    const pagination = usePagination(null, 0, 10);
    const { pageSize, setPageSize, request, data, onSearch } = pagination;

    const onPaginationModelChange = (model: GridPaginationModel) => {
        if (model.pageSize !== pageSize) {
            setPageSize(model.pageSize);
        }
    };

    const onDownloadDatabase = () => {
        setUpsellAction(RestrictedAction.DownloadDatabase);
        setUpsellDialogOpen(true);
    };

    if (!user) {
        return <LoadingPage />;
    }

    if (isFreeTier && type === 'games' && player) {
        return <UpsellPage redirectTo='/games' currentAction={RestrictedAction.SearchDatabase} />;
    }
    if (isFreeTier && type === 'position') {
        return <UpsellPage redirectTo='/games' currentAction={RestrictedAction.DatabaseExplorer} />;
    }

    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <RequestSnackbar request={request} />

            {isFreeTier && (
                <>
                    <Stack
                        sx={{
                            alignItems: 'center',
                            mb: 5,
                        }}
                    >
                        <UpsellAlert>{t('freeTierAlert')}</UpsellAlert>
                    </Stack>
                    <UpsellDialog
                        open={upsellDialogOpen}
                        onClose={setUpsellDialogOpen}
                        currentAction={upsellAction}
                    />
                </>
            )}

            <Grid container spacing={5} wrap='wrap-reverse'>
                <Grid size={{ xs: 12, md: 8, lg: 8 }}>
                    <GameTable
                        namespace='games-list-page'
                        limitFreeTier
                        pagination={pagination}
                        onRowClick={getOpenGame(router)}
                        onPaginationModelChange={onPaginationModelChange}
                        contextMenu={contextMenu}
                        defaultVisibility={{
                            publishedAt: false,
                            updatedAt: false,
                        }}
                    />
                    <ListItemContextMenu
                        games={contextMenu.rowIds
                            .map((id) => data.find((g) => g.id === id))
                            .filter((g) => !!g)}
                        onClose={contextMenu.close}
                        position={contextMenu.position}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4, lg: 4 }}>
                    <Stack spacing={4}>
                        <Button
                            data-testid='import-game-button'
                            id='import-game-button'
                            variant='contained'
                            component={Link}
                            href='/games/import'
                            color='success'
                            startIcon={
                                <Icon
                                    name={RequirementCategory.Games}
                                    color='inherit'
                                    sx={{ marginRight: '0.3rem' }}
                                />
                            }
                        >
                            {t('analyzeGame')}
                        </Button>

                        <Divider />

                        <SearchFilters isLoading={request.isLoading()} onSearch={onSearch} />

                        <Stack spacing={0.5}>
                            <Stack direction='row' spacing={1}>
                                <Typography
                                    variant='body2'
                                    sx={{
                                        alignSelf: 'start',
                                    }}
                                >
                                    <Link href='/games/review-queue'>
                                        <Icon
                                            name='line'
                                            color='primary'
                                            sx={{
                                                marginRight: '0.5rem',
                                                verticalAlign: 'middle',
                                            }}
                                        />
                                        {t('senseiReviewQueue')}
                                    </Link>
                                </Typography>

                                {reviewQueueLabel && (
                                    <Badge
                                        badgeContent={reviewQueueLabel}
                                        color='secondary'
                                        sx={{
                                            '& .MuiBadge-badge': {
                                                transform: 'none',
                                                position: 'relative',
                                            },
                                        }}
                                    ></Badge>
                                )}
                            </Stack>

                            <Typography
                                data-testid='download-database-button'
                                id='download-full-database'
                                variant='body2'
                                sx={{
                                    alignSelf: 'start',
                                }}
                            >
                                <Link
                                    href={
                                        isFreeTier
                                            ? undefined
                                            : 'https://chess-dojo-prod-game-database.s3.amazonaws.com/dojo_database.zip'
                                    }
                                    target='_blank'
                                    rel='noreferrer'
                                    onClick={isFreeTier ? onDownloadDatabase : undefined}
                                >
                                    <Icon
                                        name='download'
                                        color='primary'
                                        sx={{
                                            marginRight: '0.5rem',
                                            verticalAlign: 'middle',
                                        }}
                                    />
                                    {t('downloadDatabase')}
                                </Link>
                            </Typography>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>

            <ListGamesTutorial />
        </Container>
    );
};

export default ListGamesPage;
