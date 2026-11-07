'use client';

import { anton, barlowCondensed } from '@/components/landing/fonts';
import backgroundImage from '@/components/landing/main-background.webp';
import { Link } from '@/components/navigation/Link';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { ArrowDownward } from '@mui/icons-material';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import Image from 'next/image';
import { useEffect } from 'react';
import posterImage from '../assets/logical-chess-poster.webp';
import { rememberAttribution } from '../classLead';
import { ClassId, CORE_OFFER, WORKSHOPS_OFFER } from '../content';
import {
    Body,
    Condensed,
    EASE_OUT,
    INK,
    LIVE_CLASSES_ELEMENT_ID,
    ORANGE,
    riseIn,
    scrollToOffer,
} from './shared';
import { VideoPlayer } from './VideoPlayer';

const slowPush = keyframes`
    from { transform: scale(1.02); }
    to { transform: scale(1.14) translateY(-1.5%); }
`;

const drawStroke = keyframes`
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
`;

const nudge = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(5px); }
`;

function entranceSx(delayMs: number) {
    return { animation: `${riseIn} 900ms ${EASE_OUT} ${delayMs}ms both` };
}

export function Hero({
    playing,
    onPlay,
}: {
    playing: boolean;
    onPlay: (classId: ClassId) => void;
}) {
    useEffect(() => {
        rememberAttribution(window.location.search);
    }, []);

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: -2,
                    animation: `${slowPush} 40s ease-out both alternate infinite`,
                }}
            >
                <Image
                    src={backgroundImage}
                    alt=''
                    fill
                    priority
                    sizes='100vw'
                    style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
                />
            </Box>
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: -1,
                    background: `linear-gradient(180deg, rgba(7, 7, 18, 0.86) 0%, rgba(7, 7, 18, 0.93) 55%, ${INK} 100%)`,
                }}
            />

            <Container maxWidth='lg' sx={{ pt: 2.5, pb: { xs: 5, md: 7 } }}>
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <Stack
                        component={Link}
                        href='/'
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            gap: 1,
                            color: 'common.white',
                            textDecoration: 'none',
                        }}
                    >
                        <ChessDojoIcon sx={{ fontSize: '2.75rem' }} />
                        <Typography
                            sx={{
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                fontWeight: 600,
                                fontSize: '1.6rem',
                            }}
                        >
                            ChessDojo
                        </Typography>
                    </Stack>
                    <Button
                        onClick={scrollToOffer}
                        sx={{ color: ORANGE, fontWeight: 600, minHeight: 44, px: 1.5 }}
                    >
                        See plans
                    </Button>
                </Stack>

                <Box sx={{ textAlign: 'center', mt: { xs: 3.5, md: 5 } }}>
                    <Condensed
                        sx={{
                            ...entranceSx(0),
                            mb: 1.5,
                            color: ORANGE,
                            fontSize: { xs: '1.05rem', md: '1.3rem' },
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Got mated? Free class with GM Jesse Kraai
                    </Condensed>
                    <Typography
                        component='h1'
                        sx={{
                            ...entranceSx(0),
                            fontFamily: (theme) => fontFamily(theme, anton),
                            fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.6rem' },
                            lineHeight: 1.08,
                            letterSpacing: '0.005em',
                        }}
                    >
                        Stuck at the same rating?
                        <br />
                        See how Dojo members{' '}
                        <Box component='span' sx={{ position: 'relative', whiteSpace: 'nowrap' }}>
                            <Box component='span' sx={{ color: ORANGE }}>
                                get moving again
                            </Box>
                            <Box
                                component='svg'
                                aria-hidden
                                viewBox='0 0 600 22'
                                preserveAspectRatio='none'
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    bottom: { xs: '-0.2em', md: '-0.22em' },
                                    width: 1,
                                    height: '0.22em',
                                    overflow: 'visible',
                                }}
                            >
                                <Box
                                    component='path'
                                    d='M4 15 C 120 5, 260 3, 330 7 S 520 12, 596 6'
                                    pathLength={1}
                                    fill='none'
                                    stroke={ORANGE}
                                    strokeWidth={5}
                                    strokeLinecap='round'
                                    vectorEffect='non-scaling-stroke'
                                    sx={{
                                        strokeDasharray: 1,
                                        animation: `${drawStroke} 1100ms ${EASE_OUT} 500ms both`,
                                    }}
                                />
                            </Box>
                        </Box>
                    </Typography>
                    <Body
                        sx={{
                            ...entranceSx(120),
                            mt: { xs: 3, md: 3.5 },
                            color: 'common.white',
                            fontSize: { xs: '1.15rem', md: '1.4rem' },
                        }}
                    >
                        Start with a free 70-minute class: GM Jesse Kraai takes real students
                        through two classic games, move by move. Then see the plan and the weekly
                        live classes behind 4,900+ graduations.
                    </Body>
                </Box>

                <Box
                    sx={{
                        ...entranceSx(240),
                        mt: { xs: 3, md: 4 },
                        maxWidth: { xs: 1, md: 'min(62rem, calc((100vh - 27rem) * 16 / 9))' },
                        minWidth: { md: '38rem' },
                        mx: 'auto',
                    }}
                >
                    <VideoPlayer
                        youtubeId='JCKN4drZ160'
                        title='Logical Chess Move by Move with GM Jesse Kraai'
                        poster={posterImage}
                        playAt={{ x: '50%', y: '80%' }}
                        priority
                        playing={playing}
                        onPlay={() => onPlay('logical-chess')}
                        overlay={
                            <Stack
                                direction='row'
                                component='span'
                                sx={{
                                    px: { xs: 1.5, md: 3 },
                                    pb: { xs: 1, md: 2 },
                                    color: 'common.white',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: 2,
                                }}
                            >
                                <Condensed
                                    component='span'
                                    sx={{ fontSize: { xs: '1rem', md: '1.5rem' } }}
                                >
                                    <Box
                                        component='span'
                                        sx={{ display: { xs: 'none', sm: 'inline' } }}
                                    >
                                        Recorded live, questions included
                                    </Box>
                                </Condensed>
                                <Condensed
                                    component='span'
                                    sx={{
                                        fontSize: { xs: '0.9rem', md: '1.1rem' },
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Watch the free class (70 min)
                                </Condensed>
                            </Stack>
                        }
                    />
                </Box>

                <Stack
                    sx={{
                        mt: { xs: 5, md: 7 },
                        mx: 'auto',
                        maxWidth: '46rem',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 2.5,
                    }}
                >
                    {playing ? (
                        <>
                            <Condensed
                                component='h2'
                                sx={{
                                    fontWeight: 500,
                                    fontSize: { xs: '2.1rem', md: '3rem' },
                                    lineHeight: 1.08,
                                    textWrap: 'balance',
                                }}
                            >
                                You’re in. The class is playing above.
                            </Condensed>
                            <Body sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                                We’ve emailed you the link so you can finish it later. Try this
                                while you watch: pause before each move and guess it before Jesse
                                explains it.
                            </Body>
                            <Condensed
                                component='h3'
                                sx={{
                                    mt: 1,
                                    fontWeight: 500,
                                    fontSize: { xs: '1.6rem', md: '2rem' },
                                }}
                            >
                                Want to ask a question yourself?
                            </Condensed>
                            <Body sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' } }}>
                                There are six live classes on this week’s calendar, from Tactics
                                Bootcamp (under 1200) to Typical Pawn Structures (1200+).
                            </Body>
                            <Stack
                                direction='row'
                                sx={{ gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}
                            >
                                <Button
                                    variant='contained'
                                    color='dojoOrange'
                                    size='large'
                                    onClick={() =>
                                        document
                                            .getElementById(LIVE_CLASSES_ELEMENT_ID)
                                            ?.scrollIntoView({ behavior: 'smooth' })
                                    }
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '1.05rem',
                                        minHeight: 52,
                                        px: 4,
                                    }}
                                >
                                    See this week’s classes
                                </Button>
                                <Button
                                    variant='outlined'
                                    color='inherit'
                                    size='large'
                                    onClick={scrollToOffer}
                                    sx={{
                                        fontWeight: 600,
                                        minHeight: 52,
                                        borderColor: 'rgba(255,255,255,0.6)',
                                    }}
                                >
                                    See plans
                                </Button>
                            </Stack>
                        </>
                    ) : (
                        <>
                            <Condensed
                                component='h2'
                                sx={{
                                    fontWeight: 500,
                                    fontSize: { xs: '2.1rem', md: '3rem' },
                                    lineHeight: 1.08,
                                    textWrap: 'balance',
                                }}
                            >
                                That’s one class. Members get six workshops a week.
                            </Condensed>
                            <Body sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                                Each one comes with a recording and its own Discord channel, on top
                                of a training plan built for your rating.
                            </Body>
                            <Button
                                variant='contained'
                                color='dojoOrange'
                                size='large'
                                onClick={scrollToOffer}
                                endIcon={
                                    <ArrowDownward
                                        sx={{ animation: `${nudge} 2.2s ease-in-out infinite` }}
                                    />
                                }
                                sx={{ fontWeight: 600, fontSize: '1.05rem', minHeight: 52, px: 4 }}
                            >
                                See plans and prices
                            </Button>
                            <Body sx={{ fontSize: '1rem' }}>
                                Live classes from ${WORKSHOPS_OFFER.price.year}/month billed yearly.
                                Training plan from ${CORE_OFFER.price.year}.
                            </Body>
                        </>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}
