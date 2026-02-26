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
import { useEffect, useState } from 'react';

export function ListFollowedPositionsPage() {
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
            <Typography variant='h5'>Subscriptions</Typography>
            <Divider sx={{ mb: 3 }} />

            {!request.data?.positions.length && <Typography>No subscriptions</Typography>}

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
                                <Typography>Dojo: {dojoDescription(position)}</Typography>
                                <Typography>Masters: {mastersDescription(position)}</Typography>
                            </CardContent>
                            <CardActions sx={{ flexWrap: 'wrap', columnGap: 1 }}>
                                <Tooltip title='Edit subscription'>
                                    <Button
                                        startIcon={<Edit color='dojoOrange' />}
                                        onClick={() => setEditPosition(position)}
                                    >
                                        Edit
                                    </Button>
                                </Tooltip>

                                <Tooltip title='Copy position FEN to clipboard'>
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
                                        FEN
                                    </Button>
                                </Tooltip>

                                <Tooltip title='Open in position explorer'>
                                    <Button
                                        startIcon={<Icon name='explore' color='dojoOrange' />}
                                        href={`/games/explorer?fen=${position.normalizedFen}`}
                                        rel='noopener'
                                        target='_blank'
                                    >
                                        Explorer
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

function dojoDescription(position: ExplorerPositionFollower): string {
    const metadata = position.followMetadata?.dojo;
    if (!metadata?.enabled) {
        return 'Disabled';
    }

    let description = '';

    if (!metadata.minCohort && !metadata.maxCohort) {
        description = 'All cohorts';
    } else if (!metadata.minCohort) {
        description = `0-${metadata.maxCohort?.split('-').at(-1)}`;
    } else if (!metadata.maxCohort) {
        description = `${metadata.minCohort?.split('-')[0]}+`.replaceAll('++', '+');
    } else {
        description = `${metadata.minCohort.split('-')[0]}-${metadata.maxCohort.split('-').at(-1)}`;
    }

    if (metadata.disableVariations) {
        description += `, disable variations`;
    }

    return description;
}

function mastersDescription(position: ExplorerPositionFollower): string {
    const metadata = position.followMetadata?.masters;
    if (!metadata?.enabled) {
        return 'Disabled';
    }

    let description = '';

    if (metadata.minAverageRating) {
        description = `${metadata.minAverageRating}+; `;
    }

    if (metadata.timeControls) {
        description += metadata.timeControls.join(', ');
    } else {
        description += 'all time controls';
    }
    return description;
}
