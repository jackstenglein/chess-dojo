'use client';

import { anton, barlowCondensed } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { ArrowDownward, PlayArrowRounded } from '@mui/icons-material';
import { Box, ButtonBase, Container, GlobalStyles } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { LIBRARY } from '../content';
import { EASE_OUT, HAIRLINE, INK, ORANGE, scrollToLibrary } from './shared';

/** Registers the counter as an integer so the browser can count up to it in CSS. */
const COUNT_PROPERTY =
    "@property --class-count { syntax: '<integer>'; initial-value: 0; inherits: false; }";

const dropIn = keyframes`
    from { opacity: 0; transform: translateY(-100%); }
    to { opacity: 1; transform: translateY(0); }
`;

const statIn = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
`;

const countUp = keyframes`
    from { --class-count: 0; }
`;

const ring = keyframes`
    from { opacity: 0.75; transform: scale(1); }
    70%, to { opacity: 0; transform: scale(2.2); }
`;

const beam = keyframes`
    from { transform: translateX(-100%); }
    55%, to { transform: translateX(400%); }
`;

const nudge = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
`;

/** The strip already says "on demand", and a phone has no room for the third number. */
const STATS = [
    { value: LIBRARY.totalRecordings, suffix: '+', label: 'Classes' },
    { value: LIBRARY.totalHours, suffix: '+', label: 'Hours to watch' },
    { value: LIBRARY.courses, suffix: '', label: 'Courses', hideOnPhone: true },
];

const HERO_STATS = [
    { value: LIBRARY.totalRecordings, suffix: '+', label: 'Classes on demand' },
    { value: LIBRARY.totalHours, suffix: '+', label: 'Hours to watch' },
    { value: LIBRARY.courses, suffix: '', label: 'Courses' },
];

const LIBRARY_LABEL = `${LIBRARY.totalRecordings}+ classes on demand, ${LIBRARY.totalHours}+ hours to watch, ${LIBRARY.courses} courses. See the library.`;

type StyleObject = Record<string, string | number | object | undefined>;

/** Counts from zero to the value in CSS. Without motion it simply shows the value. */
function CountNumber({
    value,
    suffix,
    delayMs,
    sx,
}: {
    value: number;
    suffix: string;
    delayMs: number;
    sx?: StyleObject;
}) {
    return (
        <Box
            component='span'
            sx={{
                '--class-count': String(value),
                counterReset: 'class-count var(--class-count)',
                animation: `${countUp} 1800ms ${EASE_OUT} ${delayMs}ms both`,
                display: 'inline-block',
                minWidth: `${String(value).length + suffix.length}ch`,
                fontFamily: (theme) => fontFamily(theme, anton),
                lineHeight: 1,
                letterSpacing: '0.01em',
                color: ORANGE,
                '&::after': { content: `counter(class-count) "${suffix}"` },
                ...sx,
            }}
        />
    );
}

function Stat({
    value,
    suffix,
    label,
    delayMs,
    hideOnPhone,
}: {
    value: number;
    suffix: string;
    label: string;
    delayMs: number;
    hideOnPhone?: boolean;
}) {
    return (
        <Box
            component='span'
            sx={{
                display: { xs: hideOnPhone ? 'none' : 'inline-flex', sm: 'inline-flex' },
                alignItems: 'baseline',
                gap: 0.75,
                animation: `${statIn} 500ms ${EASE_OUT} ${delayMs}ms both`,
            }}
        >
            <CountNumber
                value={value}
                suffix={suffix}
                delayMs={delayMs}
                sx={{ fontSize: { xs: '1.35rem', md: '1.45rem' } }}
            />
            <Box
                component='span'
                sx={{
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    color: 'rgba(255, 255, 255, 0.82)',
                }}
            >
                {label}
            </Box>
        </Box>
    );
}

