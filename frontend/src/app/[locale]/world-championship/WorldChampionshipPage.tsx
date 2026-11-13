'use client';

import { Box, GlobalStyles } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { rememberAttribution } from '../class/classLead';
import { InkGround, pageSx } from '../class/sections/shared';
import { CONTEST, ContestConfig, getOfferStatus, getPhase } from './config';
import { useContestClock, useSearch, useStoredEntry } from './hooks';
import { getPreview } from './preview';
import { BlackFriday } from './sections/BlackFriday';
import { FinalCta, Footer, StickyBar } from './sections/Closing';
import { Faq } from './sections/Faq';
import { Hero } from './sections/Hero';
import { Prizes, Scoring, SenseiPicks } from './sections/Scoring';
import { WhoRuns } from './sections/WhoRuns';

/**
 * The campaign page has one goal, so it drops the site navigation, as /class does.
 * /class is switched off inside Navbar.tsx. This page does it from here so the
 * shared file stays untouched while four landing pages are built in parallel.
 */
const hideSiteNavigation = { 'header[data-testid="navbar"]': { display: 'none' } };

export function WorldChampionshipPage({
    serverNow,
    config: baseConfig = CONTEST,
}: {
    /** When the server rendered the page. The first client render uses it too, so hydration matches. */
    serverNow: number;
    config?: ContestConfig;
}) {
    const search = useSearch();
    const preview = useMemo(() => getPreview(search, baseConfig), [search, baseConfig]);
    const [closedByServer, setClosedByServer] = useState(false);
    const config = preview?.config ?? baseConfig;
    const frozenAt = preview?.frozenAt;

    const clock = useContestClock(serverNow, config, frozenAt);
    // The server has the final word on the lock. If it refused an entry, the page follows.
    const now = closedByServer ? Math.max(clock, config.lockAt) : clock;
    const entry = useStoredEntry();

    useEffect(() => {
        rememberAttribution(window.location.search);
    }, []);

    const phase = getPhase(now, config);
    const offerStatus = getOfferStatus(now, !!entry, config.offer);
    const picking = phase === 'open' && !entry;

    return (
        <Box className='dark' sx={pageSx}>
            <GlobalStyles styles={hideSiteNavigation} />
            <Hero
                phase={phase}
                config={config}
                entry={entry}
                offerStatus={offerStatus}
                frozenAt={frozenAt}
                onClosed={() => setClosedByServer(true)}
            />
            <InkGround>
                <Scoring />
                <Prizes prizes={config.prizes} />
                <SenseiPicks picks={config.senseiPicks} />
            </InkGround>
            <WhoRuns />
            {offerStatus === 'live' && <BlackFriday offer={config.offer} />}
            <Faq
                lockAt={config.lockAt}
                eligibilityConfirmed={config.eligibilityConfirmed}
                prizesConfirmed={config.prizes.confirmed}
            />
            {picking && <FinalCta now={now} lockAt={config.lockAt} />}
            <Footer padForStickyBar={picking} />
            {picking && <StickyBar lockAt={config.lockAt} frozenAt={frozenAt} />}
        </Box>
    );
}
