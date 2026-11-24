'use client';

import { ContributorStatusResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Alert, Button, CircularProgress, Container, Stack } from '@mui/material';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ApplyScreen } from './ApplyScreen';
import { getPuzzlebaseClient, PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';

interface PuzzlebaseGateProps {
    /** Where the puzzlebase data comes from. Defaults to the real API. */
    client?: PuzzlebaseClient;
    /** Renders the puzzlebase, once we know the user is allowed to see it. */
    children: (props: { client: PuzzlebaseClient; status: ContributorStatusResponse }) => ReactNode;
}

/**
 * Only lets Puzzle Contributors and admins through to the puzzlebase. Everyone else sees the
 * apply screen, without any puzzles. (The API refuses to send puzzles to them either way.)
 */
export function PuzzlebaseGate({ client = getPuzzlebaseClient(), children }: PuzzlebaseGateProps) {
    const [status, setStatus] = useState<ContributorStatusResponse>();
    const [error, setError] = useState<string>();

    const fetchStatus = useCallback(async () => {
        try {
            setStatus(await client.getStatus());
        } catch (err) {
            setError(errorMessage(err));
        }
    }, [client]);

    useEffect(() => {
        void fetchStatus();
    }, [fetchStatus]);

    const retry = () => {
        setError(undefined);
        void fetchStatus();
    };

    if (error) {
        return (
            <Container maxWidth='sm' sx={{ py: 8 }}>
                <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
                    <Alert severity='error' sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                    <Button onClick={retry}>Try again</Button>
                </Stack>
            </Container>
        );
    }

    if (!status) {
        return (
            <Stack sx={{ alignItems: 'center', py: 12 }} role='status' aria-label='Loading'>
                <CircularProgress />
            </Stack>
        );
    }

    if (!status.canContribute) {
        return <ApplyScreen client={client} status={status} onStatusChange={setStatus} />;
    }

    return <>{children({ client, status })}</>;
}
