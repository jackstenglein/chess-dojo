'use client';

import { PresenterIcon } from '@/style/PresenterIcon';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    LiveClass,
    LiveClassRecording,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { Person, ShowChart, Troubleshoot } from '@mui/icons-material';
import {
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Chip,
    Grid,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { LiveClassVideoDialog } from './LiveClassVideoDialog';
import { useLiveClassPlayback } from './useLiveClassPlayback';

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
    const { playingUrl, setPlayingUrl, showUpsell, setShowUpsell, playRecording } =
        useLiveClassPlayback();

    return (
        <Grid
            container
            spacing={3}
            sx={{
                mt: 1,
            }}
        >
            {classes.map((c) => (
                <Grid
                    key={c.name}
                    size={variant === 'list' ? 12 : { xs: 12, sm: 6, lg: 4 }}
                    sx={variant === 'grid' ? { display: 'flex' } : undefined}
                >
                    <LiveClassCard
                        c={c}
                        onPlay={playRecording}
                        onTagClick={onTagClick}
                        selectedTags={selectedTags}
                        variant={variant}
                    />
                </Grid>
            ))}

            <LiveClassVideoDialog
                playingUrl={playingUrl}
                onClose={() => setPlayingUrl(undefined)}
                showUpsell={showUpsell}
                onCloseUpsell={() => setShowUpsell(undefined)}
            />
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
    const hasMultipleRecordings = c.recordings.length > 1;

    const handleCardClick = () => {
        if (singleRecording) {
            onPlay(singleRecording, c.type);
        }
    };

    const classSlug = c.id ?? encodeURIComponent(c.name);
    const cardActionProps = hasMultipleRecordings
        ? { href: `/learn/live-classes/${classSlug}` }
        : { onClick: handleCardClick };

    return (
        <Card
            variant='outlined'
            sx={{
                overflow: 'hidden',
                width: '100%',
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
            <CardActionArea
                {...cardActionProps}
                sx={{
                    display: 'flex',
                    flexDirection: isList ? { xs: 'column', sm: 'row' } : 'column',
                    alignItems: isList ? { sm: 'center' } : undefined,
                    flex: 1,
                    height: '100%',
                }}
            >
                {c.imageUrl && (
                    <CardMedia
                        component='img'
                        image={c.imageUrl}
                        alt={t('card.cover', { name: c.name })}
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
                        width: '100%',
                        ...(isList
                            ? { display: { sm: 'flex' }, flexDirection: { sm: 'column' } }
                            : {}),
                        ...(variant === 'grid'
                            ? { display: 'flex', flexDirection: 'column', minHeight: 0 }
                            : {}),
                    }}
                >
                    <Typography variant='h6' component='h2' gutterBottom>
                        {c.name}
                    </Typography>

                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        {c.teacher && (
                            <Stack
                                direction='row'
                                spacing={0.75}
                                sx={{
                                    alignItems: 'center',
                                }}
                            >
                                <Person fontSize='small' color='action' />
                                <Typography
                                    variant='body2'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
                                    {c.teacher}
                                </Typography>
                            </Stack>
                        )}
                        <Stack
                            direction='row'
                            spacing={0.75}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <ShowChart fontSize='small' color='action' />
                            <Typography
                                variant='body2'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {c.cohortRange}
                            </Typography>
                        </Stack>
                    </Stack>

                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            gap: 0.75,
                            mb: 1.5,
                        }}
                    >
                        {c.type === SubscriptionTier.GameReview ? (
                            <Tooltip title={t('showTagGameReview')}>
                                <Chip
                                    label={t('gameReview')}
                                    size='small'
                                    variant='outlined'
                                    icon={<Troubleshoot />}
                                    onMouseDown={(e) => e.preventDefault()}
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
                                    onMouseDown={(e) => e.preventDefault()}
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
                                    onMouseDown={(e) => e.preventDefault()}
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
                        sx={{
                            color: 'text.secondary',
                            display: '-webkit-box',
                            WebkitLineClamp: 6,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',

                            ...(isList
                                ? { flex: { sm: 1 }, WebkitLineClamp: { xs: 6, sm: 2 } }
                                : {}),
                        }}
                    >
                        {c.description}
                    </Typography>

                    {hasMultipleRecordings && (
                        <Typography
                            variant='subtitle2'
                            sx={{
                                color: 'primary.main',
                                mt: 2,
                            }}
                        >
                            {t('card.recordingCount', { count: c.recordings.length })}
                        </Typography>
                    )}
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
