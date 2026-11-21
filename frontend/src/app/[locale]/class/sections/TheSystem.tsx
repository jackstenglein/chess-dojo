'use client';

import mockImage from '@/components/landing/features-mock.webp';
import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { METHOD_STEPS } from '../content';
import { Body, Condensed, EASE_OUT, HAIRLINE, Heading, MUTED, ORANGE, Section } from './shared';

export function TheSystem() {
    const [active, setActive] = useState(0);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActive(stepRefs.current.indexOf(entry.target as HTMLDivElement));
                    }
                }
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        stepRefs.current.forEach((step) => {
            if (step) {
                observer.observe(step);
            }
        });
        return () => observer.disconnect();
    }, []);

    return (
        <Section sx={{ pt: { xs: 0, md: 0 } }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: { xs: 4, md: 8 },
                }}
            >
                <Box
                    sx={{
                        position: { md: 'sticky' },
                        top: '6vh',
                        alignSelf: 'start',
                        order: { xs: 2, md: 1 },
                    }}
                >
                    <Image
                        src={mockImage}
                        alt='The ChessDojo training plan with daily tasks and a training heatmap'
                        sizes='(max-width: 900px) 100vw, 560px'
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>

                <Box sx={{ order: { xs: 1, md: 2 } }}>
                    <Heading sx={{ mb: { xs: 3, md: 5 } }}>
                        We built the plan. You just have to follow it.
                    </Heading>
                    {METHOD_STEPS.map((step, index) => (
                        <Box
                            key={step.title}
                            ref={(element: HTMLDivElement | null) => {
                                stepRefs.current[index] = element;
                            }}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '3.25rem 1fr',
                                gap: 1,
                                py: { xs: 3, md: 6 },
                                borderTop: `1px solid ${HAIRLINE}`,
                                opacity: { md: active === index ? 1 : 0.72 },
                                transition: `opacity 500ms ${EASE_OUT}`,
                            }}
                        >
                            <Typography
                                aria-hidden
                                sx={{
                                    fontFamily: (theme) => fontFamily(theme, anton),
                                    fontSize: '2.25rem',
                                    lineHeight: 1,
                                    color: ORANGE,
                                }}
                            >
                                {index + 1}
                            </Typography>
                            <Box>
                                <Condensed
                                    component='h3'
                                    sx={{ fontSize: { xs: '1.75rem', md: '2.1rem' } }}
                                >
                                    {step.title}
                                </Condensed>
                                <Body sx={{ mt: 1, color: MUTED }}>{step.description}</Body>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Section>
    );
}
