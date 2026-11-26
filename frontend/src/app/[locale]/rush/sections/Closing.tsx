import { barlowCondensed } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Slide,
    Stack,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
    Body,
    Condensed,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    OFFER_ELEMENT_ID,
    ORANGE,
    revealSx,
    Section,
} from '../../class/sections/shared';
import { FAQ, FINAL_CTA_REWARD, RUSH_MINUTES, RUSH_STRIKES, stickyLine } from '../content';
import { primaryButtonSx, RunPips, TOP_ACTION_ID } from './parts';

export function Faq() {
    return (
        <Section maxWidth='md'>
            <Heading center>Questions about the three runs</Heading>
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

/** The last word on the page: the same single action as the top. */
export function FinalCta({
    unlocked,
    label,
    onAction,
}: {
    unlocked: boolean;
    label: string;
    onAction: () => void;
}) {
    return (
        <Box sx={{ bgcolor: INK_RAISED, borderTop: `1px solid ${HAIRLINE}` }}>
            <Section maxWidth='md' sx={{ textAlign: 'center', pb: { xs: '7rem', md: '7.5rem' } }}>
                <Condensed
                    component='h2'
                    sx={{
                        ...revealSx,
                        fontWeight: 500,
                        fontSize: { xs: '2.5rem', md: '3.75rem' },
                        lineHeight: 1.05,
                        textWrap: 'balance',
                    }}
                >
                    {unlocked
                        ? 'Your three runs are done. The training plan is next.'
                        : `${RUSH_MINUTES} minutes on the clock, ${RUSH_STRIKES} strikes to spend`}
                </Condensed>
                <Button
                    variant='contained'
                    color='dojoOrange'
                    size='large'
                    onClick={onAction}
                    sx={{ ...primaryButtonSx, mt: 4, minWidth: 260 }}
                >
                    {label}
                </Button>
                {!unlocked && (
                    <Typography variant='body2' sx={{ mt: 2, color: MUTED }}>
                        {FINAL_CTA_REWARD}
                    </Typography>
                )}
            </Section>
        </Box>
    );
}

/**
 * The page's one action, pinned to the bottom once the same action at the top has
 * scrolled away. It steps aside while the plans are on screen.
 */
export function StickyBar({
    label,
    onAction,
    watchKey,
    runsDone,
    unlocked,
}: {
    label: string;
    onAction: () => void;
    /** All three runs are done, so the bar talks about the code and not about the runs. */
    unlocked: boolean;
    /** Finished runs, shown as pips next to the button. */
    runsDone: number;
    /** Changes when the top section is swapped, so the bar finds the new action. */
    watchKey: number;
}) {
    const [pastTop, setPastTop] = useState(false);
    const [offerVisible, setOfferVisible] = useState(false);

    useEffect(() => {
        const top = document.getElementById(TOP_ACTION_ID);
        const offer = document.getElementById(OFFER_ELEMENT_ID);
        // Above the screen, not below it: the bar must stay away until the action was seen.
        const topObserver = new IntersectionObserver(([entry]) =>
            setPastTop(!entry.isIntersecting && entry.boundingClientRect.bottom < 0),
        );
        const offerObserver = new IntersectionObserver(([entry]) =>
            setOfferVisible(entry.isIntersecting),
        );
        if (top) {
            topObserver.observe(top);
        }
        if (offer) {
            offerObserver.observe(offer);
        }
        return () => {
            topObserver.disconnect();
            offerObserver.disconnect();
        };
    }, [watchKey]);

    return (
        <Slide direction='up' in={pastTop && !offerVisible}>
            <Stack
                direction='row'
                sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10,
                    px: 2,
                    py: 1.25,
                    pb: 'max(10px, env(safe-area-inset-bottom))',
                    gap: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: INK_RAISED,
                    borderTop: `1px solid ${HAIRLINE}`,
                }}
            >
                <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, display: { xs: 'none', sm: 'block' } }}
                >
                    {stickyLine(unlocked)}
                </Typography>
                {runsDone > 0 && (
                    <Box sx={{ flexShrink: 0 }}>
                        <RunPips done={runsDone} small />
                    </Box>
                )}
                <Button
                    variant='contained'
                    color='dojoOrange'
                    onClick={onAction}
                    sx={{
                        minHeight: 48,
                        px: 3,
                        fontWeight: 600,
                        flexGrow: { xs: 1, sm: 0 },
                    }}
                >
                    {label}
                </Button>
            </Stack>
        </Slide>
    );
}
