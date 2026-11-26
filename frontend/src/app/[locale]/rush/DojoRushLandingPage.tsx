'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { Box, GlobalStyles } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { rememberAttribution } from '../class/classLead';
import { ProofBand } from '../class/sections/ProofBand';
import { RatingMoves } from '../class/sections/RatingMoves';
import { pageSx, scrollToOffer } from '../class/sections/shared';
import { offerLabel, RUSH_DEMO_RUN_LIMIT, startLabel } from './content';
import { loadRushPuzzleSource } from './puzzleSource';
import {
    bestSolved,
    hasRunsLeft,
    readRuns,
    RushDemoRun,
    saveRun,
    useRushRuns,
} from './rushStorage';
import { Faq, FinalCta, StickyBar } from './sections/Closing';
import { DojoWeek } from './sections/DojoWeek';
import { Hero } from './sections/Hero';
import { MissesReview } from './sections/MissesReview';
import { pressSx } from './sections/motion';
import { scrollToTop } from './sections/parts';
import { Plans } from './sections/Plans';
import { RunComplete } from './sections/RunComplete';
import { RunScreen } from './sections/RunScreen';
import { Senseis } from './sections/TheDojo';
import { Unlock } from './sections/Unlock';
import { JesseQuote, WhyItWorks } from './sections/WhyItWorks';
import { RushDemoResult, useRushDemo } from './useRushDemo';

/** The site navigation is dropped on this page, as on /class: the page has one job. */
const hideSiteNavigation = (
    <GlobalStyles styles={{ '[data-testid="navbar"]': { display: 'none !important' } }} />
);

/** Puzzles from earlier runs in this browser, so a new run starts with fresh ones. */
function seenPuzzleIds(): string[] {
    return readRuns().flatMap((run) => run.puzzleIds);
}

function toRun(result: RushDemoResult): RushDemoRun {
    return {
        solved: result.stats.correctCount,
        attempted: result.stats.totalCount,
        accuracy: result.stats.percentage,
        highestSolved: result.stats.peakCompletedRating,
        timeSeconds: result.totalTimeSeconds,
        endReason: result.endReason,
        finishedAt: new Date().toISOString(),
        misses: result.attempts
            .filter((attempt) => attempt.result === 'loss')
            .map((attempt) => ({
                puzzleId: attempt.puzzleId,
                fen: attempt.fen,
                moves: attempt.moves,
                rating: attempt.puzzleRating,
            })),
        puzzleIds: result.attempts.map((attempt) => attempt.puzzleId),
        attempts: result.attempts.map((attempt) => ({
            puzzleId: attempt.puzzleId,
            rating: attempt.puzzleRating,
            result: attempt.result,
            seconds: attempt.timeSpentSeconds,
        })),
    };
}

export function DojoRushLandingPage() {
    const runs = useRushRuns();
    const [reviewing, setReviewing] = useState<{ from: number }>();

    useEffect(() => {
        rememberAttribution(window.location.search);
    }, []);

    const onFinish = useCallback((result: RushDemoResult) => {
        const saved = saveRun(toRun(result));
        trackEvent(EventType.RushDemoFinish, {
            run_number: saved.length,
            solved: result.stats.correctCount,
            end_reason: result.endReason,
        });
        if (saved.length >= RUSH_DEMO_RUN_LIMIT) {
            trackEvent(EventType.RushDemoUnlock, { best_score: bestSolved(saved) });
        }
        window.scrollTo({ top: 0 });
    }, []);

    const rush = useRushDemo({
        loadSource: () => loadRushPuzzleSource(seenPuzzleIds()),
        runsCompleted: runs.length,
        runLimit: RUSH_DEMO_RUN_LIMIT,
        onFinish,
    });

    const unlocked = !hasRunsLeft(runs);
    const nextRunNumber = runs.length + 1;
    const playing = rush.phase === 'loading' || rush.phase === 'running';
    const lastRun = runs[runs.length - 1];

    const onStart = () => {
        setReviewing(undefined);
        if (rush.start()) {
            trackEvent(EventType.RushDemoStart, { run_number: nextRunNumber });
        } else {
            scrollToTop();
        }
    };

    const onReview = (missIndex = 0) => {
        trackEvent(EventType.RushDemoReview, {
            run_number: runs.length,
            misses: lastRun?.misses.length ?? 0,
        });
        setReviewing({ from: missIndex });
    };

    const onOffer = (placement: string) => {
        setReviewing(undefined);
        trackEvent(EventType.RushDemoOfferClick, { placement });
        // The plans are back on the page one frame after the review closes.
        requestAnimationFrame(scrollToOffer);
    };

    if (playing) {
        return (
            <>
                {hideSiteNavigation}
                <RunScreen
                    rush={rush}
                    runNumber={nextRunNumber}
                    best={runs.length > 0 ? bestSolved(runs) : undefined}
                />
            </>
        );
    }

    if (reviewing && lastRun) {
        return (
            <>
                {hideSiteNavigation}
                <MissesReview
                    misses={lastRun.misses}
                    initialIndex={reviewing.from}
                    nextLabel={unlocked ? offerLabel() : startLabel(nextRunNumber)}
                    onNext={unlocked ? () => onOffer('review') : onStart}
                    onClose={() => setReviewing(undefined)}
                />
            </>
        );
    }

    const actionLabel = unlocked ? offerLabel() : startLabel(nextRunNumber);

    return (
        <Box className='dark' sx={{ ...pageSx, ...pressSx }}>
            {hideSiteNavigation}
            {runs.length === 0 ? (
                <Hero onStart={onStart} loadFailed={rush.loadFailed} />
            ) : unlocked ? (
                <Unlock runs={runs} onReview={onReview} />
            ) : (
                <RunComplete
                    runs={runs}
                    onStart={onStart}
                    onReview={onReview}
                    loadFailed={rush.loadFailed}
                />
            )}
            <ProofBand />
            <WhyItWorks />
            <JesseQuote />
            <DojoWeek onStart={unlocked ? undefined : onStart} />
            <RatingMoves />
            <Senseis />
            <Plans unlocked={unlocked} />
            <Faq />
            <FinalCta
                unlocked={unlocked}
                label={actionLabel}
                onAction={unlocked ? () => onOffer('closing') : onStart}
            />
            <StickyBar
                label={actionLabel}
                onAction={unlocked ? () => onOffer('sticky') : onStart}
                watchKey={runs.length}
                runsDone={runs.length}
                unlocked={unlocked}
            />
        </Box>
    );
}
