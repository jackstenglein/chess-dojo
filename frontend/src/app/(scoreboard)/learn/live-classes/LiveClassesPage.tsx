'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import { PresenterIcon } from '@/style/PresenterIcon';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import {
    ExpandMore,
    Person,
    PlayArrow,
    Search,
    ShowChart,
    Troubleshoot,
} from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    Container,
    Dialog,
    Grid,
    InputAdornment,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface PresignedUrlData {
    loading?: boolean;
    url?: string;
}

function matchesSearch(c: LiveClass, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
        c.name.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
}

function getUniqueTags(classes: LiveClass[]): string[] {
    const set = new Set<string>();
    for (const c of classes) {
        for (const tag of c.tags ?? []) {
            if (tag.trim()) set.add(tag.trim());
        }
    }
    return [...set].sort();
}

function matchesTagFilter(c: LiveClass, selectedTags: string[]): boolean {
    if (selectedTags.length === 0) return true;
    const classTags = new Set(c.tags ?? []);
    return selectedTags.some((t) => classTags.has(t) || c.type === t);
}

export function LiveClassesPage() {
    const api = useApi();
    const { user } = useAuth();
    const subscriptionTier = getSubscriptionTier(user);
    const request = useRequest<LiveClass[]>();
    const [presignedUrls, setPresignedUrls] = useState<Record<string, PresignedUrlData>>({});
    const [playingUrl, setPlayingUrl] = useState<string>();
    const [showUpsell, setShowUpsell] = useState<SubscriptionTier>();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

    const allClasses = request.data ?? [];
    const filteredClasses = allClasses.filter(
        (c) => matchesSearch(c, searchQuery) && matchesTagFilter(c, selectedTags),
    );
    const allTags = getUniqueTags(allClasses);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };

    const onClearFilters = () => {
        setSelectedTags([]);
        setSearchQuery('');
    };

    return (
        <Container sx={{ py: 5 }}>
            <RequestSnackbar request={request} />
            <Typography variant='h4'>Live Class Recordings</Typography>
            <TextField
                fullWidth
                placeholder='Search by class name, teacher, or description'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size='small'
                sx={{ mt: 2, maxWidth: 480 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position='start'>
                                <Search color='action' />
                            </InputAdornment>
                        ),
                    },
                }}
            />
            {allTags.length > 0 && (
                <Stack direction='row' flexWrap='wrap' gap={1} alignItems='center' sx={{ mt: 2 }}>
                    <Tooltip title='Show all recordings'>
                        <Chip
                            label='All'
                            size='small'
                            variant={selectedTags.length === 0 ? 'filled' : 'outlined'}
                            color={selectedTags.length === 0 ? 'dojoOrange' : 'default'}
                            onClick={() => setSelectedTags([])}
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                    <Tooltip title='Show recordings with tag: Lecture'>
                        <Chip
                            label='Lecture'
                            size='small'
                            variant={
                                selectedTags.includes(SubscriptionTier.Lecture)
                                    ? 'filled'
                                    : 'outlined'
                            }
                            color={
                                selectedTags.includes(SubscriptionTier.Lecture)
                                    ? 'dojoOrange'
                                    : 'default'
                            }
                            onClick={() => toggleTag(SubscriptionTier.Lecture)}
                            sx={{ cursor: 'pointer' }}
                            icon={<PresenterIcon />}
                        />
                    </Tooltip>
                    <Tooltip title='Show recordings with tag: Game & Profile Review'>
                        <Chip
                            label='Game & Profile Review'
                            size='small'
                            variant={
                                selectedTags.includes(SubscriptionTier.GameReview)
                                    ? 'filled'
                                    : 'outlined'
                            }
                            color={
                                selectedTags.includes(SubscriptionTier.GameReview)
                                    ? 'dojoOrange'
                                    : 'default'
                            }
                            onClick={() => toggleTag(SubscriptionTier.GameReview)}
                            sx={{ cursor: 'pointer' }}
                            icon={<Troubleshoot />}
                        />
                    </Tooltip>

                    {allTags.map((tag) => (
                        <Tooltip key={tag} title={`Show recordings with tag: ${tag}`}>
                            <Chip
                                key={tag}
                                label={tag}
                                size='small'
                                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                                color={selectedTags.includes(tag) ? 'dojoOrange' : 'default'}
                                onClick={() => toggleTag(tag)}
                                sx={{ cursor: 'pointer' }}
                            />
                        </Tooltip>
                    ))}
                </Stack>
            )}

            <Stack spacing={5} mt={5}>
                <LiveClassesSection
                    classes={filteredClasses}
                    onPlay={onPlay}
                    onTagClick={toggleTag}
                    selectedTags={selectedTags}
                    searchQuery={searchQuery}
                    onClearFilters={onClearFilters}
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
    classes,
    onPlay,
    onTagClick,
    selectedTags,
    searchQuery,
    onClearFilters,
}: {
    classes: LiveClass[];
    onPlay: (s3Key: string, tier: SubscriptionTier) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
    searchQuery: string;
    onClearFilters: () => void;
}) {
    if (classes.length > 0) {
        return (
            <Stack>
                <Grid container mt={1} spacing={3}>
                    {classes.map((c) => (
                        <Grid key={c.name} size={{ xs: 12, sm: 6, lg: 4 }}>
                            <LiveClassCard
                                c={c}
                                onPlay={onPlay}
                                onTagClick={onTagClick}
                                selectedTags={selectedTags}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Stack>
        );
    }

    if (selectedTags.length > 0 || searchQuery.trim() !== '') {
        return (
            <Stack alignItems='center'>
                <Typography sx={{ mt: 1 }}>No classes match your filters</Typography>
                <Button variant='text' color='primary' onClick={onClearFilters}>
                    Clear Filters
                </Button>
            </Stack>
        );
    }

    return (
        <Stack alignItems='center'>
            <Typography sx={{ mt: 1 }}>No classes found</Typography>
        </Stack>
    );
}

function LiveClassCard({
    c,
    onPlay,
    onTagClick,
    selectedTags,
}: {
    c: LiveClass;
    onPlay: (s3Key: string, tier: SubscriptionTier) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
}) {
    return (
        <Card variant='outlined' sx={{ overflow: 'hidden' }}>
            {c.imageUrl && (
                <CardMedia
                    component='img'
                    image={c.imageUrl}
                    alt={`${c.name} cover`}
                    sx={{
                        height: 180,
                        objectFit: 'cover',
                        bgcolor: 'action.hover',
                    }}
                />
            )}
            <CardContent sx={{ pt: c.imageUrl ? 2 : 3 }}>
                <Typography variant='h6' component='h2' gutterBottom>
                    {c.name}
                </Typography>

                <Stack direction='row' flexWrap='wrap' gap={2} sx={{ mb: 2 }}>
                    <Stack direction='row' alignItems='center' spacing={0.75}>
                        <Person fontSize='small' color='action' />
                        <Typography variant='body2' color='text.secondary'>
                            {c.teacher}
                        </Typography>
                    </Stack>
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
                                        ? 'dojoOrange'
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
                                        ? 'dojoOrange'
                                        : 'default'
                                }
                            />
                        </Tooltip>
                    )}
                    {c.tags.map((tag) => (
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
                                color={selectedTags.includes(tag) ? 'dojoOrange' : 'default'}
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
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mt: 2,
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}
                    >
                        <Typography variant='subtitle2' color='text.secondary'>
                            {c.recordings.length} recording{c.recordings.length !== 1 ? 's' : ''}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
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
                                    <Typography variant='body2'>{r.date}</Typography>
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
