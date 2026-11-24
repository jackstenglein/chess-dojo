'use client';

import { DeleteOutlined } from '@mui/icons-material';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from './puzzlebaseErrors';

interface DeletePuzzleButtonProps {
    puzzleId: string;
    /** Deletes the puzzle. Rejects with the server's error if it could not. */
    onDelete: () => Promise<void>;
    /** A trash icon (on the puzzle page) or a text button (in the edit dialog). */
    variant?: 'icon' | 'text';
}

/** A button that deletes a puzzle after asking first. Only shown to its author and admins. */
export function DeletePuzzleButton({
    puzzleId,
    onDelete,
    variant = 'text',
}: DeletePuzzleButtonProps) {
    const [confirming, setConfirming] = useState(false);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string>();

    const remove = async () => {
        setWorking(true);
        setError(undefined);
        try {
            await onDelete();
            setConfirming(false);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorking(false);
        }
    };

    return (
        <>
            {variant === 'icon' ? (
                <Tooltip title='Delete puzzle'>
                    <IconButton
                        aria-label={`Delete puzzle ${puzzleId}`}
                        onClick={() => setConfirming(true)}
                    >
                        <DeleteOutlined />
                    </IconButton>
                </Tooltip>
            ) : (
                <Button
                    color='error'
                    startIcon={<DeleteOutlined />}
                    onClick={() => setConfirming(true)}
                >
                    Delete puzzle
                </Button>
            )}
            <Dialog open={confirming} onClose={working ? undefined : () => setConfirming(false)}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Delete puzzle #{puzzleId}?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        It is removed from the PuzzleBase and the trainer. This can&apos;t be
                        undone.
                    </DialogContentText>
                    {error && (
                        <Alert severity='error' sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button color='inherit' onClick={() => setConfirming(false)} disabled={working}>
                        Keep it
                    </Button>
                    <Button
                        variant='contained'
                        color='error'
                        onClick={() => void remove()}
                        disabled={working}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
