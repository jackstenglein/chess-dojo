import { fontFamily } from '@/style/font';
import { ChevronRight } from '@mui/icons-material';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackgroundImageContainer } from './BackgroundImage';
import { FEATURES_ELEMENT_ID } from './Features';
import { anton, barlow, barlowCondensed, eyebrowSx } from './fonts';
import heroImage from './hero.webp';
import { JoinDojoButton } from './JoinDojoButton';
import backgroundImage from './main-background.webp';

const COUNT_UP_MS = 1600;
const INCREMENT_EVERY_MS = 30_000;

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(t: number): number {
    return 1 - (1 - t) ** 3;
}

function parseStatValue(formatted: string): { prefix: string; target: number; suffix: string } {
    const match = /^(.*?)(\d[\d\s.,\u00a0\u202f]*)(.*)$/.exec(formatted);
    if (!match) {
        return { prefix: '', target: 0, suffix: formatted };
    }
    return {
        prefix: match[1],
        target: Number(match[2].replace(/[^\d]/g, '')) || 0,
        suffix: match[3],
    };
}

function formatStatNumber(n: number, locale: string): string {
    const loc = locale === 'pseudo' ? 'en' : locale;
    return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n);
}

function useCountingNumber(target: number, incrementMin: number, incrementMax: number): number {
    const [value, setValue] = useState(0);
    const valueRef = useRef(0);
    const frameRef = useRef(0);

    const animateTo = useCallback((to: number, duration: number) => {
        cancelAnimationFrame(frameRef.current);
        const from = valueRef.current;
        if (duration <= 0 || from === to) {
            valueRef.current = to;
            setValue(to);
            return;
        }
        const start = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const next = Math.round(from + (to - from) * easeOutCubic(t));
            valueRef.current = next;
            setValue(next);
            if (t < 1) {
                frameRef.current = requestAnimationFrame(step);
            }
        };
        frameRef.current = requestAnimationFrame(step);
    }, []);

    useEffect(() => {
        const reduced = prefersReducedMotion();
        valueRef.current = 0;
        setValue(0);
        animateTo(target, reduced ? 0 : COUNT_UP_MS);

        let intervalId: number | undefined;
        const timeoutId = window.setTimeout(
            () => {
                intervalId = window.setInterval(() => {
                    if (document.visibilityState === 'hidden') {
                        return;
                    }
                    const span = incrementMax - incrementMin;
                    const delta =
                        span <= 0
                            ? incrementMin
                            : incrementMin + Math.floor(Math.random() * (span + 1));
                    animateTo(valueRef.current + delta, prefersReducedMotion() ? 0 : 450);
                }, INCREMENT_EVERY_MS);
            },
            reduced ? INCREMENT_EVERY_MS : COUNT_UP_MS + INCREMENT_EVERY_MS,
        );

        return () => {
            cancelAnimationFrame(frameRef.current);
            window.clearTimeout(timeoutId);
            if (intervalId !== undefined) {
                window.clearInterval(intervalId);
            }
        };
    }, [animateTo, incrementMax, incrementMin, target]);

    return value;
}

