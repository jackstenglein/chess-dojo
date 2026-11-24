'use client';

import { parseLichessLink } from '@jackstenglein/chess-dojo-common/src/wcLive/customGames';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useState } from 'react';

interface AddGameDialogProps {
    open: boolean;
    onClose: () => void;
    /** Adds the game and returns its tab id. Throws with the API's message on failure. */
    onAdd: (url: string, name: string) => Promise<void>;
}

/** Senseis add a tab for any Lichess game by pasting its link. */
export function AddGameDialog({ open, onClose, onAdd }: AddGameDialogProps) {
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const looksRight = !!parseLichessLink(url);

    const close = () => {
        setUrl('');
        setName('');
        setError('');
        onClose();
    };

    const add = async () => {
        if (!looksRight) {
            setError('Paste a Lichess game link, or a link to a broadcast round or board.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onAdd(url.trim(), name.trim());
            close();
        } catch (err) {
            const data: unknown = isAxiosError(err) ? err.response?.data : undefined;
            const message =
                data && typeof data === 'object' && 'message' in data ? data.message : undefined;
            setError(typeof message === 'string' ? message : 'Could not add the game. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={close} maxWidth='sm' fullWidth>
            <DialogTitle>Add a game</DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Paste a link to any Lichess game, or to a board or round of a Lichess broadcast.
                    It gets its own tab for everyone, with guess the move, the leaderboard and
                    sensei evals.
                </Typography>
                <TextField
                    autoFocus
                    fullWidth
                    label='Lichess link'
                    placeholder='https://lichess.org/abcd1234'
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void add()}
                    error={!!error}
                    helperText={error || undefined}
                    sx={{ mb: 2 }}
                />
                <TextField
                    fullWidth
                    label='Tab name (optional)'
                    placeholder='The players’ names'
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 40))}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={close}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={() => void add()}
                    disabled={!url.trim() || saving}
                >
                    {saving ? 'Adding…' : 'Add game'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
