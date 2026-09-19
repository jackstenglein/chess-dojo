'use client';

import { Link } from '@/components/navigation/Link';
import { Course, displayCourseType } from '@/database/course';
import { useRouter } from '@/hooks/useRouter';
import { useTranslatedCourse } from '@/translation/useTranslatedCourse';
import UpsellAlert from '@/upsell/UpsellAlert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Alert, Box, Button, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { getCategoryColor } from '../../../../(list)/CourseListItem';
import PurchaseOption from './PurchaseOption';

interface PurchaseCoursePageProps {
    course?: Course;
    preview?: boolean;
    isFreeTier: boolean;
}

const PurchaseCoursePage: React.FC<PurchaseCoursePageProps> = ({
    course: rawCourse,
    preview,
    isFreeTier,
}) => {
    const course = useTranslatedCourse(rawCourse) ?? rawCourse;
    const t = useTranslations('courses.purchase');

    if (!course) {
        return null;
    }

    const embedUrl = toYouTubeEmbedUrl(course.videoUrl);
    const showHeroMedia = Boolean(course.imageUrl || embedUrl);
    const showPurchaseOptions = !isFreeTier || course.availableForFreeUsers;
    const category = displayCourseType(course.type);
    const categoryColor = getCategoryColor(category);

    return (
        <Container maxWidth='lg' sx={{ pt: { xs: 3, md: 6 }, pb: 6 }}>
            <Stack spacing={4}>
                <PurchaseMessage course={course} isFreeTier={isFreeTier} />

                <Grid container spacing={{ xs: 3, md: 4 }} sx={{ alignItems: 'center' }}>
                    {showHeroMedia && (
                        <Grid size={{ xs: 12, md: 5 }}>
                            <CourseHeroMedia
                                imageUrl={course.imageUrl}
                                embedUrl={embedUrl}
                                alt={course.name}
                                playLabel={t('aboutThisCourse')}
                                videoTitle={t('introVideo')}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, md: showHeroMedia ? 7 : 12 }}>
                        <Stack spacing={1.5}>
                            <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                                <Chip
                                    size='small'
                                    label={category}
                                    sx={
                                        categoryColor.startsWith('#')
                                            ? {
                                                  backgroundColor: categoryColor,
                                                  color: 'white',
                                                  fontWeight: 500,
                                              }
                                            : { fontWeight: 500 }
                                    }
                                />
                                <Chip
                                    size='small'
                                    label={course.cohortRange}
                                    variant='outlined'
                                    icon={<ShowChartIcon />}
                                />
                                {course.color !== 'None' && (
                                    <Chip size='small' label={course.color} variant='outlined' />
                                )}
                            </Stack>

                            <Typography
                                variant='h4'
                                component='h1'
                                sx={{ fontWeight: 700, lineHeight: 1.25 }}
                            >
                                {course.name}
                            </Typography>

                            {course.ownerDisplayName && (
                                <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                                    <PersonOutlinedIcon fontSize='small' color='action' />
                                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                        <Link href={`/profile/${course.owner}`}>
                                            {course.ownerDisplayName}
                                        </Link>
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                <Grid container spacing={{ xs: 3, md: 4 }} sx={{ alignItems: 'flex-start' }}>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Stack spacing={3}>
                            <Stack spacing={2}>
                                {course.description.split('\n\n').map((p, i) => (
                                    <Typography key={i} sx={{ lineHeight: 1.7 }}>
                                        {p}
                                    </Typography>
                                ))}
                            </Stack>

                            {course.whatsIncluded && course.whatsIncluded.length > 0 && (
                                <Stack spacing={1.5}>
                                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                                        {t('whatsIncluded')}
                                    </Typography>
                                    <Stack spacing={1.25}>
                                        {course.whatsIncluded.map((item, i) => (
                                            <Stack
                                                key={i}
                                                direction='row'
                                                spacing={1.5}
                                                sx={{ alignItems: 'flex-start' }}
                                            >
                                                <CheckCircleIcon
                                                    color='success'
                                                    fontSize='small'
                                                    sx={{ mt: 0.35 }}
                                                />
                                                <Typography>{item}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>
                    </Grid>

                    {showPurchaseOptions &&
                        course.purchaseOptions &&
                        course.purchaseOptions.length > 0 && (
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Stack
                                    spacing={2}
                                    sx={{
                                        position: { md: 'sticky' },
                                        top: { md: 'calc(var(--navbar-height) + 16px)' },
                                    }}
                                >
                                    {course.purchaseOptions.map((option) => (
                                        <PurchaseOption
                                            key={option.name}
                                            course={course}
                                            purchaseOption={option}
                                            preview={preview}
                                        />
                                    ))}
                                </Stack>
                            </Grid>
                        )}
                </Grid>
            </Stack>
        </Container>
    );
};

function CourseHeroMedia({
    imageUrl,
    embedUrl,
    alt,
    playLabel,
    videoTitle,
}: {
    imageUrl?: string;
    embedUrl?: string;
    alt: string;
    playLabel: string;
    videoTitle: string;
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const showPlayer = Boolean(embedUrl) && (isPlaying || !imageUrl);
    const playerSrc =
        showPlayer && embedUrl ? (isPlaying ? withAutoplay(embedUrl) : embedUrl) : undefined;

    return (
        <Box
            sx={{
                position: 'relative',
                width: 1,
                aspectRatio: '16 / 9',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'common.black',
                boxShadow: 2,
            }}
        >
            {showPlayer && playerSrc ? (
                <iframe
                    src={playerSrc}
                    title={videoTitle}
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                    allowFullScreen
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 0,
                    }}
                />
            ) : (
                <>
                    {imageUrl && (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt={alt}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                crossOrigin='anonymous'
                            />
                        </>
                    )}
                    {embedUrl && (
                        <Box
                            role='button'
                            tabIndex={0}
                            aria-label={playLabel}
                            onClick={() => setIsPlaying(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setIsPlaying(true);
                                }
                            }}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0.28)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.42)' },
                            }}
                        >
                            <PlayCircleFilledIcon sx={{ fontSize: 80, color: 'common.white' }} />
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
}

interface PurchaseMessageProps {
    course: Course;
    isFreeTier: boolean;
}

const PurchaseMessage: React.FC<PurchaseMessageProps> = ({ course, isFreeTier }) => {
    const t = useTranslations('courses.purchase');
    const router = useRouter();

    const onViewPrices = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const currentPage = encodeURIComponent(window.location.href);
        router.push(`/prices?redirect=${currentPage}`);
    };

    if (isFreeTier) {
        if (!course.availableForFreeUsers) {
            return <UpsellAlert>{t('subscribersOnly')}</UpsellAlert>;
        }
        if (course.includedWithSubscription) {
            return (
                <Alert
                    severity='info'
                    action={
                        <Button color='inherit' href='/prices' size='small' onClick={onViewPrices}>
                            {t('viewPrices')}
                        </Button>
                    }
                >
                    {t('alsoUnlockBySubscribing')}
                </Alert>
            );
        }
        return null;
    }

    return <Alert severity='info'>{t('soldSeparately')}</Alert>;
};

/** Converts a YouTube watch, share, shorts, or embed URL into an embed URL. */
function toYouTubeEmbedUrl(url: string | undefined): string | undefined {
    const trimmed = url?.trim();
    if (!trimmed) {
        return undefined;
    }
    const id = getYouTubeVideoId(trimmed);
    if (id) {
        return `https://www.youtube.com/embed/${id}`;
    }
    return trimmed;
}

/** Adds the autoplay parameter to a YouTube URL. */
function withAutoplay(url: string): string {
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('autoplay', '1');
        return parsed.toString();
    } catch {
        return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    }
}

function getYouTubeVideoId(href: string): string | null {
    try {
        const parsed = new URL(href);
        const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
        if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
            if (parsed.pathname === '/watch') {
                return parsed.searchParams.get('v');
            }
            const embedMatch = /^\/embed\/([a-zA-Z0-9_-]+)/.exec(parsed.pathname);
            if (embedMatch) {
                return embedMatch[1];
            }
            const shortsMatch = /^\/shorts\/([a-zA-Z0-9_-]+)/.exec(parsed.pathname);
            if (shortsMatch) {
                return shortsMatch[1];
            }
        }
        if (host === 'youtu.be') {
            return parsed.pathname.slice(1).split('/')[0] || null;
        }
    } catch {
        return null;
    }
    return null;
}

export default PurchaseCoursePage;
