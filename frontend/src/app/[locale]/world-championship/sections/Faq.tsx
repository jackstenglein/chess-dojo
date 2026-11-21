'use client';

import { barlowCondensed } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import { Body, HAIRLINE, Heading, ORANGE, Section } from '../../class/sections/shared';
import { FAQ, FAQ_HEADING, HERO, RULES } from '../content';
import { useHydrated } from '../hooks';
import { formatLockMoment } from '../prediction';

const accordionSx = {
    bgcolor: 'transparent',
    backgroundImage: 'none',
    color: 'inherit',
    borderBottom: `1px solid ${HAIRLINE}`,
    '&:before': { display: 'none' },
} as const;

function Question({ children }: { children: string }) {
    return (
        <Typography
            component='h3'
            sx={{
                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                fontWeight: 600,
                fontSize: '1.4rem',
            }}
        >
            {children}
        </Typography>
    );
}

/** The lock time in the visitor's zone once the browser is known, the venue's before that. */
function useLockMoment(lockAt: number): string {
    const hydrated = useHydrated();
    return hydrated ? formatLockMoment(lockAt) : HERO.lockAtVenue;
}

export function Faq({
    lockAt,
    eligibilityConfirmed,
    prizesConfirmed,
}: {
    lockAt: number;
    eligibilityConfirmed: boolean;
    prizesConfirmed: boolean;
}) {
    const lock = useLockMoment(lockAt);
    const questions = FAQ.filter((item) => !item.needsEligibility || eligibilityConfirmed);
    const rules = RULES.items.filter((item) => !item.needsPrizes || prizesConfirmed);

    return (
        <Section maxWidth='md'>
            <Heading center sx={{ mb: { xs: 3, md: 5 } }}>
                {FAQ_HEADING}
            </Heading>
            <Box>
                {questions.map((item) => (
                    <Accordion key={item.question} disableGutters elevation={0} sx={accordionSx}>
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ color: ORANGE }} />}
                            sx={{ minHeight: 64, px: 0 }}
                        >
                            <Question>{item.question}</Question>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                            <Body>{item.answer.replace('{lock}', lock)}</Body>
                        </AccordionDetails>
                    </Accordion>
                ))}

                <Accordion disableGutters elevation={0} sx={accordionSx}>
                    <AccordionSummary
                        expandIcon={<ExpandMore sx={{ color: ORANGE }} />}
                        sx={{ minHeight: 64, px: 0 }}
                    >
                        <Question>{RULES.heading}</Question>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                        <Box component='ol' sx={{ m: 0, pl: 3, '& li + li': { mt: 1 } }}>
                            {rules.map((rule) => (
                                <Box component='li' key={rule.text} sx={{ color: '#B9BDC9' }}>
                                    <Body>{rule.text.replace('{lock}', lock)}</Body>
                                </Box>
                            ))}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Section>
    );
}
