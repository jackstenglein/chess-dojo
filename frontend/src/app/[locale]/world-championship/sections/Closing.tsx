'use client';

import { anton } from '@/components/landing/fonts';
import { Link } from '@/components/navigation/Link';
import { fontFamily } from '@/style/font';
import { Box, Button, Container, Slide, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { HAIRLINE, INK_RAISED, MUTED, ORANGE } from '../../class/sections/shared';
import {
    FINAL_CTA,
    FOOTER_LINKS,
    HERO,
    NOT_AFFILIATED,
    PHOTO_CREDITS,
    sentences,
    STICKY,
} from '../content';
import { useHydrated, useStoredDraft, useTimeLeft } from '../hooks';
import { formatCountdown, lockDayLabel } from '../prediction';
import { BoardMotif, clipSx } from './Motif';
import { FLOW_ELEMENT_ID, scrollToFlow } from './PickFlow';

/** Shown only while predictions are open and this visitor has not entered yet. */
export function FinalCta({ now, lockAt }: { now: number; lockAt: number }) {
    const hydrated = useHydrated();
    // Before the browser's zone is known, the date in Geneva is the safe thing to say.
    const day = hydrated ? lockDayLabel(now, lockAt) : 'November 24';

    return (
        <Box
            sx={{
                position: 'relative',
                ...clipSx,
                isolation: 'isolate',
                borderTop: `1px solid ${HAIRLINE}`,
            }}
        >
            <BoardMotif
                sx={{
                    zIndex: -1,
                    top: '-6rem',
                    right: { xs: '-10rem', md: '-4rem' },
                    width: { xs: '30rem', md: '44rem' },
                }}
            />
            <Container
                maxWidth='md'
                sx={{ py: { xs: '4.5rem', md: '7rem' }, textAlign: { xs: 'left', md: 'center' } }}
            >
                <Typography
                    component='h2'
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, anton),
                        fontSize: { xs: '2.4rem', md: '3.75rem' },
                        lineHeight: 1.1,
                        textWrap: 'balance',
                    }}
                >
                    {sentences(FINAL_CTA.heading(day)).map((sentence) => (
                        <Box key={sentence} component='span' sx={{ display: 'block' }}>
                            {sentence}
                        </Box>
                    ))}
                </Typography>
                <Button
                    variant='contained'
                    color='dojoOrange'
                    size='large'
                    onClick={scrollToFlow}
                    sx={{ mt: 3.5, minHeight: 56, px: 5, fontWeight: 600, fontSize: '1.1rem' }}
                >
                    {FINAL_CTA.cta}
                </Button>
                <Typography variant='body2' sx={{ mt: 1.5, color: 'rgba(255, 255, 255, 0.85)' }}>
                    {HERO.microcopy}
                </Typography>
            </Container>
        </Box>
    );
}

export function Footer({ padForStickyBar }: { padForStickyBar: boolean }) {
    return (
        <Box
            component='footer'
            sx={{
                borderTop: `1px solid ${HAIRLINE}`,
                pt: 4,
                pb: padForStickyBar ? 12 : 5,
                px: 2,
                textAlign: 'center',
                color: MUTED,
                fontSize: '0.92rem',
                '& a': { color: 'inherit' },
                '& a:hover': { color: ORANGE },
            }}
        >
            <Typography variant='body2' sx={{ color: 'inherit' }}>
                {NOT_AFFILIATED}
            </Typography>
            <Typography variant='body2' sx={{ mt: 1, color: 'inherit', fontSize: '0.85rem' }}>
                {PHOTO_CREDITS.label}{' '}
                {PHOTO_CREDITS.items.map((item, index) => (
                    <Box key={item.subject} component='span'>
                        {index > 0 && ', '}
                        {item.subject} by{' '}
                        <a href={item.href} target='_blank' rel='noopener noreferrer'>
                            {item.author}
                        </a>{' '}
                        (
                        <a href={item.licenseHref} target='_blank' rel='noopener noreferrer'>
                            {item.license}
                        </a>
                        )
                    </Box>
                ))}
                , via Wikimedia Commons. {PHOTO_CREDITS.note}
            </Typography>
            <Stack
                direction='row'
                sx={{ mt: 2, justifyContent: 'center', flexWrap: 'wrap', columnGap: 2.5 }}
            >
                <Box component='span' sx={{ py: 1.5 }}>
                    © ChessDojo
                </Box>
                {FOOTER_LINKS.map((link) => (
                    <Box key={link.href} component={Link} href={link.href} sx={{ py: 1.5 }}>
                        {link.label}
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}

/** Slides in once the pick flow has scrolled out of view. */
export function StickyBar({ lockAt, frozenAt }: { lockAt: number; frozenAt?: number }) {
    const [flowVisible, setFlowVisible] = useState(true);
    const left = useTimeLeft(lockAt, frozenAt);
    const { started } = useStoredDraft();

    useEffect(() => {
        const flow = document.getElementById(FLOW_ELEMENT_ID);
        if (!flow) {
            return;
        }
        const observer = new IntersectionObserver(([entry]) =>
            setFlowVisible(entry.isIntersecting),
        );
        observer.observe(flow);
        return () => observer.disconnect();
    }, []);

    return (
        <Slide direction='up' in={!flowVisible}>
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
                    justifyContent: { xs: 'space-between', sm: 'center' },
                    alignItems: 'center',
                    bgcolor: INK_RAISED,
                    borderTop: `1px solid ${HAIRLINE}`,
                }}
            >
                <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                    {left === undefined ? (
                        HERO.countdownFallback
                    ) : (
                        <>
                            <Box component='span' sx={{ color: MUTED }}>
                                {HERO.countdownLabel}
                            </Box>{' '}
                            <Box
                                component='span'
                                sx={{ display: { xs: 'block', sm: 'inline' }, fontWeight: 600 }}
                            >
                                {formatCountdown(left)}
                            </Box>
                        </>
                    )}
                </Typography>
                <Button
                    variant='contained'
                    color='dojoOrange'
                    onClick={scrollToFlow}
                    sx={{ minHeight: 48, px: 3, fontWeight: 600, flexShrink: 0 }}
                >
                    {started ? STICKY.continueCta : STICKY.cta}
                </Button>
            </Stack>
        </Slide>
    );
}
