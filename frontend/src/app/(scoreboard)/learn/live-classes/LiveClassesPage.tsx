'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { PlayArrow } from '@mui/icons-material';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Dialog,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface PresignedUrlData {
    loading?: boolean;
    url?: string;
}

export function LiveClassesPage() {
    const api = useApi();
    const { user } = useAuth();
    const subscriptionTier = getSubscriptionTier(user);
    const request = useRequest<LiveClass[]>();
    const [presignedUrls, setPresignedUrls] = useState<Record<string, PresignedUrlData>>({});
    const [playingUrl, setPlayingUrl] = useState<string>();
    const [showUpsell, setShowUpsell] = useState<SubscriptionTier>();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.listRecordings()
                .then((resp) => {
                    request.onSuccess(resp.data.classes ?? []);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    });

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const getPresignedLink = async (s3Key: string, tier: SubscriptionTier) => {
        if (
            tier === SubscriptionTier.GameReview &&
            subscriptionTier !== SubscriptionTier.GameReview
        ) {
            setShowUpsell(SubscriptionTier.GameReview);
            return;
        }

        if (
            subscriptionTier !== SubscriptionTier.Lecture &&
            subscriptionTier !== SubscriptionTier.GameReview
        ) {
            setShowUpsell(SubscriptionTier.Lecture);
            return;
        }

        if (presignedUrls[s3Key]?.url) {
            return presignedUrls[s3Key]?.url;
        }

        try {
            setPresignedUrls((urls) => ({ ...urls, [s3Key]: { loading: true } }));
            const resp = await api.getRecording({ s3Key });
            setPresignedUrls((urls) => ({ ...urls, [s3Key]: { url: resp.data.url } }));
            return resp.data.url;
        } catch (_err) {
            setPresignedUrls((urls) => ({ ...urls, [s3Key]: { loading: false } }));
        }
    };

    const onPlay = async (s3Key: string, tier: SubscriptionTier) => {
        const url = await getPresignedLink(s3Key, tier);
        if (!url) {
            return;
        }
        setPlayingUrl(url);
    };

    const lectures = request.data?.filter((c) => c.type === SubscriptionTier.Lecture) ?? [];
    const gameReviews = request.data?.filter((c) => c.type === SubscriptionTier.GameReview) ?? [];

    return (
        <Container sx={{ py: 5 }}>
            <RequestSnackbar request={request} />
            <Typography variant='h4'>Live Class Recordings</Typography>

            <Stack spacing={5} mt={5}>
                <LiveClassesSection title='Group Classes' classes={lectures} onPlay={onPlay} />
                <LiveClassesSection
                    title='Game & Profile Reviews'
                    classes={gameReviews}
                    onPlay={onPlay}
                />
            </Stack>

            {playingUrl && (
                <Dialog
                    open
                    onClose={() => setPlayingUrl(undefined)}
                    sx={{ maxHeight: '100%', maxWidth: '100%' }}
                >
                    <video
                        autoPlay
                        controls
                        src={playingUrl}
                        style={{ maxWidth: '100%', maxHeight: '100%', margin: 'auto' }}
                    />
                </Dialog>
            )}

            {showUpsell && (
                <UpsellDialog
                    open
                    onClose={() => setShowUpsell(undefined)}
                    title={`Upgrade to Access All Live Classes`}
                    description="Your current plan doesn't provide access to this class. Upgrade to:"
                    postscript='Your progress on your current plan will carry over when you upgrade.'
                    currentAction={
                        showUpsell === SubscriptionTier.GameReview
                            ? RestrictedAction.ViewGameAndProfileReviewRecording
                            : RestrictedAction.ViewGroupClassRecording
                    }
                    bulletPoints={
                        showUpsell === SubscriptionTier.GameReview
                            ? [
                                  'Attend weekly personalized game review classes',
                                  'Get direct feedback from a sensei',
                                  'Attend weekly live group classes on specialized topics',
                                  'Get full access to the ChessDojo website',
                              ]
                            : [
                                  'Attend weekly live group classes on specialized topics',
                                  'Access structured homework assignments',
                                  'Get full access to the core ChessDojo website',
                              ]
                    }
                />
            )}
        </Container>
    );
}

function LiveClassesSection({
    title,
    classes,
    onPlay,
}: {
    title: string;
    classes: LiveClass[];
    onPlay: (s3Key: string, tier: SubscriptionTier) => void;
}) {
    return (
        <Stack>
            <Typography variant='h5'>{title}</Typography>
            <Divider />
            {classes.length === 0 ? (
                <Typography sx={{ mt: 1 }}>None Found</Typography>
            ) : (
                <Stack mt={1} spacing={3}>
                    {classes.map((c) => (
                        <LiveClassCard key={c.name} c={c} onPlay={onPlay} />
                    ))}
                </Stack>
            )}
        </Stack>
    );
}

function LiveClassCard({
    c,
    onPlay,
}: {
    c: LiveClass;
    onPlay: (s3Key: string, tier: SubscriptionTier) => void;
}) {
    return (
        <Card key={c.name} variant='outlined'>
            <CardHeader title={c.name} />
            <CardContent>
                <Stack>
                    <Typography variant='subtitle1' fontWeight='bold' color='textSecondary'>
                        Dates
                    </Typography>
                    {c.recordings.map((r) => (
                        <Stack key={r.s3Key} direction='row' alignItems='center' spacing={1}>
                            <Typography>{r.date}</Typography>
                            <Button
                                startIcon={<PlayArrow />}
                                onClick={() => onPlay(r.s3Key, c.type)}
                            >
                                Play
                            </Button>
                        </Stack>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
}
