'use client';

import { Box } from '@mui/material';
import { OBJECTIONS } from '../content';
import { Body, Condensed, HAIRLINE, Heading, ORANGE, revealSx, Section } from './shared';

export function Objections() {
    return (
        <Box sx={{ bgcolor: '#0D0D18', borderBlock: `1px solid ${HAIRLINE}` }}>
            <Section>
                <Heading center>Three reasons people wait, and our answer to each</Heading>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                        gap: { xs: 4, md: 6 },
                    }}
                >
                    {OBJECTIONS.map((objection) => (
                        <Box
                            key={objection.question}
                            sx={{ ...revealSx, pt: 2.5, borderTop: `3px solid ${ORANGE}` }}
                        >
                            <Condensed component='h3' sx={{ fontSize: '2rem', fontWeight: 500 }}>
                                {objection.question}
                            </Condensed>
                            <Body sx={{ mt: 1.5 }}>{objection.answer}</Body>
                        </Box>
                    ))}
                </Box>
            </Section>
        </Box>
    );
}
