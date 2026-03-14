'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import { PresenterIcon } from '@/style/PresenterIcon';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { getCohortRangeInt } from '@jackstenglein/chess-dojo-common/src/database/cohort';
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
    ViewList,
    ViewModule,
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
    MenuItem,
    Select,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
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
        c.teacher?.toLowerCase().includes(q) ||
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

const COHORT_LEVELS = [
    { value: 'all', label: 'All Levels', min: 0, max: Infinity },
    { value: 'beginner', label: 'Beginner (0-1000)', min: 0, max: 1000 },
    { value: 'intermediate', label: 'Intermediate (1000-1500)', min: 1000, max: 1500 },
    { value: 'advanced', label: 'Advanced (1500-2000)', min: 1500, max: 2000 },
    { value: 'expert', label: 'Expert (2000+)', min: 2000, max: Infinity },
] as const;

type CohortLevelValue = (typeof COHORT_LEVELS)[number]['value'];

function rangesOverlap(a: { min: number; max: number }, b: { min: number; max: number }): boolean {
    return a.min <= b.max && b.min <= a.max;
}

function matchesCohortLevel(c: LiveClass, level: CohortLevelValue): boolean {
    if (level === 'all') return true;
    const levelDef = COHORT_LEVELS.find((l) => l.value === level);
    if (!levelDef || levelDef.value === 'all') return true;

    const [min, max] = getCohortRangeInt(c.cohortRange);
    return rangesOverlap({ min, max }, { min: levelDef.min, max: levelDef.max });
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
    const [cohortLevel, setCohortLevel] = useState<CohortLevelValue>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
        (c) =>
            matchesSearch(c, searchQuery) &&
            matchesTagFilter(c, selectedTags) &&
            matchesCohortLevel(c, cohortLevel),
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
        setCohortLevel('all');
    };

    const hasFilter = selectedTags.length > 0 || searchQuery.trim() !== '' || cohortLevel !== 'all';

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
                sx={{ mt: 2 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position='start'>
                                <Search />
                            </InputAdornment>
                        ),
                    },
                }}
            />

            <Stack direction='row' flexWrap='wrap' gap={1} alignItems='center' sx={{ mt: 2 }}>
                <Tooltip title='Show all recordings'>
                    <Chip
                        label='All'
                        variant={selectedTags.length === 0 ? 'filled' : 'outlined'}
                        color={selectedTags.length === 0 ? 'primary' : 'default'}
                        onClick={() => setSelectedTags([])}
                        sx={{ cursor: 'pointer' }}
                    />
                </Tooltip>
                <Tooltip title='Show recordings with tag: Lecture'>
                    <Chip
                        label='Lecture'
                        variant={
                            selectedTags.includes(SubscriptionTier.Lecture) ? 'filled' : 'outlined'
                        }
                        color={
                            selectedTags.includes(SubscriptionTier.Lecture) ? 'primary' : 'default'
                        }
                        onClick={() => toggleTag(SubscriptionTier.Lecture)}
                        sx={{ cursor: 'pointer' }}
                        icon={<PresenterIcon sx={{ fontSize: '1.5rem' }} />}
                    />
                </Tooltip>
                <Tooltip title='Show recordings with tag: Game & Profile Review'>
                    <Chip
                        label='Game & Profile Review'
                        variant={
                            selectedTags.includes(SubscriptionTier.GameReview)
                                ? 'filled'
                                : 'outlined'
                        }
                        color={
                            selectedTags.includes(SubscriptionTier.GameReview)
                                ? 'primary'
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
                            variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                            color={selectedTags.includes(tag) ? 'primary' : 'default'}
                            onClick={() => toggleTag(tag)}
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                ))}
            </Stack>

            <Stack
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                gap={1}
                sx={{ mt: 2 }}
                flexWrap='wrap'
            >
                <Select
                    size='small'
                    value={cohortLevel}
                    onChange={(e) => setCohortLevel(e.target.value)}
                    sx={{ minWidth: 220 }}
                >
                    {COHORT_LEVELS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>

                <Stack direction='row' alignItems='center' gap={1}>
                    <Typography variant='subtitle2' color='text.secondary'>
                        {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}
                    </Typography>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v: 'grid' | 'list') => setViewMode(v)}
                        aria-label='view mode'
                        size='small'
                    >
                        <Tooltip title='Grid view'>
                            <ToggleButton value='grid' aria-label='grid'>
                                <ViewModule />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title='List view'>
                            <ToggleButton value='list' aria-label='list'>
                                <ViewList />
                            </ToggleButton>
                        </Tooltip>
                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            <Stack spacing={5} mt={5}>
                {filteredClasses.length > 0 ? (
                    <LiveClasses
                        classes={filteredClasses}
                        onPlay={onPlay}
                        onTagClick={toggleTag}
                        selectedTags={selectedTags}
                        variant={viewMode}
                    />
                ) : hasFilter ? (
                    <Stack alignItems='center'>
                        <Typography sx={{ mt: 1 }}>No classes match your filters</Typography>
                        <Button variant='text' color='primary' onClick={onClearFilters}>
                            Clear Filters
                        </Button>
                    </Stack>
                ) : (
                    <Stack alignItems='center'>
                        <Typography sx={{ mt: 1 }}>No classes found</Typography>
                    </Stack>
                )}
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

function LiveClasses({
    classes,
    onPlay,
    onTagClick,
    selectedTags,
    variant,
}: {
    classes: LiveClass[];
    onPlay: (s3Key: string, tier: SubscriptionTier) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
    variant?: 'grid' | 'list';
}) {
    return (
        <Grid container mt={1} spacing={3}>
            {classes.map((c) => (
                <Grid key={c.name} size={variant === 'list' ? 12 : { xs: 12, sm: 6, lg: 4 }}>
                    <LiveClassCard
                        c={c}
                        onPlay={onPlay}
                        onTagClick={onTagClick}
                        selectedTags={selectedTags}
                        variant={variant}
                    />
                </Grid>
            ))}
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
                    : {}),
            }}
        >
            {c.imageUrl && (
                <CardMedia
                    component='img'
                    image={c.imageUrl}
                    alt={`${c.name} cover`}
                    sx={{
                        height: 'auto',
                        width: '100%',
                        objectFit: 'cover',
                        ...(isList
                            ? {
                                  height: { sm: 140 },
                                  width: { sm: 200 },
                                  minWidth: { sm: 200 },
                                  pl: { sm: 2 },
                                  borderRadius: { sm: 1 },
                              }
                            : {}),
                    }}
                />
            )}
            <CardContent
                sx={{
                    pt: c.imageUrl ? 2 : 3,
                    flex: 1,
                    minWidth: 0,
                    ...(isList ? { display: { sm: 'flex' }, flexDirection: { sm: 'column' } } : {}),
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
