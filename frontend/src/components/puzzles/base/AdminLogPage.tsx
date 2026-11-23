'use client';

import { AdminAction } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { ArrowBack } from '@mui/icons-material';
import {
    Alert,
    Button,
    CircularProgress,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';
import { PuzzlebaseGate } from './PuzzlebaseGate';

/** Every action puzzle admins have taken, newest first. Only for puzzle admins. */
export function AdminLogPage() {
    return (
        <PuzzlebaseGate>
            {({ client, status }) =>
                status.isAdmin ? (
                    <AdminLog client={client} />
                ) : (
                    <Container maxWidth='sm' sx={{ py: 8 }}>
                        <Alert severity='info'>Only puzzle admins can see the admin log.</Alert>
                    </Container>
                )
            }
        </PuzzlebaseGate>
    );
}

function AdminLog({ client }: { client: PuzzlebaseClient }) {
    const [actions, setActions] = useState<AdminAction[]>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        client
            .listAdminLog()
            .then((log) => !cancelled && setActions(log))
            .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
        return () => {
            cancelled = true;
        };
    }, [client]);

    return (
        <Container maxWidth='md' sx={{ py: 3 }}>
            <Stack sx={{ gap: 2.5 }}>
                <Button
                    component={Link}
                    href='/puzzles/base'
                    color='inherit'
                    startIcon={<ArrowBack />}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    Dojo PuzzleBase
                </Button>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                    Admin log
                </Typography>

                {error && <Alert severity='error'>{error}</Alert>}
                {!actions && !error && (
                    <Stack sx={{ alignItems: 'center', py: 6 }} role='status' aria-label='Loading'>
                        <CircularProgress />
                    </Stack>
                )}
                {actions?.length === 0 && (
                    <Typography color='text.secondary'>Nothing has been logged yet.</Typography>
                )}
                {actions && actions.length > 0 && (
                    <Paper variant='outlined'>
                        <Table size='small'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>When</TableCell>
                                    <TableCell>Admin</TableCell>
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {actions.map((action) => (
                                    <TableRow key={action.at + action.summary}>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {new Date(action.at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{action.displayName}</TableCell>
                                        <TableCell>{action.summary}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Stack>
        </Container>
    );
}
