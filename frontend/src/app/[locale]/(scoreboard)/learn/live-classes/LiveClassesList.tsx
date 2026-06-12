import { getRecording } from '@/api/liveClassesApi';
import { useAuth } from '@/auth/Auth';
import { PresenterIcon } from '@/style/PresenterIcon';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    LiveClass,
    LiveClassRecording,
    SAMPLE_LIVE_CLASS_S3_KEY,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { Person, PlayArrow, ShowChart, Troubleshoot } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    Dialog,
    Grid,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { formatRecordingDate } from './liveClassUtils';

interface PresignedUrlData {
    loading?: boolean;
    url?: string;
}

/**
 * Renders a list of live classes in either grid or list view.
 * @param classes - The live classes to display.
 * @param onTagClick - The function to call when a tag is clicked.
 * @param selectedTags - The selected tags to filter the live classes by.
 * @param variant - The variant of the live classes list (grid or list).
 * @returns The live classes list.
 */
export function LiveClassesList({
    classes,
    onTagClick,
    selectedTags,
    variant,
}: {
    classes: LiveClass[];
    onTagClick: (tag: string) => void;
    selectedTags: string[];
    variant?: 'grid' | 'list';
}) {
    const t = useTranslations('learn.liveClasses');
    const [playingUrl, setPlayingUrl] = useState<string>();
    const [showUpsell, setShowUpsell] = useState<SubscriptionTier>();
    const [presignedUrls, setPresignedUrls] = useState<Record<string, PresignedUrlData>>({});
    const { user } = useAuth();
    const subscriptionTier = getSubscriptionTier(user);

    const getPresignedLink = async (s3Key: string, tier: SubscriptionTier) => {
        if (s3Key !== SAMPLE_LIVE_CLASS_S3_KEY) {
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
        }

        if (presignedUrls[s3Key]?.url) {
            return presignedUrls[s3Key]?.url;
        }

        try {
            setPresignedUrls((urls) => ({ ...urls, [s3Key]: { loading: true } }));
            const resp = await getRecording({ s3Key });
            setPresignedUrls((urls) => ({ ...urls, [s3Key]: { url: resp.data.url } }));
            return resp.data.url;
        } catch (_err) {
            setPresignedUrls((urls) => ({ ...urls, [s3Key]: { loading: false } }));
        }
    };

    const onPlay = async (recording: LiveClassRecording, tier: SubscriptionTier) => {
        // Allow playing free samples, which might be on YouTube and therefore have
        // public URLs.
        if (recording.url) {
            setPlayingUrl(recording.url);
            return;
        }

        const url = await getPresignedLink(recording.s3Key, tier);
        if (!url) {
            return;
        }
        setPlayingUrl(url);
    };

    return (
        <Grid container mt={1} spacing={3}>
            {classes.map((c) => (
                <Grid
                    key={c.name}
                    size={variant === 'list' ? 12 : { xs: 12, sm: 6, lg: 4 }}
                    sx={variant === 'grid' ? { display: 'flex' } : undefined}
                >
                    <LiveClassCard
                        c={c}
                        onPlay={onPlay}
                        onTagClick={onTagClick}
                        selectedTags={selectedTags}
                        variant={variant}
                    />
                </Grid>
            ))}

            {playingUrl && (
                <Dialog
                    open
                    onClose={() => setPlayingUrl(undefined)}
                    maxWidth={false}
                    slotProps={{
                        paper: {
                            sx: {
                                maxWidth: 'calc(min(100vw - 32px, (100vh - 64px) * 560 / 315))',
                                width: '100%',
                            },
                        },
                    }}
                >
                    {playingUrl.includes('youtube.com') ? (
                        <iframe
                            src={playingUrl}
                            title='YouTube video player'
                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                            referrerPolicy='strict-origin-when-cross-origin'
                            allowFullScreen
                            style={{
                                maxHeight: '100%',
                                aspectRatio: '560 / 315',
                                margin: 'auto',
                                width: '100%',
                                maxWidth: 'calc(min(100vw - 32px, (100vh - 64px) * 560 / 315))',
                            }}
                        ></iframe>
                    ) : (
                        <video
                            autoPlay
                            controls
                            src={playingUrl}
                            style={{
                                maxHeight: '100%',
                                aspectRatio: '560 / 315',
                                margin: 'auto',
                                width: '100%',
                                maxWidth: 'calc(min(100vw - 32px, (100vh - 64px) * 560 / 315))',
                            }}
                        />
                    )}
                </Dialog>
            )}

            {showUpsell && (
                <UpsellDialog
                    open
                    onClose={() => setShowUpsell(undefined)}
                    title={t('upsell.title')}
                    description={t('upsell.description')}
                    postscript={t('upsell.postscript')}
                    currentAction={
                        showUpsell === SubscriptionTier.GameReview
                            ? RestrictedAction.ViewGameAndProfileReviewRecording
                            : RestrictedAction.ViewGroupClassRecording
                    }
                    bulletPoints={
                        showUpsell === SubscriptionTier.GameReview
                            ? [
                                  t('upsell.gameReviewBullet1'),
                                  t('upsell.gameReviewBullet2'),
                                  t('upsell.gameReviewBullet3'),
                                  t('upsell.gameReviewBullet4'),
                              ]
                            : [
                                  t('upsell.lectureBullet1'),
                                  t('upsell.lectureBullet2'),
                                  t('upsell.lectureBullet3'),
                              ]
                    }
                />
            )}
        </Grid>
    );
}

