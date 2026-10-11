'use client';

import { AdminAction } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { Alert, Button, Collapse, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';

/** For puzzle admins: a record of what admins have done (deleting themes, approving contributors). */
export function AdminLogPanel({ client }: { client: PuzzlebaseClient }) {
    const [open, setOpen] = useState(false);
    const [actions, setActions] = useState<AdminAction[]>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        client
            .listAdminLog()
            .then((log) => !cancelled && setActions(log))
            .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
        return () => {
            cancelled = true;
        };
    }, [client, open]);

    return (
        <Paper variant='outlined' sx={{ p: 2 }}>
            <Stack sx={{ gap: 1 }}>
                <Button
                    color='inherit'
                    onClick={() => setOpen((v) => !v)}
                    endIcon={open ? <ExpandLess /> : <ExpandMore />}
                    sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                >
                    <Typography
                        variant='overline'
                        sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                    >
                        Admin log
                    </Typography>
                </Button>
                <Collapse in={open} unmountOnExit>
                    {error && <Alert severity='error'>{error}</Alert>}
                    {actions?.length === 0 && (
                        <Typography color='text.secondary'>Nothing has been logged yet.</Typography>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        {actions?.map((action) => (
                            <Stack key={action.at + action.summary}>
                                <Typography>{action.summary}</Typography>
                                <Typography variant='caption' color='text.secondary'>
                                    {action.displayName} · {new Date(action.at).toLocaleString()}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Collapse>
            </Stack>
        </Paper>
    );
}