export function MainLanding() {
    const t = useTranslations('landing');

    const scrollToId = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            <BackgroundImageContainer
                src={backgroundImage}
                background='linear-gradient(270deg, rgba(7, 7, 18, 0.765) 10%, rgba(7, 7, 18, 0.9) 100%)'
                slotProps={{
                    image: { style: { opacity: 0.15 }, priority: true },
                    container: { sx: { pt: { xs: 1, md: 0 }, pb: { xs: 3, md: 0 } } },
                }}
            >
                <Grid
                    container
                    rowSpacing={4}
                    sx={{
                        alignItems: 'center',
                        height: {
                            md: 'max(100vh - var(--navbar-height) - var(--stats-height) - 40px, 470px)',
                        },
                        mt: {
                            xs: 1,
                            md: 0,
                        },
                    }}
                >
                    <Grid
                        size={{
                            xs: 12,
                            md: 6,
                        }}
                    >
                        <Stack
                            spacing={6}
                            sx={{
                                height: 1,
                                justifyContent: 'start',
                                alignItems: { xs: 'center', md: 'start' },
                            }}
                        >
                            <Stack spacing={2}>
                                <Typography
                                    data-testid='eyebrow'
                                    color='dojoOrange'
                                    sx={{
                                        textAlign: { xs: 'center', md: 'start' },
                                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                        ...eyebrowSx,
                                    }}
                                >
                                    {t('hero.eyebrow')}
                                </Typography>
                                <Typography
                                    variant='h2'
                                    data-testid='title'
                                    sx={{
                                        textAlign: { xs: 'center', md: 'start' },
                                        fontFamily: (theme) => fontFamily(theme, anton),
                                        fontWeight: '400',
                                        fontSize: { xs: '2.25rem', md: '3.25rem' },
                                        lineHeight: 1.15,
                                    }}
                                >
                                    {t('hero.title')
                                        .split('\n')
                                        .map((line, i) => (
                                            <span key={i}>
                                                {i > 0 && <br />}
                                                {line}
                                            </span>
                                        ))}
                                </Typography>
                                <Typography
                                    variant='h5'
                                    data-testid='subtitle'
                                    sx={{
                                        textAlign: { xs: 'center', md: 'start' },
                                        fontFamily: (theme) => fontFamily(theme, barlow),
                                        fontWeight: 400,
                                        fontSize: '1.5rem',
                                        lineHeight: '2.125rem',
                                        letterSpacing: 0,
                                    }}
                                >
                                    {t('hero.subtitle')}
                                </Typography>
                            </Stack>

                            <Stack
                                direction='row'
                                sx={{
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: { xs: 'center', md: 'start' },
                                    gap: 3,
                                }}
                            >
                                <JoinDojoButton>{t('pricing.signUpFree')}</JoinDojoButton>
                                <Button
                                    variant='outlined'
                                    onClick={(e) => scrollToId(e, FEATURES_ELEMENT_ID)}
                                    endIcon={<ChevronRight />}
                                    sx={{
                                        fontSize: '0.94rem',
                                        fontWeight: '600',
                                        color: 'white',
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        px: 2,
                                        py: '0.7rem',
                                        '&:hover': {
                                            borderColor: 'var(--mui-palette-dojoOrange-main)',
                                            backgroundColor: 'transparent',
                                        },
                                    }}
                                    color='dojoOrange'
                                >
                                    {t('hero.exploreProgram')}
                                </Button>
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Image
                            alt={t('hero.imageAlt')}
                            src={heroImage}
                            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                            priority
                        />
                    </Grid>
                </Grid>
            </BackgroundImageContainer>

            <Box
                sx={{
                    width: 1,
                    minHeight: { md: 'var(--stats-height)' },
                    background:
                        'linear-gradient(90deg, var(--mui-palette-darkBlue-main) 0%, var(--mui-palette-darkBlue-light) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: { xs: 2, md: 0 },
                    px: 2,
                }}
            >
                <Grid
                    container
                    sx={{
                        maxWidth: 'lg',
                        width: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    spacing={{ xs: 2, md: 0 }}
                >
                    <Stat
                        value={t('hero.stats.ratingPoints.value')}
                        label={t('hero.stats.ratingPoints.label')}
                        increment={[10, 28]}
                    />
                    <Stat
                        value={t('hero.stats.graduations.value')}
                        label={t('hero.stats.graduations.label')}
                        increment={[1, 1]}
                    />
                    <Stat
                        value={t('hero.stats.hours.value')}
                        label={t('hero.stats.hours.label')}
                        increment={[5, 14]}
                    />
                </Grid>
            </Box>
        </>
    );
}

function Stat({
    value,
    label,
    increment,
}: {
    value: string;
    label: string;
    increment: [number, number];
}) {
    const locale = useLocale();
    const { prefix, target, suffix } = parseStatValue(value);
    const count = useCountingNumber(target, increment[0], increment[1]);

    return (
        <Grid size={{ xs: 12, md: 4 }}>
            <Stack sx={{ alignItems: 'center', gap: 0.5, px: 2 }}>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, anton),
                        fontSize: { xs: '2rem', md: '2.5rem' },
                        lineHeight: 1.1,
                        textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {prefix}
                    {formatStatNumber(count, locale)}
                    {suffix}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlow),
                        fontSize: '0.9375rem',
                        lineHeight: 1.3,
                        textAlign: 'center',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                    }}
                >
                    {label}
                </Typography>
            </Stack>
        </Grid>
    );
}
