'use client';

import communityImage from '@/components/landing/kostya-david.webp';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import {
    CalendarMonth,
    EmojiEvents,
    Groups,
    Hub,
    Insights,
    LiveTv,
    LocalLibrary,
    MenuBook,
    Route,
    School,
    Speed,
    Visibility,
} from '@mui/icons-material';
import { Box, Stack } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import Image from 'next/image';
import { JSX } from 'react';
import { DOJO_FEATURES, DojoFeatureIcon } from '../content';
import { Body, Condensed, EASE_OUT, HAIRLINE, Heading, Section } from './shared';

const ICONS: Record<DojoFeatureIcon, JSX.Element> = {
    plan: <Route fontSize='inherit' />,
    tasks: <CalendarMonth fontSize='inherit' />,
    progress: <Insights fontSize='inherit' />,
    spy: <Visibility fontSize='inherit' />,
    courses: <LocalLibrary fontSize='inherit' />,
    games: <MenuBook fontSize='inherit' />,
    tests: <Speed fontSize='inherit' />,
    tournaments: <EmojiEvents fontSize='inherit' />,
    discord: <DiscordIcon fontSize='inherit' />,
    cohort: <Groups fontSize='inherit' />,
    study: <School fontSize='inherit' />,
    clubs: <Hub fontSize='inherit' />,
    graduation: <LiveTv fontSize='inherit' />,
};

const INK_TEXT = '#0B0B12';
const WHITE_TEXT = '#FFFFFF';

/** Each pair keeps the text above 4.5:1 on its card color. */
const CARD_COLORS: Record<DojoFeatureIcon, { bg: string; text: string }> = {
    plan: { bg: '#F7941F', text: INK_TEXT },
    tasks: { bg: '#1565D8', text: WHITE_TEXT },
    progress: { bg: '#33B679', text: INK_TEXT },
    spy: { bg: '#6448C9', text: WHITE_TEXT },
    courses: { bg: '#E7BA51', text: INK_TEXT },
    games: { bg: '#0B6E78', text: WHITE_TEXT },
    tests: { bg: '#F0799F', text: INK_TEXT },
    tournaments: { bg: '#B93A28', text: WHITE_TEXT },
    discord: { bg: '#4F5BE0', text: WHITE_TEXT },
    cohort: { bg: '#7FD6A6', text: INK_TEXT },
    study: { bg: '#4FC3F7', text: INK_TEXT },
    clubs: { bg: '#963A92', text: WHITE_TEXT },
    graduation: { bg: '#F2D15C', text: INK_TEXT },
};

const hover = keyframes`
    0%, 100% { transform: translateY(0) rotate(var(--tilt)); }
    50% { transform: translateY(-13px) rotate(calc(var(--tilt) * -1)); }
`;

const flyIn = keyframes`
    from {
        opacity: 0;
        transform: translate(var(--from-x), var(--from-y)) rotate(var(--from-tilt)) scale(0.8);
    }
    to { opacity: 1; transform: none; }
`;

const COLUMN_OFFSETS = ['0rem', '4rem', '1.5rem', '5rem'];
const COLUMN_COUNT = COLUMN_OFFSETS.length;

function flyInSx(index: number) {
    return {
        // Fixed per card, so the server and the client render the same values.
        '--from-x': `${(index % COLUMN_COUNT) * 70 - 105}px`,
        '--from-y': `${80 + (index % 3) * 40}px`,
        '--from-tilt': `${index % 2 ? 10 : -10}deg`,
        '@supports (animation-timeline: view())': {
            '@media (prefers-reduced-motion: no-preference)': {
                animation: `${flyIn} linear both`,
                animationTimeline: 'view()',
                animationRange: 'entry 0% entry 75%',
            },
        },
    };
}

function floatSx(index: number) {
    return {
        '--tilt': `${index % 2 ? 1 : -1}deg`,
        animation: `${hover} ${6 + (index % 5) * 0.9}s ease-in-out ${-index * 1.1}s infinite`,
    };
}

