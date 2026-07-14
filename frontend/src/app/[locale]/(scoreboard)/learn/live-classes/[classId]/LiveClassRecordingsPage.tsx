'use client';

import { listRecordings } from '@/api/liveClassesApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import LoadingPage from '@/loading/LoadingPage';
import { PresenterIcon } from '@/style/PresenterIcon';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    LiveClass,
    LiveClassRecording,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import {
    ArrowBack,
    AutoAwesome,
    Person,
    Schedule,
    ShowChart,
    Troubleshoot,
} from '@mui/icons-material';
import {
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Container,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
    findLiveClassBySlug,
    formatRecordingDate,
    formatRecordingDuration,
} from '../liveClassUtils';
import { LiveClassUpsellDialog } from '../LiveClassVideoDialog';
import { LiveClassVideoPopup } from '../LiveClassVideoPopup';
import { useLiveClassPlayback } from '../useLiveClassPlayback';
/**
 * Displays a live class's recordings as a list of cards. Clicking a card opens
 * the video in a bottom-right popup player.
 */
export function LiveClassRecordingsPage({ classSlug }: { classSlug: string }) {
    const t = useTranslations('learn.liveClasses');
    const request = useRequest<LiveClass[]>();
    const [selectedRecording, setSelectedRecording] = useState<LiveClassRecording>();
    const {
        playingUrl,
        setPlayingUrl,
        showUpsell,
        setShowUpsell,
        playRecording,
        isRecordingLoading,
    } = useLiveClassPlayback();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            listRecordings()
                .then((resp) => {
                    request.onSuccess(resp.data.classes ?? []);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    }, [request]);

    const liveClass = request.data ? findLiveClassBySlug(request.data, classSlug) : undefined;

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (!liveClass) {
        return (
            <Container sx={{ py: 5 }}>
                <RequestSnackbar request={request} />
                <Button component={Link} href='/learn/live-classes' startIcon={<ArrowBack />}>
                    {t('recordingsPage.back')}
                </Button>
                <Typography sx={{ mt: 2 }}>{t('recordingsPage.notFound')}</Typography>
            </Container>
        );
    }

    const onSelectRecording = (recording: LiveClassRecording) => {
        if (
            recording.s3Key === selectedRecording?.s3Key &&
            recording.url === selectedRecording?.url &&
            (playingUrl || isRecordingLoading(recording.s3Key))
        ) {
            return;
        }
        setPlayingUrl(undefined);
        setSelectedRecording(recording);
        void playRecording(recording, liveClass.type);
    };

    const onClosePopup = () => {
        setPlayingUrl(undefined);
        setSelectedRecording(undefined);
    };

    const selectedTitle =
        selectedRecording?.title ??
        (selectedRecording ? formatRecordingDate(selectedRecording.date) : undefined);
    const isPopupLoading =
        !!selectedRecording && !playingUrl && isRecordingLoading(selectedRecording.s3Key);
    const isPopupOpen = !!playingUrl || isPopupLoading;
    return (
        <Container sx={{ py: 5 }}>
            <RequestSnackbar request={request} />

            <Button
                component={Link}
                href='/learn/live-classes'
                startIcon={<ArrowBack />}
                sx={{ mb: 2 }}
            >
                {t('recordingsPage.back')}
            </Button>

            <Typography variant='h4' component='h1'>
                {liveClass.name}
            </Typography>

            <Stack direction='row' flexWrap='wrap' gap={2} sx={{ mt: 1, mb: 1 }}>
                {liveClass.teacher && (
                    <Stack direction='row' alignItems='center' spacing={0.75}>
                        <Person fontSize='small' color='action' />
                        <Typography variant='body2' color='text.secondary'>
                            {liveClass.teacher}
                        </Typography>
                    </Stack>
                )}
                <Stack direction='row' alignItems='center' spacing={0.75}>
                    <ShowChart fontSize='small' color='action' />
                    <Typography variant='body2' color='text.secondary'>
                        {liveClass.cohortRange}
                    </Typography>
                </Stack>
            </Stack>

            <Stack direction='row' flexWrap='wrap' gap={0.75} sx={{ mb: 2 }}>
                {liveClass.type === SubscriptionTier.GameReview ? (
                    <Chip
                        label={t('gameReview')}
                        size='small'
                        variant='outlined'
                        icon={<Troubleshoot />}
                    />
                ) : (
                    <Chip
                        label={t('lecture')}
                        size='small'
                        variant='outlined'
                        icon={<PresenterIcon />}
                    />
                )}
                {liveClass.tags?.map((tag) => (
                    <Chip key={tag} label={tag} size='small' variant='outlined' />
                ))}
            </Stack>

            {liveClass.description && (
                <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
                    {liveClass.description}
                </Typography>
            )}

            <Typography variant='h6' sx={{ mb: 2 }}>
                {t('recordingsPage.playlist')}
            </Typography>

            <Stack spacing={2}>
                {liveClass.recordings.map((recording) => {
                    const duration = formatRecordingDuration(recording.durationSeconds);
                    return (
                        <Card key={recording.s3Key || recording.url} variant='outlined'>
                            <CardActionArea onClick={() => onSelectRecording(recording)}>
                                <CardContent>
                                    <Typography variant='h6' component='h2' gutterBottom>
                                        {recording.title ?? formatRecordingDate(recording.date)}
                                    </Typography>

                                    <Stack
                                        direction='row'
                                        flexWrap='wrap'
                                        gap={2}
                                        sx={{ mb: recording.description ? 1.5 : 0 }}
                                    >
                                        {recording.title && (
                                            <Typography variant='body2' color='text.secondary'>
                                                {formatRecordingDate(recording.date)}
                                            </Typography>
                                        )}
                                        {duration && (
                                            <Stack
                                                direction='row'
                                                alignItems='center'
                                                spacing={0.5}
                                            >
                                                <Schedule fontSize='small' color='action' />
                                                <Typography variant='body2' color='text.secondary'>
                                                    {duration}
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Stack>

                                    {recording.description && (
                                        <Stack
                                            direction='row'
                                            spacing={0.75}
                                            alignItems='flex-start'
                                        >
                                            <Tooltip title={t('recordingsPage.aiDescription')}>
                                                <AutoAwesome
                                                    fontSize='small'
                                                    sx={{ color: 'text.secondary' }}
                                                />
                                            </Tooltip>
                                            <Typography variant='body2' color='text.secondary'>
                                                {recording.description}
                                            </Typography>
                                        </Stack>
                                    )}
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    );
                })}
            </Stack>

            {isPopupOpen && (
                <LiveClassVideoPopup
                    url={playingUrl}
                    title={selectedTitle}
                    loading={isPopupLoading}
                    onClose={onClosePopup}
                />
            )}

            <LiveClassUpsellDialog
                showUpsell={showUpsell}
                onClose={() => setShowUpsell(undefined)}
            />
        </Container>
    );
}
