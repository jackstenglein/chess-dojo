'use client';

import { Button, Slide, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { WORKSHOPS_OFFER } from '../content';
import { HAIRLINE, INK_RAISED, OFFER_ELEMENT_ID, scrollToOffer } from './shared';

/** Appears after the first screen and steps aside while the offer itself is on screen. */
export function StickyOfferBar() {
    const [pastHero, setPastHero] = useState(false);
    const [offerVisible, setOfferVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setPastHero(window.scrollY > window.innerHeight);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        const offer = document.getElementById(OFFER_ELEMENT_ID);
        const observer = new IntersectionObserver(([entry]) =>
            setOfferVisible(entry.isIntersecting),
        );
        if (offer) {
            observer.observe(offer);
        }

        return () => {
            window.removeEventListener('scroll', onScroll);
            observer.disconnect();
        };
    }, []);

    return (
        <Slide direction='up' in={pastHero && !offerVisible}>
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
                    gap: 2.5,
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
                    Live classes with GMs and IMs, from ${WORKSHOPS_OFFER.price.year}/month billed
                    yearly
                </Typography>
                <Button
                    variant='contained'
                    color='dojoOrange'
                    onClick={scrollToOffer}
                    sx={{ minHeight: 44, px: 3, fontWeight: 600, width: { xs: 1, sm: 'auto' } }}
                >
                    See the plans
                </Button>
            </Stack>
        </Slide>
    );
}