function FeatureCard({
    feature,
    index,
}: {
    feature: (typeof DOJO_FEATURES)[number];
    index: number;
}) {
    const { bg, text } = CARD_COLORS[feature.icon];

    return (
        <Box sx={flyInSx(index)}>
            <Box sx={floatSx(index)}>
                <Box
                    sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        p: { xs: 1.75, md: 2.5 },
                        minHeight: { xs: '11.5rem', md: '13rem' },
                        borderRadius: 3.5,
                        color: text,
                        bgcolor: bg,
                        boxShadow: `0 22px 44px -22px ${bg}`,
                        transition: `transform 350ms ${EASE_OUT}, box-shadow 350ms ${EASE_OUT}`,
                        '& .watermark': {
                            transition: `transform 500ms ${EASE_OUT}, opacity 350ms ${EASE_OUT}`,
                        },
                        '@media (hover: hover)': {
                            '&:hover': {
                                transform: 'translateY(-8px) scale(1.04) rotate(-1deg)',
                                boxShadow: `0 34px 60px -20px ${bg}`,
                            },
                            '&:hover .watermark': {
                                transform: 'scale(1.25) rotate(-10deg)',
                                opacity: 0.28,
                            },
                        },
                    }}
                >
                    <Box
                        className='watermark'
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            right: -14,
                            bottom: -18,
                            display: 'flex',
                            fontSize: '7.5rem',
                            opacity: 0.16,
                        }}
                    >
                        {ICONS[feature.icon]}
                    </Box>
                    <Box sx={{ position: 'relative' }}>
                        <Box sx={{ display: 'flex', fontSize: '2rem' }}>{ICONS[feature.icon]}</Box>
                        <Condensed
                            component='h3'
                            sx={{
                                mt: 1,
                                textTransform: 'uppercase',
                                fontSize: { xs: '1.2rem', md: '1.45rem' },
                                lineHeight: 1.05,
                            }}
                        >
                            {feature.title}
                        </Condensed>
                        <Body
                            sx={{
                                mt: 0.75,
                                color: text,
                                fontSize: { xs: '0.9rem', md: '1rem' },
                                lineHeight: 1.35,
                            }}
                        >
                            {feature.description}
                        </Body>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export function Community() {
    const columns = COLUMN_OFFSETS.map((_, column) =>
        DOJO_FEATURES.map((feature, index) => ({ feature, index })).filter(
            ({ index }) => index % COLUMN_COUNT === column,
        ),
    );

    return (
        <Box sx={{ borderTop: `1px solid ${HAIRLINE}`, overflow: 'clip' }}>
            <Section maxWidth='xl'>
                <Heading center description='Both class plans include everything on these cards.'>
                    You don’t have to improve alone
                </Heading>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: { xs: 1.5, md: 2.5 },
                        alignItems: 'start',
                    }}
                >
                    {columns.map((cards, column) => (
                        <Stack
                            key={COLUMN_OFFSETS[column]}
                            sx={{
                                display: { xs: 'contents', md: 'flex' },
                                gap: 2.5,
                                mt: { md: COLUMN_OFFSETS[column] },
                            }}
                        >
                            {column === 1 && (
                                <Box
                                    sx={{
                                        ...flyInSx(4),
                                        gridColumn: { xs: '1 / -1', md: 'auto' },
                                    }}
                                >
                                    <Box sx={floatSx(3)}>
                                        <Image
                                            src={communityImage}
                                            alt='IM Kostya Kavutskiy and IM David Pruess sitting on a giant chessboard'
                                            sizes='(max-width: 900px) 100vw, 320px'
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            )}
                            {cards.map(({ feature, index }) => (
                                <FeatureCard key={feature.title} feature={feature} index={index} />
                            ))}
                        </Stack>
                    ))}
                </Box>
            </Section>
        </Box>
    );
}
