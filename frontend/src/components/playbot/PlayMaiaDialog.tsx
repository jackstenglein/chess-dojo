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
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
    const [selectedColor, setSelectedColor] = useState<'white' | 'black'>(playerColor);

    useEffect(() => {
        setSelectedColor(playerColor);
    }, [playerColor]);

    const mins = limitSeconds / 60;
    const inc = incrementSeconds;
    const isUnlimited = limitSeconds === 0 && incrementSeconds === 0;
    const t = useTranslations('PlayMaia');
    const handleStart = () => {
        const params = new URLSearchParams({
            fen: fen.trim(),
            mins: String(mins),
            inc: String(inc),
            color: selectedColor,
            rating: String(maiaRating),
        });
        router.push(`/play-bot?${params.toString()}`);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
            <DialogTitle>
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <SmartToy color='primary' />
                    <span>{t('title')}</span>
                </Stack>
                {positionTitle && (
                    <Typography
                        variant='body2'
                        sx={{
                            color: 'text.secondary',
                            mt: 0.5,
                        }}
                    >
                        {positionTitle}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent>
                <Stack
                    spacing={2.5}
                    sx={{
                        pt: 0.5,
                    }}
                >
                    {/* Fixed config summary */}
                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{
                            flexWrap: 'wrap',
                            gap: 0.75,
                        }}
                    >
                        <Chip
                            size='small'
                            label={isUnlimited ? 'Unlimited' : `${mins}+${inc}`}
                            variant='outlined'
                            sx={{ height: 32 }}
                        />
                        <Select
                            size='small'
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            sx={{ height: 32 }}
                        >
                            <MenuItem value='white'>
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: 'white',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    />
                                    <span>{t('playAsWhite')}</span>
                                </Stack>
                            </MenuItem>
                            <MenuItem value='black'>
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: 'grey.700',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    />
                                    <span>{t('playAsBlack')}</span>
                                </Stack>
                            </MenuItem>
                        </Select>
                    </Stack>

                    <Divider />

                    {/* Maia rating picker */}
                    <Stack spacing={1}>
                        <Typography
                            variant='subtitle2'
                            sx={{
                                fontWeight: 'bold',
                                color: 'text.secondary',
                            }}
                        >
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
                                    <Stack
                                        direction='row'
                                        spacing={1.5}
                                        sx={{
                                            alignItems: 'center',
                                        }}
                                    >
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
                        <Typography
                            variant='caption'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
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