/** The strip above the hero. Clicking it scrolls to the recorded library. */
export function LibraryBanner() {
    return (
        <>
            <GlobalStyles styles={COUNT_PROPERTY} />
            <ButtonBase
                disableRipple
                onClick={scrollToLibrary}
                aria-label={`All classes available on demand: ${LIBRARY_LABEL}`}
                sx={{
                    position: 'relative',
                    display: 'block',
                    width: 1,
                    overflow: 'hidden',
                    color: 'common.white',
                    // The same surface as the sticky offer bar at the bottom of the page.
                    bgcolor: 'rgba(18, 18, 28, 0.86)',
                    borderBottom: `1px solid ${HAIRLINE}`,
                    backdropFilter: 'blur(10px)',
                    animation: `${dropIn} 600ms ${EASE_OUT} both`,
                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                    textTransform: 'uppercase',
                    // A warm wash that fades in on hover.
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(247, 148, 31, 0.1)',
                        opacity: 0,
                        transition: 'opacity 200ms ease',
                    },
                    // A light that runs along the bottom edge.
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        width: '25%',
                        height: '1px',
                        background: `linear-gradient(90deg, transparent, ${ORANGE} 35%, #FFE0A8 50%, ${ORANGE} 65%, transparent)`,
                        transform: 'translateX(-100%)',
                        animation: `${beam} 5.5s linear 900ms infinite`,
                    },
                    '@media (hover: hover) and (pointer: fine)': {
                        '&:hover::before': { opacity: 1 },
                    },
                    '& .banner-content': { transition: 'transform 160ms ease-out' },
                    '&:active .banner-content': { transform: 'scale(0.985)' },
                    '&&:focus-visible': { outline: `2px solid ${ORANGE}`, outlineOffset: '-4px' },
                    '@media (prefers-reduced-motion: reduce)': {
                        '&::after, & .banner-play::after': { animation: 'none' },
                    },
                }}
            >
                <Container
                    component='span'
                    maxWidth='lg'
                    className='banner-content'
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'center', md: 'space-between' },
                        alignItems: 'center',
                        columnGap: { xs: 2, md: 3 },
                        rowGap: 0.75,
                        py: { xs: 1.25, md: 1.1 },
                    }}
                >
                    <Box
                        component='span'
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}
                    >
                        <Box
                            component='span'
                            className='banner-play'
                            sx={{
                                position: 'relative',
                                display: 'grid',
                                placeItems: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: ORANGE,
                                color: INK,
                                flexShrink: 0,
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '50%',
                                    border: `2px solid ${ORANGE}`,
                                    opacity: 0,
                                    animation: `${ring} 2.4s ease-out 600ms infinite`,
                                },
                            }}
                        >
                            <PlayArrowRounded sx={{ fontSize: 18 }} />
                        </Box>
                        <Box
                            component='span'
                            sx={{
                                fontSize: { xs: '1.1rem', md: '1.15rem' },
                                fontWeight: 600,
                                letterSpacing: '0.05em',
                                lineHeight: 1.15,
                            }}
                        >
                            All classes available on demand
                        </Box>
                    </Box>

                    <Box
                        component='span'
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: { xs: 2, md: 3 },
                        }}
                    >
                        {STATS.map((stat, index) => (
                            <Stat key={stat.label} {...stat} delayMs={300 + index * 80} />
                        ))}
                        <ArrowDownward
                            sx={{
                                alignSelf: 'center',
                                fontSize: '1.1rem',
                                color: ORANGE,
                                animation: `${nudge} 2.2s ease-in-out infinite`,
                            }}
                        />
                    </Box>
                </Container>
            </ButtonBase>
        </>
    );
}

/** The same numbers at headline size, right above the hero video. */
export function HeroLibraryStats() {
    return (
        <>
            <GlobalStyles styles={COUNT_PROPERTY} />
            <ButtonBase
                disableRipple
                onClick={scrollToLibrary}
                aria-label={LIBRARY_LABEL}
                sx={{
                    display: 'inline-grid',
                    gridTemplateColumns: 'repeat(3, auto)',
                    alignItems: 'start',
                    borderRadius: 2,
                    color: 'common.white',
                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                    textTransform: 'uppercase',
                    transition: 'transform 160ms ease-out',
                    '&:active': { transform: 'scale(0.985)' },
                    '& > span + span': { borderLeft: `1px solid ${HAIRLINE}` },
                    '& .hero-stat-label': { transition: 'color 200ms ease' },
                    '@media (hover: hover) and (pointer: fine)': {
                        '&:hover .hero-stat-label': { color: 'common.white' },
                    },
                }}
            >
                {HERO_STATS.map((stat, index) => (
                    <Box
                        key={stat.label}
                        component='span'
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            px: { xs: 1.75, sm: 3.5, md: 5 },
                        }}
                    >
                        <CountNumber
                            value={stat.value}
                            suffix={stat.suffix}
                            delayMs={450 + index * 80}
                            sx={{
                                fontSize: { xs: '2.25rem', sm: '2.9rem', md: '3.4rem' },
                                textAlign: 'center',
                            }}
                        />
                        <Box
                            component='span'
                            className='hero-stat-label'
                            sx={{
                                mt: 0.75,
                                maxWidth: { xs: '12ch', sm: 'none' },
                                textWrap: 'balance',
                                fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' },
                                fontWeight: 600,
                                lineHeight: 1.15,
                                letterSpacing: '0.07em',
                                color: 'rgba(255, 255, 255, 0.8)',
                            }}
                        >
                            {stat.label}
                        </Box>
                    </Box>
                ))}
            </ButtonBase>
        </>
    );
}
