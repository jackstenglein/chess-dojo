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
    SAMPLE_LIVE_CLASS_S3_KEY,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { ExpandMore, Person, PlayArrow, ShowChart, Troubleshoot } from '@mui/icons-material';
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

    const onPlay = async (s3Key: string, tier: SubscriptionTier) => {
        const url = await getPresignedLink(s3Key, tier);
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
    onPlay: (s3Key: string, tier: SubscriptionTier) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
    variant?: 'grid' | 'list';
}) {
    const isList = variant === 'list';
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
                    alt={`${c.name} cover`}
                    sx={{
                        objectFit: 'cover',
                        ...(isList
                            ? {
                                  height: { xs: 'auto', sm: 140 },
                                  width: { xs: '100%', sm: 200 },
                                  minWidth: { sm: 200 },
                                  pl: { sm: 2 },
                                  borderRadius: { sm: 1 },
                              }
                            : {
                                  width: '100%',
                                  aspectRatio: 16 / 9,
                                  flexShrink: 0,
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
                        <Tooltip title='Show recordings with tag: Game & Profile Review'>
                            <Chip
                                label='Game & Profile Review'
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
                        <Tooltip title='Show recordings with tag: Lecture'>
                            <Chip
                                label='Lecture'
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
                        <Tooltip key={tag} title={`Show recordings with tag: ${tag}`}>
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

                <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                        bgcolor: 'transparent',
                        '&:before': { display: 'none' },
                        mt: 2,
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}
                        sx={{
                            minHeight: 48,
                            flexDirection: 'row-reverse',
                            '& .MuiAccordionSummary-content': { my: 1 },
                            '& .MuiAccordionSummary-expandIconWrapper': { mr: 1, ml: 0 },
                        }}
                    >
                        <Typography variant='subtitle2' color='primary.main'>
                            {c.recordings.length} recording{c.recordings.length !== 1 ? 's' : ''}
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
                                        onClick={() => onPlay(r.s3Key, c.type)}
                                    >
                                        Play
                                    </Button>
                                </Stack>
                            ))}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            </CardContent>
        </Card>
    );
}
