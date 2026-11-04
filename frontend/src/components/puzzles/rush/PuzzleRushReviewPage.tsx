'use client';

import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import {
    PuzzleRushAttemptsTable,
    puzzleRushRetryHref,
    PuzzleRushStatsGrid,
} from './PuzzleRushSummary';
import { usePuzzleRushSession } from './usePuzzleRushSession';

/**
 * Renders the review page for a single puzzle rush run: the run's statistics and a
 * table of every attempt, each linking to an untimed retry of that puzzle.
 */
export function PuzzleRushReviewPage({ createdAt }: { createdAt: string }) {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }
    return <PuzzleRushReview createdAt={createdAt} />;
}

function PuzzleRushReview({ createdAt }: { createdAt: string }) {
    const t = useTranslations('puzzles.rush');
    const { user } = useAuth();
    const request = usePuzzleRushSession(createdAt);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const session = request.data;
    if (!session) {
        return (
            <>
                <NotFoundPage />
                <RequestSnackbar request={request} />
            </>
        );
    }

    const date = new Date(session.createdAt);

    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Stack spacing={4} sx={{ alignItems: 'center' }}>
                <Stack sx={{ alignItems: 'center' }}>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        {t('reviewTitle')}
                    </Typography>
                    <Typography
                        variant='body2'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {toDojoDateString(date, user?.timezoneOverride)} •{' '}
                        {toDojoTimeString(date, user?.timezoneOverride, user?.timeFormat)}
                    </Typography>
                </Stack>

                <PuzzleRushStatsGrid
                    stats={session}
                    endReason={session.endReason}
                    totalTimeSeconds={session.totalTimeSeconds}
                />

                <Stack direction='row' spacing={2} sx={{ justifyContent: 'center' }}>
                    <Button variant='contained' component={Link} href='/puzzles/rush'>
                        {t('newRun')}
                    </Button>
                    <Button variant='outlined' component={Link} href='/puzzles/rush/history'>
                        {t('viewHistory')}
                    </Button>
                </Stack>

                <Box sx={{ width: 1 }}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {t('attemptsHeading')}
                    </Typography>
                    <Typography
                        variant='body2'
                        sx={{
                            color: 'text.secondary',
                            mb: 2,
                        }}
                    >
                        {t('attemptsHintSaved')}
                    </Typography>
                    <PuzzleRushAttemptsTable
                        attempts={session.attempts}
                        getHref={(index) => puzzleRushRetryHref(session.createdAt, index)}
                    />
                </Box>
            </Stack>
        </Container>
    );
}
