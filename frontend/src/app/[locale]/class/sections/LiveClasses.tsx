'use client';

import { anton } from '@/components/landing/fonts';
import kostyaImage from '@/components/landing/kostya.webp';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { Box, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import Image from 'next/image';
import { CLASS_COVERS, CLASS_FACTS, ClassId, LIBRARY } from '../content';
import {
    Body,
    Condensed,
    HAIRLINE,
    Heading,
    LIBRARY_ELEMENT_ID,
    LIVE_CLASSES_ELEMENT_ID,
    MUTED,
    ORANGE,
    Section,
    useCountUp,
} from './shared';
import { VideoPlayer } from './VideoPlayer';
import { WeekCalendar } from './WeekCalendar';

const slide = keyframes`
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
`;

function CalculationCover() {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                containerType: 'inline-size',
                background: 'linear-gradient(115deg, #071226 0%, #0F2F63 58%, #1875EE 100%)',
                overflow: 'hidden',
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.07,
                    backgroundImage: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)',
                    backgroundSize: '12.5cqw 12.5cqw',
                }}
            />
            <ChessDojoIcon
                sx={{
                    position: 'absolute',
                    left: '4cqw',
                    top: '3cqw',
                    fontSize: '7cqw',
                    color: 'common.white',
                }}
            />
            <Box sx={{ position: 'absolute', left: '4cqw', top: '13cqw' }}>
                <Typography
                    component='span'
                    sx={{
                        display: 'block',
                        fontFamily: (theme) => fontFamily(theme, anton),
                        fontSize: '9.5cqw',
                        lineHeight: 1.05,
                        color: 'common.white',
                    }}
                >
                    CALCULATION
                </Typography>
                <Typography
                    component='span'
                    sx={{
                        display: 'block',
                        fontFamily: (theme) => fontFamily(theme, anton),
                        fontSize: '9.5cqw',
                        lineHeight: 1.05,
                        color: ORANGE,
                    }}
                >
                    1000+
                </Typography>
            </Box>
            <Box
                sx={{
                    position: 'absolute',
                    right: '-1cqw',
                    bottom: '-2cqw',
                    width: '45cqw',
                }}
            >
                <Image
                    src={kostyaImage}
                    alt=''
                    sizes='(max-width: 900px) 45vw, 300px'
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                />
            </Box>
        </Box>
    );
}

