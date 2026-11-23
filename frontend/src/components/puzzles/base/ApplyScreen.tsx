'use client';

import { ContributorStatusResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { CheckCircleOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Container, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { bucketColor } from './bucketStyle';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';

const STEPS = [
    'The PuzzleBase is the Dojo’s curated collection of puzzles, kept by Puzzle Contributors.',
    'Apply below. A Dojo admin will review your application.',
    'Once approved, you can browse every puzzle and add your own from a PGN or a Lichess study.',
];

interface ApplyScreenProps {
    client: PuzzlebaseClient;
    status: ContributorStatusResponse;
    /** Called with the new status after applying or checking again. */
    onStatusChange: (status: ContributorStatusResponse) => void;
}

/**
 * What everyone who is not a Puzzle Contributor sees instead of the puzzlebase: the title, a few
 * instructions, and a big button to apply. After applying, it says the application is waiting.
 */
export function ApplyScreen({ client, status, onStatusChange }: ApplyScreenProps) {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string>();

    const pending = status.contributor?.status === 'PENDING';
    const denied = status.contributor?.status === 'DENIED';
    const revoked = status.contributor?.status === 'REVOKED';

    const run = async (action: () => Promise<ContributorStatusResponse>) => {
        setWorking(true);
        setError(undefined);
        try {
            onStatusChange(await action());
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorking(false);
        }
    };

    const apply = () =>
        run(async () => {
            const contributor = await client.apply();
            return { ...status, contributor };
        });

    const checkAgain = () => run(() => client.getStatus());

    return (
        <Container maxWidth='sm' sx={{ py: { xs: 6, md: 10 } }}>
            <Stack sx={{ gap: 4, alignItems: 'center', textAlign: 'center' }}>
                <Stack sx={{ gap: 2, alignItems: 'center', width: '100%' }}>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Dojo PuzzleBase
                    </Typography>
                    <Stack direction='row' aria-hidden sx={{ height: 3, width: 160 }}>
                        {['Tactics', 'Strategy', 'Opening', 'Middlegame', 'Endgame'].map((b) => (
                            <Box key={b} sx={{ flex: 1, bgcolor: bucketColor(b) }} />
                        ))}
                    </Stack>
                </Stack>

                <Stack
                    component='ol'
                    sx={{
                        gap: 1.5,
                        m: 0,
                        p: 0,
                        listStyle: 'none',
                        textAlign: 'left',
                        width: '100%',
                    }}
                >
                    {STEPS.map((step, i) => (
                        <Stack component='li' key={step} direction='row' sx={{ gap: 2 }}>
                            <Typography
                                sx={{
                                    fontWeight: 'bold',
                                    color: 'primary.main',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {i + 1}
                            </Typography>
                            <Typography color='text.secondary'>{step}</Typography>
                        </Stack>
                    ))}
                </Stack>

                {revoked ? (
                    <Alert severity='info' sx={{ width: '100%', textAlign: 'left' }}>
                        Your Puzzle Contributor access was removed. You can still train on puzzles
                        with the Tactics Trainer.
                    </Alert>
                ) : denied ? (
                    <Alert severity='info' sx={{ width: '100%', textAlign: 'left' }}>
                        Your application to be a Puzzle Contributor was not approved. You can still
                        train on puzzles with the Tactics Trainer.
                    </Alert>
                ) : pending ? (
                    <Stack sx={{ gap: 2, alignItems: 'center' }}>
                        <Stack direction='row' sx={{ gap: 1, alignItems: 'center' }}>
                            <CheckCircleOutlined color='success' />
                            <Typography sx={{ fontWeight: 'bold' }}>
                                Application received
                            </Typography>
                        </Stack>
                        <Typography color='text.secondary'>
                            A Dojo admin will review it. You will get access as soon as it is
                            approved.
                        </Typography>
                        <Button color='inherit' disabled={working} onClick={checkAgain}>
                            Check again
                        </Button>
                    </Stack>
                ) : (
                    <Button
                        variant='contained'
                        size='large'
                        disabled={working}
                        onClick={apply}
                        sx={{
                            width: '100%',
                            maxWidth: 420,
                            py: 2,
                            fontSize: '1.15rem',
                            fontWeight: 'bold',
                        }}
                    >
                        Apply to be a Puzzle Contributor
                    </Button>
                )}

                {error && (
                    <Alert severity='error' sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                )}
            </Stack>
        </Container>
    );
}
