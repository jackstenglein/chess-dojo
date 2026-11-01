'use client';

import { barlowCondensed } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import { FAQ } from '../content';
import { Body, HAIRLINE, Heading, ORANGE, Section } from './shared';

export function Faq() {
    return (
        <Section maxWidth='md'>
            <Heading center>Questions before you join</Heading>
            <Box>
                {FAQ.map((item) => (
                    <Accordion
                        key={item.question}
                        disableGutters
                        elevation={0}
                        sx={{
                            bgcolor: 'transparent',
                            backgroundImage: 'none',
                            color: 'inherit',
                            borderBottom: `1px solid ${HAIRLINE}`,
                            '&:before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ color: ORANGE }} />}
                            sx={{ minHeight: 64, px: 0 }}
                        >
                            <Typography
                                component='h3'
                                sx={{
                                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                    fontWeight: 600,
                                    fontSize: '1.4rem',
                                }}
                            >
                                {item.question}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                            <Body>{item.answer}</Body>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </Section>
    );
}