function LibraryStat({
    target,
    suffix = '',
    label,
}: {
    target: number;
    suffix?: string;
    label: string;
}) {
    const { ref, value } = useCountUp<HTMLDivElement>(target);

    return (
        <Box ref={ref}>
            <Typography
                sx={{
                    fontFamily: (theme) => fontFamily(theme, anton),
                    fontSize: { xs: '2.6rem', sm: '3.5rem', md: '4.5rem' },
                    lineHeight: 1.1,
                    color: ORANGE,
                    minWidth: `${String(target).length + suffix.length}ch`,
                }}
            >
                {value}
                {suffix}
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    mt: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    fontSize: { xs: '0.8rem', sm: '0.95rem' },
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

export function LiveClasses({
    playing,
    onPlay,
}: {
    playing: boolean;
    onPlay: (classId: ClassId) => void;
}) {
    return (
        <Box>
            <Section id={LIVE_CLASSES_ELEMENT_ID} sx={{ pb: { xs: 3, md: 4 } }}>
                <Heading
                    sx={{ mb: { xs: 3, md: 4 }, maxWidth: '50rem' }}
                    description='Workshop members can join all six classes. Game & Profile Review members also meet their own team twice a week.'
                >
                    A week of live classes with GMs and IMs
                </Heading>
                <WeekCalendar />
            </Section>

            <Section sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 3, md: 5 } }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
                        gap: { xs: 4, md: 7 },
                        alignItems: 'center',
                    }}
                >
                    <Box>
                        <VideoPlayer
                            youtubeId='QPqV-nAuLXo'
                            title='Calculation 1000+ with IM Kostya Kavutskiy'
                            posterNode={<CalculationCover />}
                            playAt={{ x: '24%', y: '74%' }}
                            playing={playing}
                            onPlay={() => onPlay('calculation')}
                        />
                        <Typography variant='body2' sx={{ mt: 1.25, color: MUTED }}>
                            Free sample: IM Kostya Kavutskiy’s Saturday calculation class. 60 min.
                        </Typography>
                    </Box>
                    <Box>
                        <Condensed
                            component='h3'
                            sx={{
                                fontSize: { xs: '2.25rem', md: '2.75rem' },
                                fontWeight: 500,
                                mb: 2.5,
                            }}
                        >
                            How a class works
                        </Condensed>
                        {CLASS_FACTS.map((fact) => (
                            <Box
                                key={fact.title}
                                sx={{ py: 1.75, borderTop: `1px solid ${HAIRLINE}` }}
                            >
                                <Condensed sx={{ fontSize: '1.4rem' }}>{fact.title}</Condensed>
                                <Body sx={{ mt: 0.25, fontSize: '1.05rem' }}>
                                    {fact.description}
                                </Body>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Section>

            <Section
                id={LIBRARY_ELEMENT_ID}
                sx={{ py: { xs: 0, md: 0 }, mb: { xs: 3, md: 4 }, scrollMarginTop: '2.5rem' }}
            >
                <Condensed
                    component='h3'
                    sx={{ fontSize: { xs: '2.25rem', md: '2.75rem' }, fontWeight: 500 }}
                >
                    Plus every past class, on demand
                </Condensed>
                <Box
                    sx={{
                        mt: { xs: 2.5, md: 3 },
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, auto)',
                        justifyContent: 'start',
                        columnGap: { xs: 3, sm: 6, md: 9 },
                    }}
                >
                    <LibraryStat
                        target={LIBRARY.totalRecordings}
                        suffix='+'
                        label='Classes on demand'
                    />
                    <LibraryStat target={LIBRARY.totalHours} suffix='+' label='Hours to watch' />
                    <LibraryStat target={LIBRARY.courses} label='Courses' />
                </Box>
                <Body sx={{ mt: { xs: 2.5, md: 3 }, maxWidth: '46rem' }}>
                    Workshops members get all {LIBRARY.courses} courses from day one:{' '}
                    {LIBRARY.workshopRecordings}+ classes and {LIBRARY.workshopHours}+ hours to
                    watch. Game &amp; Profile Review adds the recordings of every review team.
                </Body>
            </Section>
            <Box
                sx={{
                    pb: { xs: '4.5rem', md: '7rem' },
                    overflowX: { xs: 'auto', md: 'hidden' },
                    '&:hover .track': { animationPlayState: 'paused' },
                    maskImage: {
                        md: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
                    },
                }}
            >
                <Stack
                    className='track'
                    direction='row'
                    sx={{
                        width: 'max-content',
                        gap: 2.5,
                        pr: 2.5,
                        pl: { xs: 2, md: 0 },
                        animation: {
                            md: `${slide} ${CLASS_COVERS.length * 10}s linear infinite`,
                        },
                    }}
                >
                    {[...CLASS_COVERS, ...CLASS_COVERS].map((cover, index) => (
                        <Box
                            key={`${cover.name}-${index}`}
                            aria-hidden={index >= CLASS_COVERS.length}
                            sx={{
                                width: { xs: '17rem', md: '22rem' },
                                display: {
                                    xs: index >= CLASS_COVERS.length ? 'none' : 'block',
                                    md: 'block',
                                },
                            }}
                        >
                            <Box
                                component='img'
                                src={cover.imageUrl}
                                alt=''
                                loading='lazy'
                                sx={{
                                    width: 1,
                                    aspectRatio: '16 / 9',
                                    objectFit: 'cover',
                                    borderRadius: 2,
                                    display: 'block',
                                }}
                            />
                            <Condensed component='h4' sx={{ mt: 1.25, fontSize: '1.35rem' }}>
                                {cover.name}
                            </Condensed>
                            <Typography variant='body2' sx={{ color: MUTED }}>
                                {cover.teacher} · {cover.detail}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}
