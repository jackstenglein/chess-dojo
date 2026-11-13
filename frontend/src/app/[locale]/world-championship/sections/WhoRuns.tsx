'use client';

import { anton } from '@/components/landing/fonts';
import senseisImage from '@/components/landing/hero.webp';
import { Link } from '@/components/navigation/Link';
import { fontFamily } from '@/style/font';
import { ArrowForward } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import {
    BLUE_BAND,
    Body,
    Heading,
    revealSx,
    Section,
    useCountUp,
} from '../../class/sections/shared';
import { WHO } from '../content';

function Proof({ target, label }: { target: number; label: string }) {
    const { ref, value } = useCountUp<HTMLDivElement>(target);
    return (
        <Box ref={ref}>
            <Typography
                sx={{
                    fontFamily: (theme) => fontFamily(theme, anton),
                    fontSize: { xs: '2.2rem', md: '2.9rem' },
                    lineHeight: 1.15,
                    minWidth: '7ch',
                }}
            >
                {value.toLocaleString('en-US')}+
            </Typography>
            <Typography
                variant='body2'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '0.9rem' }}
            >
                {label}
            </Typography>
        </Box>
    );
}

export function WhoRuns() {
    return (
        <Box sx={{ background: BLUE_BAND }}>
            <Section
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
                    gap: { xs: 4, md: 7 },
                    alignItems: 'center',
                    py: { xs: '4rem', md: '6rem' },
                }}
            >
                <Box>
                    <Heading sx={{ mb: 2.5 }}>{WHO.heading}</Heading>
                    <Body
                        sx={{ color: 'common.white', fontSize: { xs: '1.125rem', md: '1.25rem' } }}
                    >
                        {WHO.body}
                    </Body>
                    <Stack
                        direction='row'
                        sx={{ mt: 3.5, gap: { xs: 3, md: 6 }, flexWrap: 'wrap' }}
                    >
                        {WHO.proof.map((item) => (
                            <Proof key={item.label} {...item} />
                        ))}
                    </Stack>
                    <Typography
                        variant='body2'
                        sx={{ mt: 1.5, color: 'rgba(255, 255, 255, 0.82)' }}
                    >
                        {WHO.footnote}
                    </Typography>
                    <Stack
                        component={Link}
                        href={WHO.href}
                        direction='row'
                        sx={{
                            mt: 2.5,
                            minHeight: 44,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            color: 'common.white',
                            fontWeight: 600,
                            fontSize: '1.125rem',
                        }}
                    >
                        {WHO.link}
                        <ArrowForward sx={{ fontSize: 20 }} />
                    </Stack>
                </Box>
                <Box sx={revealSx}>
                    <Image
                        src={senseisImage}
                        alt={WHO.imageAlt}
                        sizes='(max-width: 900px) 100vw, 540px'
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            borderRadius: 12,
                            outline: '1px solid rgba(255, 255, 255, 0.1)',
                            outlineOffset: -1,
                        }}
                    />
                </Box>
            </Section>
        </Box>
    );
}
