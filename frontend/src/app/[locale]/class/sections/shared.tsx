'use client';

import { barlow, barlowCondensed } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Container, ContainerProps, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hasClassAccess } from '../classLead';

export const INK = '#08080F';
export const INK_RAISED = '#12121C';
export const HAIRLINE = 'rgba(255, 255, 255, 0.13)';
export const MUTED = '#B9BDC9';
export const ORANGE = '#F7941F';
export const BLUE_BAND =
    'linear-gradient(90deg, var(--mui-palette-darkBlue-main) 0%, var(--mui-palette-darkBlue-light) 100%)';
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const OFFER_ELEMENT_ID = 'join';
export const LIVE_CLASSES_ELEMENT_ID = 'live-classes';

type StyleObject = Record<string, string | number | object | undefined>;

export const riseIn = keyframes`
    from { opacity: 0; transform: translateY(32px); }
    to { opacity: 1; transform: translateY(0); }
`;

export const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

/** Rises into place on scroll. Browsers without view timelines simply show the content. */
export const revealSx = {
    '@supports (animation-timeline: view())': {
        '@media (prefers-reduced-motion: no-preference)': {
            animation: `${riseIn} linear both`,
            animationTimeline: 'view()',
            animationRange: 'entry 0% entry 30%',
        },
    },
} as const;

/** Replaces the theme's default face with the ChessDojo landing faces on this page. */
export const fontVars = {
    fontFamily: `${barlow.style.fontFamily},sans-serif`,
    '& .MuiButton-root': {
        fontFamily: `${barlowCondensed.style.fontFamily},sans-serif`,
        fontSize: '1.1rem',
    },
    '& .MuiTypography-body2, & .MuiTypography-caption, & .MuiInputBase-root, & .MuiInputLabel-root, & .MuiFormHelperText-root':
        { fontFamily: `${barlow.style.fontFamily},sans-serif` },
} as const;

export const pageSx = {
    ...fontVars,
    position: 'relative',
    bgcolor: INK,
    color: 'common.white',
    overflow: 'clip',
    fontVariantNumeric: 'tabular-nums',
    scrollbarColor: `${ORANGE} ${INK}`,
    '& ::selection': { backgroundColor: ORANGE, color: INK },
    '& :focus-visible': { outline: `2px solid ${ORANGE}`, outlineOffset: '3px' },
    '& a': { textUnderlineOffset: '3px' },
    '@media (prefers-reduced-motion: reduce)': {
        '& *': { animation: 'none !important', transition: 'none !important' },
    },
} as const;

export function InkGround({ children }: { children: ReactNode }) {
    return <Box sx={{ bgcolor: INK }}>{children}</Box>;
}

export function Section({
    children,
    maxWidth = 'lg',
    id,
    sx,
}: {
    children: ReactNode;
    maxWidth?: ContainerProps['maxWidth'];
    id?: string;
    sx?: StyleObject;
}) {
    return (
        <Container
            id={id}
            maxWidth={maxWidth}
            sx={{ position: 'relative', py: { xs: '4.5rem', md: '7.5rem' }, ...sx }}
        >
            {children}
        </Container>
    );
}

export function Heading({
    children,
    description,
    center,
    sx,
}: {
    children: ReactNode;
    description?: ReactNode;
    center?: boolean;
    sx?: StyleObject;
}) {
    return (
        <Box
            sx={{
                mb: { xs: 5, md: 8 },
                textAlign: center ? 'center' : 'left',
                ...(center ? { mx: 'auto' } : {}),
                maxWidth: center ? '50rem' : '44rem',
                ...sx,
            }}
        >
            <Typography
                component='h2'
                sx={{
                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                    fontWeight: 500,
                    fontSize: { xs: '2.5rem', md: '3.75rem' },
                    lineHeight: 1.05,
                    textWrap: 'balance',
                }}
            >
                {children}
            </Typography>
            {description && (
                <Body sx={{ mt: 2.5, fontSize: { xs: '1.15rem', md: '1.35rem' } }}>
                    {description}
                </Body>
            )}
        </Box>
    );
}

export function Body({ children, sx }: { children: ReactNode; sx?: StyleObject }) {
    return (
        <Typography
            sx={{
                fontFamily: (theme) => fontFamily(theme, barlow),
                fontSize: '1.125rem',
                lineHeight: 1.55,
                color: MUTED,
                ...sx,
            }}
        >
            {children}
        </Typography>
    );
}

export function Condensed({
    children,
    component = 'div',
    sx,
}: {
    children: ReactNode;
    component?: React.ElementType;
    sx?: StyleObject;
}) {
    return (
        <Typography
            component={component}
            sx={{
                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                fontWeight: 600,
                fontSize: '1.5rem',
                lineHeight: 1.15,
                ...sx,
            }}
        >
            {children}
        </Typography>
    );
}

export function scrollToOffer() {
    document.getElementById(OFFER_ELEMENT_ID)?.scrollIntoView({ behavior: 'smooth' });
}

const subscribeToNothing = () => () => undefined;

export function useClassAccess(): boolean {
    return useSyncExternalStore(subscribeToNothing, hasClassAccess, () => false);
}

/** Counts up to the target the first time the element scrolls into view. */
export function useCountUp<T extends Element>(target: number, durationMs = 1400) {
    const ref = useRef<T>(null);
    const [value, setValue] = useState(target);

    useEffect(() => {
        const element = ref.current;
        if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        let frame = 0;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    return;
                }
                observer.disconnect();
                const start = performance.now();
                const step = (now: number) => {
                    const t = Math.min(1, (now - start) / durationMs);
                    setValue(Math.round(target * (1 - (1 - t) ** 4)));
                    if (t < 1) {
                        frame = requestAnimationFrame(step);
                    }
                };
                frame = requestAnimationFrame(step);
            },
            { threshold: 0.4 },
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [target, durationMs]);

    return { ref, value };
}
