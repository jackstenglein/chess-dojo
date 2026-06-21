'use client';

import { useRouter } from '@/hooks/useRouter';
import { PlayArrow, SmartToy } from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { MAIA_RATINGS, MaiaRating } from './maiaengine';
import { RATING_DESCRIPTIONS } from './playbot';

interface PlayMaiaDialogProps {
    open: boolean;
    onClose: () => void;
    fen: string;
    limitSeconds: number;
    incrementSeconds: number;
    positionTitle?: string;
    /** Which side to play — derived from whose turn it is in the FEN */
    playerColor: 'white' | 'black';
}

export function PlayMaiaDialog({
    open,
    onClose,
    fen,
    limitSeconds,
    incrementSeconds,
    positionTitle,
    playerColor,
}: PlayMaiaDialogProps) {
    const router = useRouter();
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(1500);

    const mins = limitSeconds / 60;
    const inc = incrementSeconds;
    const isUnlimited = limitSeconds === 0 && incrementSeconds === 0;

    const handleStart = () => {
        const params = new URLSearchParams({
            fen: fen.trim(),
            mins: String(mins),
            inc: String(inc),
            color: playerColor,
            rating: String(maiaRating),
        });
        router.push(`/play-bot?${params.toString()}`);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
            <DialogTitle>
                <Stack direction='row' alignItems='center' spacing={1}>
                    <SmartToy color='primary' />
                    <span>Play vs Dojo Sparring Bot</span>
                </Stack>
                {positionTitle && (
                    <Typography variant='body2' color='text.secondary' mt={0.5}>
                        {positionTitle}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2.5} pt={0.5}>
                    {/* Fixed config summary */}
                    <Stack direction='row' spacing={1} flexWrap='wrap' gap={0.75}>
                        <Chip
                            size='small'
                            label={isUnlimited ? 'Unlimited' : `${mins}+${inc}`}
                            variant='outlined'
                        />
                        <Chip
                            size='small'
                            label={`Play as ${playerColor}`}
                            variant='outlined'
                            icon={
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        ml: '6px !important',
                                        bgcolor: playerColor === 'white' ? 'white' : 'grey.700',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                />
                            }
                        />
                    </Stack>

                    <Divider />

                    {/* Maia rating picker */}
                    <Stack spacing={1}>
                        <Typography variant='subtitle2' fontWeight='bold' color='text.secondary'>
                            MAIA RATING
                        </Typography>
                        <Select
                            size='small'
                            value={maiaRating}
                            onChange={(e) => setMaiaRating(e.target.value)}
                            fullWidth
                        >
                            {MAIA_RATINGS.map((r) => (
                                <MenuItem key={r} value={r}>
                                    <Stack direction='row' alignItems='center' spacing={1.5}>
                                        <Chip
                                            label={r}
                                            size='small'
                                            color='primary'
                                            sx={{ minWidth: 48 }}
                                        />
                                        <Typography variant='body2'>
                                            {RATING_DESCRIPTIONS[r]}
                                        </Typography>
                                    </Stack>
                                </MenuItem>
                            ))}
                        </Select>
                        <Typography variant='caption' color='text.secondary'>
                            Maia plays like a real human at this rating level — not a weakened
                            engine.
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color='inherit'>
                    Cancel
                </Button>
                <Button variant='contained' startIcon={<PlayArrow />} onClick={handleStart}>
                    Start Match
                </Button>
            </DialogActions>
        </Dialog>
    );
}
