'use client';

/**
 * PlayBotAfterPgn
 *
 * Renders below the move list (afterPgnText slot).
 * During setup: shows a prompt to configure and start.
 * During game: shows thinking indicator / move status.
 */

import { CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { MaiaRating } from './maiaengine';
import { UseMaiaGameResult } from './useMaiaGame';

interface PlayBotAfterPgnProps {
    game: UseMaiaGameResult;
    view: 'setup' | 'playing';
    maiaRating: MaiaRating;
}

export function PlayBotAfterPgn({ game, view, maiaRating }: PlayBotAfterPgnProps) {
    if (view === 'setup') {
        return (
            <Stack
                spacing={0.5}
                sx={{
                    alignItems: 'center',
                    py: 1,
                }}
            >
                <Divider sx={{ width: 1 }} />
                <Typography
                    variant='caption'
                    sx={{
                        color: 'text.disabled',
                        pt: 1,
                    }}
                >
                    Configure your game in the left panel, then click Play.
                </Typography>
            </Stack>
        );
    }

    const { botThinking, playerToMove, result } = game;
    if (result !== null) return null;

    return (
        <Stack
            sx={{
                py: 1,
            }}
        >
            <Divider sx={{ mb: 1 }} />
            {botThinking ? (
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                        px: 1,
                    }}
                >
                    <CircularProgress size={12} thickness={5} />
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        Maia {maiaRating} is thinking…
                    </Typography>
                </Stack>
            ) : (
                <Typography
                    variant='caption'
                    sx={{
                        color: 'text.secondary',
                        px: 1,
                    }}
                >
                    {playerToMove ? 'Your move' : 'Waiting for Maia…'}
                </Typography>
            )}
        </Stack>
    );
}
