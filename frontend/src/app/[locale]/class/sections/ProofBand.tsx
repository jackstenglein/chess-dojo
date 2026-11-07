'use client';

import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Container, Typography } from '@mui/material';
import { STATS } from '../content';
import { BLUE_BAND, useCountUp } from './shared';

function Stat({ target, label }: { target: number; label: string }) {
    const { ref, value } = useCountUp<HTMLDivElement>(target);

    return (
        <Box ref={ref} sx={{ textAlign: 'center' }}>
            <Typography
                sx={{
                    fontFamily: (theme) => fontFamily(theme, anton),
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    lineHeight: 1.15,
                    minWidth: '6ch',
                }}
            >
                {value.toLocaleString('en-US')}+
            </Typography>
            <Typography
                variant='body2'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '0.95rem' }}
            >
                {label}
            </Typography>
        </Box>
    );
}

export function ProofBand() {
    return (
        <Box sx={{ background: BLUE_BAND }}>
            <Container
                maxWidth='lg'
                sx={{
                    py: { xs: 3.5, md: 4 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: { xs: 3, sm: 2 },
                }}
            >
                {STATS.map((stat) => (
                    <Stat key={stat.label} {...stat} />
                ))}
            </Container>
        </Box>
    );
}
