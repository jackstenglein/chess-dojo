'use client';

import { Box } from '@mui/material';
import { useState } from 'react';
import { ClassId } from './content';
import { Closing } from './sections/Closing';
import { Community } from './sections/Community';
import { Faq } from './sections/Faq';
import { GameReview } from './sections/GameReview';
import { GateDialog } from './sections/GateDialog';
import { Hero } from './sections/Hero';
import { LiveClasses } from './sections/LiveClasses';
import { Objections } from './sections/Objections';
import { OfferSection } from './sections/OfferSection';
import { ProofBand } from './sections/ProofBand';
import { RatingMoves } from './sections/RatingMoves';
import { Senseis } from './sections/Senseis';
import { StickyOfferBar } from './sections/StickyOfferBar';
import { StuckWeek } from './sections/StuckWeek';
import { TheSystem } from './sections/TheSystem';
import { InkGround, pageSx, useClassAccess } from './sections/shared';

export function ClassLandingPage() {
    const hasAccess = useClassAccess();
    const [unlocked, setUnlocked] = useState<ClassId[]>([]);
    const [gateFor, setGateFor] = useState<ClassId>();

    const onPlay = (classId: ClassId) => {
        if (hasAccess) {
            setUnlocked((current) => [...current, classId]);
        } else {
            setGateFor(classId);
        }
    };

    const onUnlocked = (classId: ClassId) => {
        setGateFor(undefined);
        setUnlocked((current) => [...current, classId]);
    };

    return (
        <Box className='dark' sx={pageSx}>
            <Hero playing={unlocked.includes('logical-chess')} onPlay={onPlay} />
            <ProofBand />
            <InkGround>
                <StuckWeek />
                <TheSystem />
            </InkGround>
            <RatingMoves />
            <LiveClasses playing={unlocked.includes('calculation')} onPlay={onPlay} />
            <GameReview playing={unlocked.includes('game-review')} onPlay={onPlay} />
            <Senseis />
            <Community />
            <Objections />
            <OfferSection />
            <Faq />
            <Closing onWatch={() => onPlay('logical-chess')} />
            <StickyOfferBar />
            <GateDialog
                classId={gateFor}
                onClose={() => setGateFor(undefined)}
                onUnlocked={onUnlocked}
            />
        </Box>
    );
}
