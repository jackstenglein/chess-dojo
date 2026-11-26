import { Box, Typography } from '@mui/material';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
    Body,
    Condensed,
    HAIRLINE,
    INK_RAISED,
    MUTED,
    revealSx,
    Section,
} from '../../class/sections/shared';
import { JESSE_QUOTE, WHY } from '../content';
import { bodyFontSx } from './parts';
import { ScenePanel, SceneStage } from './RushScenes';

/**
 * The three reasons the Dojo's rush is built the way it is. Each has a short film
 * that shows it: the clock, the ladder and what happens to the misses.
 *
 * On a wide screen one panel stays beside the reasons and shows the film for the
 * reason being read. On a phone each reason has its film right under it.
 */
export function WhyItWorks() {
    const [active, setActive] = useState(0);
    const blocks = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        // The reason crossing the middle of the screen is the one being read.
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActive(Number((entry.target as HTMLElement).dataset.reason));
                    }
                }
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        blocks.current.forEach((block) => block && observer.observe(block));
        return () => observer.disconnect();
    }, []);

    return (
        <Section sx={{ py: { xs: '4rem', md: '6.5rem' } }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 27rem)' },
                    columnGap: { md: 10 },
                    rowGap: { xs: 3, md: 6 },
                    alignItems: 'start',
                }}
            >
                {WHY.map((item, index) => (
                    <Fragment key={item.title}>
                        <Box
                            ref={(element: HTMLDivElement | null) => {
                                blocks.current[index] = element;
                            }}
                            data-reason={index}
                            sx={{
                                ...revealSx,
                                gridColumn: { md: 1 },
                                mt: { xs: index === 0 ? 0 : 3, md: 0 },
                            }}
                        >
                            <Condensed
                                component='h2'
                                sx={{
                                    fontWeight: 500,
                                    fontSize: { xs: '2.2rem', md: '3rem' },
                                    lineHeight: 1.05,
                                    textWrap: 'balance',
                                    maxWidth: '18ch',
                                }}
                            >
                                {item.title}
                            </Condensed>
                            <Body sx={{ mt: 1.5, maxWidth: '34rem', fontSize: { md: '1.25rem' } }}>
                                {item.body}
                            </Body>
                            {index < WHY.length - 1 && (
                                <Box
                                    aria-hidden
                                    sx={{
                                        display: { xs: 'none', md: 'block' },
                                        mt: 6,
                                        height: '1px',
                                        bgcolor: HAIRLINE,
                                        maxWidth: '34rem',
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                            <ScenePanel index={index} />
                        </Box>
                    </Fragment>
                ))}
                <Box
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        gridColumn: 2,
                        gridRow: '1 / span 3',
                        position: 'sticky',
                        top: '14vh',
                    }}
                >
                    <SceneStage active={active} />
                </Box>
            </Box>
        </Section>
    );
}

/** Jesse's line from the stream. Rendered only once he has agreed to it. */
export function JesseQuote() {
    if (!JESSE_QUOTE.approved) {
        return null;
    }
    return (
        <Box sx={{ bgcolor: INK_RAISED, borderBlock: `1px solid ${HAIRLINE}` }}>
            <Section maxWidth='md' sx={{ py: { xs: '3.5rem', md: '5rem' } }}>
                <Box component='figure' sx={{ m: 0, ...revealSx }}>
                    <Condensed
                        component='blockquote'
                        sx={{
                            m: 0,
                            fontWeight: 500,
                            fontSize: { xs: '2rem', md: '2.8rem' },
                            lineHeight: 1.12,
                            textWrap: 'balance',
                        }}
                    >
                        “{JESSE_QUOTE.text}”
                    </Condensed>
                    <Typography component='figcaption' sx={{ ...bodyFontSx, mt: 2, color: MUTED }}>
                        {JESSE_QUOTE.attribution}
                    </Typography>
                </Box>
            </Section>
        </Box>
    );
}
