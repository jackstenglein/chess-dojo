'use client';

import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import { RATING_MOVES } from '../content';
import { Body, Condensed, EASE_OUT, HAIRLINE, Heading, INK_RAISED, MUTED, Section } from './shared';

const SITE_STYLES = {
    'Chess.com': { accent: '#81B64C', Logo: SiChessdotcom },
    Lichess: { accent: '#F2F2F2', Logo: SiLichess },
} as const;

/** One step every 200 rating points, from 0 to 2400. */
const STEPS = Array.from({ length: 12 }, (_, index) => index * 200);
const AUTO_ADVANCE_MS = 7000;

const countdown = keyframes`
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
`;

const stepUp = keyframes`
    from { transform: scaleY(0.25); opacity: 0.25; }
    to { transform: scaleY(1); opacity: 1; }
`;

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
`;

function useCountBetween(from: number, to: number, run: boolean) {
    const [value, setValue] = useState(to);

    useEffect(() => {
        if (!run || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / 1500);
            setValue(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
            if (t < 1) {
                frame = requestAnimationFrame(step);
            }
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [from, to, run]);

    return value;
}

export function RatingMoves() {
    const [active, setActive] = useState(0);
    const [inView, setInView] = useState(false);
    const [autoAdvance, setAutoAdvance] = useState(true);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = rootRef.current;
        if (!element) {
            return;
        }
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
            threshold: 0.35,
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const move = RATING_MOVES[active];
    const { accent, Logo } = SITE_STYLES[move.site];
    const shown = useCountBetween(move.before, move.after, inView);

    return (
        <Box sx={{ bgcolor: '#0D0D18', borderBlock: `1px solid ${HAIRLINE}` }}>
            <Section>
                <Heading description='Pick a member and watch the climb. Ratings are from the site shown, and your own results depend on the work you put in.'>
                    They did the work. Here’s what moved.
                </Heading>

                <Box
                    ref={rootRef}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.5fr' },
                        gap: { xs: 2, md: 3 },
                    }}
                >
                    <Stack
                        role='tablist'
                        aria-label='Dojo members'
                        sx={{
                            gap: 1.25,
                            flexDirection: { xs: 'row', md: 'column' },
                            overflowX: { xs: 'auto', md: 'visible' },
                        }}
                    >
                        {RATING_MOVES.map((member, index) => {
                            const selected = index === active;
                            const style = SITE_STYLES[member.site];
                            return (
                                <Box
                                    key={member.name}
                                    component='button'
                                    type='button'
                                    role='tab'
                                    aria-selected={selected}
                                    onClick={() => {
                                        setActive(index);
                                        setAutoAdvance(false);
                                    }}
                                    sx={{
                                        position: 'relative',
                                        flex: { xs: '0 0 13rem', md: '0 0 auto' },
                                        p: 2,
                                        minHeight: 44,
                                        overflow: 'hidden',
                                        font: 'inherit',
                                        color: 'common.white',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderRadius: 2.5,
                                        bgcolor: selected ? INK_RAISED : 'transparent',
                                        border: `1px solid ${selected ? style.accent : HAIRLINE}`,
                                        transition: `background-color 300ms ${EASE_OUT}, border-color 300ms ${EASE_OUT}`,
                                    }}
                                >
                                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                color: style.accent,
                                                display: 'flex',
                                                fontSize: 30,
                                            }}
                                        >
                                            <style.Logo aria-hidden />
                                        </Box>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Condensed sx={{ fontSize: '1.4rem' }}>
                                                {member.name}
                                            </Condensed>
                                            <Typography variant='caption' sx={{ color: MUTED }}>
                                                {member.site} {member.format}
                                            </Typography>
                                        </Box>
                                        <Condensed sx={{ color: style.accent, fontSize: '1.4rem' }}>
                                            +{member.after - member.before}
                                        </Condensed>
                                    </Stack>
                                    {selected && autoAdvance && (
                                        <Box
                                            onAnimationEnd={() =>
                                                setActive((active + 1) % RATING_MOVES.length)
                                            }
                                            sx={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                height: 3,
                                                bgcolor: style.accent,
                                                transformOrigin: 'left',
                                                animation: `${countdown} ${AUTO_ADVANCE_MS}ms linear both`,
                                                animationPlayState: inView ? 'running' : 'paused',
                                                '@media (prefers-reduced-motion: reduce)': {
                                                    display: 'none',
                                                },
                                            }}
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>

                    <Box
                        role='tabpanel'
                        sx={{
                            p: { xs: 2.5, md: 4 },
                            borderRadius: 3,
                            bgcolor: INK_RAISED,
                            border: `1px solid ${HAIRLINE}`,
                            boxShadow: '0 30px 70px -30px rgba(0, 0, 0, 0.9)',
                        }}
                    >
                        <Stack
                            direction='row'
                            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                        >
                            <Stack direction='row' sx={{ alignItems: 'center', gap: 1.25 }}>
                                <Box sx={{ color: accent, display: 'flex', fontSize: 34 }}>
                                    <Logo aria-hidden />
                                </Box>
                                <Condensed sx={{ fontSize: '1.5rem' }}>
                                    {move.site} {move.format}
                                </Condensed>
                            </Stack>
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 0.4,
                                    borderRadius: 5,
                                    color: '#0b0b12',
                                    bgcolor: accent,
                                    fontWeight: 700,
                                }}
                            >
                                +{move.after - move.before}
                            </Box>
                        </Stack>

                        <Stack
                            direction='row'
                            sx={{ mt: 1.5, alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}
                        >
                            <Typography
                                aria-label={`Rating moved from ${move.before} to ${move.after}`}
                                sx={{
                                    fontFamily: (theme) => fontFamily(theme, anton),
                                    fontSize: { xs: '4.5rem', md: '6.5rem' },
                                    lineHeight: 1.05,
                                    color: accent,
                                    minWidth: '4ch',
                                }}
                            >
                                {shown}
                            </Typography>
                            <Condensed sx={{ fontSize: '1.4rem', color: MUTED }}>
                                up from {move.before}
                            </Condensed>
                        </Stack>

                        <Box
                            key={move.name}
                            aria-hidden
                            sx={{
                                mt: 2,
                                height: { xs: 110, md: 150 },
                                display: 'grid',
                                gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
                                gap: { xs: '3px', md: '6px' },
                                alignItems: 'end',
                            }}
                        >
                            {STEPS.map((rating, index) => {
                                const reached = rating + 200 > move.before && rating < move.after;
                                return (
                                    <Box
                                        key={rating}
                                        sx={{
                                            height: `${18 + ((index + 1) / STEPS.length) * 82}%`,
                                            borderRadius: '4px 4px 0 0',
                                            transformOrigin: 'bottom',
                                            bgcolor: reached ? accent : 'rgba(255, 255, 255, 0.1)',
                                            animation: reached
                                                ? `${stepUp} 600ms ${EASE_OUT} ${(index - move.before / 200) * 90 + 150}ms both`
                                                : undefined,
                                        }}
                                    />
                                );
                            })}
                        </Box>
                        <Stack direction='row' sx={{ mt: 0.75, justifyContent: 'space-between' }}>
                            {[0, 600, 1200, 1800, 2400].map((tick) => (
                                <Typography key={tick} variant='caption' sx={{ color: MUTED }}>
                                    {tick}
                                </Typography>
                            ))}
                        </Stack>

                        <Box
                            key={`${move.name}-quote`}
                            sx={{ mt: 2.5, animation: `${fadeUp} 600ms ${EASE_OUT} both` }}
                        >
                            <Body
                                sx={{
                                    color: 'common.white',
                                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                                }}
                            >
                                “{move.quote}”
                            </Body>
                            <Condensed sx={{ mt: 0.75, color: accent, fontSize: '1.2rem' }}>
                                {move.name}
                            </Condensed>
                        </Box>
                    </Box>
                </Box>
            </Section>
        </Box>
    );
}
