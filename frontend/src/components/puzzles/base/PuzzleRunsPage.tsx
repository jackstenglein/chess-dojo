'use client';

import { useAuth } from '@/auth/Auth';
import { ArrowBack } from '@mui/icons-material';
import { Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { PuzzleStatsTab } from '../stats/PuzzleStatsTab';

/**
 * A member's past training runs: their tactics rating, how they did on each theme, and every
 * session, day by day, down to each move they tried. The same view as the Puzzle Stats tab on
 * their profile.
 */
export function PuzzleRunsPage() {
    const { user } = useAuth();

    return (
        <Container maxWidth='md' sx={{ py: { xs: 3, md: 5 } }}>
            <Stack sx={{ gap: 3 }}>
                <Stack direction='row' sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        component={Link}
                        href='/puzzles/train'
                        startIcon={<ArrowBack />}
                        color='inherit'
                    >
                        Train
                    </Button>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Past runs
                    </Typography>
                </Stack>
                {user ? (
                    <PuzzleStatsTab username={user.username} />
                ) : (
                    <Stack sx={{ alignItems: 'center', py: 6 }}>
                        <CircularProgress />
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