function LiveClassCard({
    c,
    onPlay,
    onTagClick,
    selectedTags,
    variant = 'grid',
}: {
    c: LiveClass;
    onPlay: (recording: LiveClassRecording, tier: SubscriptionTier) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
    variant?: 'grid' | 'list';
}) {
    const t = useTranslations('learn.liveClasses');
    const isList = variant === 'list';
    const singleRecording = c.recordings.length === 1 ? c.recordings[0] : undefined;
    return (
        <Card
            variant='outlined'
            sx={{
                overflow: 'hidden',
                ...(isList
                    ? {
                          display: { sm: 'flex' },
                          flexDirection: { sm: 'row' },
                          alignItems: { sm: 'center' },
                      }
                    : variant === 'grid'
                      ? {
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }
                      : {}),
            }}
        >
            {c.imageUrl && (
                <CardMedia
                    component='img'
                    image={c.imageUrl}
                    alt={t('card.cover', { name: c.name })}
                    onClick={singleRecording ? () => onPlay(singleRecording, c.type) : undefined}
                    sx={{
                        objectFit: 'cover',
                        ...(isList
                            ? {
                                  height: { xs: 'auto', sm: 140 },
                                  width: { xs: '100%', sm: 200 },
                                  minWidth: { sm: 200 },
                                  pl: { sm: 2 },
                                  borderRadius: { sm: 1 },
                                  cursor: singleRecording ? 'pointer' : undefined,
                              }
                            : {
                                  width: '100%',
                                  aspectRatio: 16 / 9,
                                  flexShrink: 0,
                                  cursor: singleRecording ? 'pointer' : undefined,
                              }),
                    }}
                />
            )}
            <CardContent
                sx={{
                    pt: c.imageUrl ? 2 : 3,
                    flex: 1,
                    minWidth: 0,
                    ...(isList ? { display: { sm: 'flex' }, flexDirection: { sm: 'column' } } : {}),
                    ...(variant === 'grid'
                        ? { display: 'flex', flexDirection: 'column', minHeight: 0 }
                        : {}),
                }}
            >
                <Typography variant='h6' component='h2' gutterBottom>
                    {c.name}
                </Typography>

                <Stack direction='row' flexWrap='wrap' gap={2} sx={{ mb: 2 }}>
                    {c.teacher && (
                        <Stack direction='row' alignItems='center' spacing={0.75}>
                            <Person fontSize='small' color='action' />
                            <Typography variant='body2' color='text.secondary'>
                                {c.teacher}
                            </Typography>
                        </Stack>
                    )}
                    <Stack direction='row' alignItems='center' spacing={0.75}>
                        <ShowChart fontSize='small' color='action' />
                        <Typography variant='body2' color='text.secondary'>
                            {c.cohortRange}
                        </Typography>
                    </Stack>
                </Stack>

                <Stack direction='row' flexWrap='wrap' gap={0.75} sx={{ mb: 1.5 }}>
                    {c.type === SubscriptionTier.GameReview ? (
                        <Tooltip title={t('showTagGameReview')}>
                            <Chip
                                label={t('gameReview')}
                                size='small'
                                variant='outlined'
                                icon={<Troubleshoot />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick(SubscriptionTier.GameReview);
                                }}
                                sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                                color={
                                    selectedTags.includes(SubscriptionTier.GameReview)
                                        ? 'primary'
                                        : 'default'
                                }
                            />
                        </Tooltip>
                    ) : (
                        <Tooltip title={t('showTagLecture')}>
                            <Chip
                                label={t('lecture')}
                                size='small'
                                variant='outlined'
                                icon={<PresenterIcon />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick(SubscriptionTier.Lecture);
                                }}
                                sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                                color={
                                    selectedTags.includes(SubscriptionTier.Lecture)
                                        ? 'primary'
                                        : 'default'
                                }
                            />
                        </Tooltip>
                    )}
                    {c.tags?.map((tag) => (
                        <Tooltip key={tag} title={t('showTagDynamic', { tag })}>
                            <Chip
                                key={tag}
                                label={tag}
                                size='small'
                                variant='outlined'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick(tag);
                                }}
                                sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                            />
                        </Tooltip>
                    ))}
                </Stack>

                <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        ...(isList ? { flex: { sm: 1 }, WebkitLineClamp: { xs: 6, sm: 2 } } : {}),
                    }}
                >
                    {c.description}
                </Typography>

                {singleRecording ? (
                    <Button
                        variant='contained'
                        startIcon={<PlayArrow />}
                        onClick={() => onPlay(singleRecording, c.type)}
                        sx={{ alignSelf: 'start', mt: 2 }}
                    >
                        Play
                    </Button>
                ) : (
                    <Accordion
                        disableGutters
                        elevation={0}
                        sx={{
                            bgcolor: 'transparent',
                            '&:before': { display: 'none' },
                            mt: 2,
                        }}
                    >
                        <AccordionSummary>
                            <Typography variant='subtitle2' color='primary.main'>
                                {t('card.recordingCount', { count: c.recordings.length })}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ py: 0 }}>
                            <Stack spacing={1}>
                                {c.recordings.map((r) => (
                                    <Stack
                                        key={r.s3Key}
                                        direction='row'
                                        alignItems='center'
                                        justifyContent='space-between'
                                        flexWrap='wrap'
                                        gap={1}
                                    >
                                        <Typography variant='body2'>
                                            {formatRecordingDate(r.date)}
                                        </Typography>
                                        <Button
                                            size='small'
                                            startIcon={<PlayArrow />}
                                            onClick={() => onPlay(r, c.type)}
                                        >
                                            {t('card.play')}
                                        </Button>
                                    </Stack>
                                ))}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
