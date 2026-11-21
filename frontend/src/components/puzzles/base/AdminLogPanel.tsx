'use client';

import { AdminAction } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { History } from '@mui/icons-material';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
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
        <>
            <Button color='inherit' startIcon={<History />} onClick={() => setOpen(true)}>
                Admin log
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Admin log</DialogTitle>
                <DialogContent>
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
                </DialogContent>
                <DialogActions>
                    <Button color='inherit' onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
