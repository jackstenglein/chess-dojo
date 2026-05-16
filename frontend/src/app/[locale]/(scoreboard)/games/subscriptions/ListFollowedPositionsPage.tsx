'use client';

import { useApi } from '@/api/Api';
import { ListFollowedPositionsResponse } from '@/api/explorerApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import Board from '@/board/Board';
import { FollowDialog } from '@/board/pgn/explorer/Header';
import { ExplorerPositionFollower } from '@/database/explorer';
import LoadingPage from '@/loading/LoadingPage';
import Icon from '@/style/Icon';
import { Check, ContentPaste, Edit } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    Container,
    Divider,
    Grid,
    Tooltip,
    Typography,
} from '@mui/material';
import copy from 'copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ListFollowedPositionsPage() {
    const t = useTranslations('games.subscriptions');
    const api = useApi();
    const request = useRequest<ListFollowedPositionsResponse>();
    const [copied, setCopied] = useState('');
    const [editPosition, setEditPosition] = useState<ExplorerPositionFollower>();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();

            api.listFollowedPositions()
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, request]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (request.isFailure()) {
        return <RequestSnackbar request={request} />;
    }

    const onCopy = (name: string, value: string) => {
        copy(value);
        setCopied(name);
        setTimeout(() => {
            setCopied('');
        }, 3000);
    };

    const onEditPosition = (p: ExplorerPositionFollower | null) => {
        if (!editPosition || !request.data) {
            return;
        }

        const index = request.data.positions.findIndex(
            (p2) => editPosition.normalizedFen === p2.normalizedFen,
        );
        if (index < 0) {
            return;
        }

        if (p === null) {
            request.onSuccess({
                ...request.data,
                positions: [
                    ...(request.data?.positions.slice(0, index) ?? []),
                    ...(request.data?.positions.slice(index + 1) ?? []),
                ],
            });
        } else {
            request.onSuccess({
                ...request.data,
                positions: [
                    ...(request.data?.positions.slice(0, index) ?? []),
                    p,
                    ...(request.data?.positions.slice(index + 1) ?? []),
                ],
            });
        }
    };

    return (
        <Container sx={{ py: 5 }}>
            <Typography variant='h5'>{t('title')}</Typography>
            <Divider sx={{ mb: 3 }} />

            {!request.data?.positions.length && <Typography>{t('empty')}</Typography>}

            <Grid container spacing={2}>
                {request.data?.positions.map((position) => (
                    <Grid key={position.normalizedFen} size={{ xs: 12, sm: 4 }}>
                        <Card variant='outlined'>
                            <CardMedia>
                                <Box sx={{ aspectRatio: '1 / 1' }}>
                                    <Board
                                        config={{
                                            fen: position.normalizedFen,
                                            viewOnly: true,
                                        }}
                                    />
                                </Box>
                            </CardMedia>
                            <CardContent>
                                <Typography>
                                    {t('dojo', { description: dojoDescription(position, t) })}
                                </Typography>
                                <Typography>
                                    {t('masters', {
                                        description: mastersDescription(position, t),
                                    })}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ flexWrap: 'wrap', columnGap: 1 }}>
                                <Tooltip title={t('editTooltip')}>
                                    <Button
                                        startIcon={<Edit color='dojoOrange' />}
                                        onClick={() => setEditPosition(position)}
                                    >
                                        {t('edit')}
                                    </Button>
                                </Tooltip>

                                <Tooltip title={t('copyFenTooltip')}>
                                    <Button
                                        data-testid='position-fen-copy'
                                        startIcon={
                                            copied === 'fen' ? (
                                                <Check color='success' />
                                            ) : (
                                                <ContentPaste color='dojoOrange' />
                                            )
                                        }
                                        onClick={() => onCopy('fen', position.normalizedFen)}
                                    >
                                        {t('fen')}
                                    </Button>
                                </Tooltip>

                                <Tooltip title={t('explorerTooltip')}>
                                    <Button
                                        startIcon={<Icon name='explore' color='dojoOrange' />}
                                        href={`/games/explorer?fen=${position.normalizedFen}`}
                                        rel='noopener'
                                        target='_blank'
                                    >
                                        {t('explorer')}
                                    </Button>
                                </Tooltip>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {editPosition && (
                <FollowDialog
                    fen={editPosition.normalizedFen}
                    follower={editPosition}
                    open
                    onClose={() => setEditPosition(undefined)}
                    setFollower={onEditPosition}
                    initialMinCohort=''
                    initialMaxCohort=''
                />
            )}
        </Container>
    );
}

function dojoDescription(
    position: ExplorerPositionFollower,
    t: ReturnType<typeof useTranslations<'games.subscriptions'>>,
): string {
    const metadata = position.followMetadata?.dojo;
    if (!metadata?.enabled) {
        return t('disabled');
    }

    let description = '';

    if (!metadata.minCohort && !metadata.maxCohort) {
        description = t('allCohorts');
    } else if (!metadata.minCohort) {
        description = `0-${metadata.maxCohort?.split('-').at(-1)}`;
    } else if (!metadata.maxCohort) {
        description = `${metadata.minCohort?.split('-')[0]}+`.replaceAll('++', '+');
    } else {
        description = `${metadata.minCohort.split('-')[0]}-${metadata.maxCohort.split('-').at(-1)}`;
    }

    if (metadata.disableVariations) {
        description += t('disableVariations');
    }

    return description;
}

function mastersDescription(
    position: ExplorerPositionFollower,
    t: ReturnType<typeof useTranslations<'games.subscriptions'>>,
): string {
    const metadata = position.followMetadata?.masters;
    if (!metadata?.enabled) {
        return t('disabled');
    }

    let description = '';

    if (metadata.minAverageRating) {
        description = `${metadata.minAverageRating}+; `;
    }

    if (metadata.timeControls) {
        description += metadata.timeControls.join(', ');
    } else {
        description += t('allTimeControls');
    }
    return description;
}
