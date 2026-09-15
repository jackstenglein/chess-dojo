'use client';

import { Add, EmojiEvents, Flag, Handshake, SaveOutlined, SmartToy } from '@mui/icons-material';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { MaiaRating } from './maiaengine';
import { SaveMaiaGameDialog } from './SaveGameDialog';
import { GameOverReason, GameResult, PlayerColor, UseMaiaGameResult } from './useMaiaGame';

function formatClock(ms: number | null): string {
    if (ms === null) return '∞';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

interface ClockDisplayProps {
    ms: number | null;
    isActive: boolean;
    isLow: boolean;
    label: string;
}

const REASON_LABELS: Record<NonNullable<GameOverReason>, string> = {
    checkmate: 'Checkmate',
    stalemate: 'Stalemate',
    insufficient: 'Insufficient Material',
    repetition: 'Threefold Repetition',
    'fifty-move': '50-Move Rule',
    resign: 'Resignation',
    timeout: 'Time Out',
};

function ClockDisplay({ ms, isActive, isLow, label }: ClockDisplayProps) {
    const isTimed = ms !== null;
    return (
        <Stack
            direction='row'
            sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isActive ? (isLow ? 'error.main' : 'action.selected') : 'transparent',
                transition: 'all 0.2s ease',
            }}
        >
            <Typography
                variant='caption'
                sx={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? (isLow ? 'white' : 'text.primary') : 'text.secondary',
                }}
            >
                {label}
            </Typography>
            <Typography
                variant='h6'
                sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: 1,
                    lineHeight: 1,
                    color: isActive ? (isLow ? 'white' : 'text.primary') : 'text.secondary',
                }}
            >
                {isTimed ? formatClock(ms) : '—'}
            </Typography>
        </Stack>
    );
}

function ResultBanner({
    result,
    reason,
    playerColor,
}: {
    result: GameResult;
    reason: GameOverReason;
    playerColor: PlayerColor;
}) {
    if (!result) return null;
    const isDraw = result === 'draw';
    const playerWon = result === playerColor;
    const reasonLabel = reason ? REASON_LABELS[reason] : '';
    const headline = isDraw
        ? `Draw — ${reasonLabel}`
        : playerWon
          ? `You Win!${reason === 'checkmate' ? ' — Checkmate' : reason === 'timeout' ? ' — Time Out' : ''}`
          : `Maia Wins${reason === 'checkmate' ? ' — Checkmate' : reason === 'resign' ? ' — You Resigned' : reason === 'timeout' ? ' — Time Out' : ''}`;
    const color = isDraw ? 'info' : playerWon ? 'success' : 'error';
    return (
        <Stack
            direction='row'
            spacing={1}
            sx={{
                alignItems: 'center',
                p: 1,
                borderRadius: 1,
                bgcolor: `${color}.main`,
                color: 'white',
            }}
        >
            {isDraw ? (
                <Handshake fontSize='small' />
            ) : playerWon ? (
                <EmojiEvents fontSize='small' />
            ) : (
                <SmartToy fontSize='small' />
            )}
            <Typography
                variant='body2'
                sx={{
                    fontWeight: 'bold',
                }}
            >
                {headline}
            </Typography>
        </Stack>
    );
}

interface PlayBotControlsProps {
    game: UseMaiaGameResult;
    maiaRating: MaiaRating;
    onNewGame: () => void;
}

export function PlayBotControls({ game, maiaRating, onNewGame }: PlayBotControlsProps) {
    const {
        moves,
        playerColor,
        playerToMove,
        botThinking,
        result,
        reason,
        resign,
        startFen,
        clock,
        timeControl,
    } = game;

    const [saveOpen, setSaveOpen] = useState(false);

    const gameOver = result !== null;
    const canResign = !gameOver && moves.length >= 2;
    const isTimed = timeControl.initialMs !== null;

    // Clock perspective: opponent at top, player at bottom
    const botColor: PlayerColor = playerColor === 'white' ? 'black' : 'white';
    const botMs = botColor === 'white' ? clock.whiteMs : clock.blackMs;
    const playerMs = playerColor === 'white' ? clock.whiteMs : clock.blackMs;
    const botClockActive = clock.running === botColor && !gameOver;
    const playerClockActive = clock.running === playerColor && !gameOver;
    const LOW_TIME_MS = 30_000;
    const botLow = isTimed && botMs !== null && botMs < LOW_TIME_MS;
    const playerLow = isTimed && playerMs !== null && playerMs < LOW_TIME_MS;

    return (
        <Stack spacing={1.5} sx={{ p: 1.5, height: '100%' }}>
            {/* Maia identity */}
            <Stack
                direction='row'
                spacing={1}
                sx={{
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 0.5,
                }}
            >
                <SmartToy color='primary' fontSize='small' />
                <Typography
                    variant='subtitle2'
                    sx={{
                        fontWeight: 'bold',
                    }}
                >
                    Maia
                </Typography>
                <Chip label={maiaRating} size='small' color='primary' variant='outlined' />
                {isTimed && timeControl.initialMs !== null && (
                    <Chip
                        label={`${timeControl.initialMs / 60000}+${timeControl.incrementMs / 1000}`}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '0.7rem' }}
                    />
                )}
            </Stack>

            <Divider />

            {/* Opponent (bot) clock — top */}
            {isTimed && (
                <ClockDisplay
                    ms={botMs}
                    isActive={botClockActive}
                    isLow={botLow}
                    label={`Maia ${maiaRating}`}
                />
            )}

            {/* Result or status */}
            {gameOver ? (
                <ResultBanner result={result} reason={reason} playerColor={playerColor} />
            ) : (
                <Typography
                    variant='caption'
                    sx={{
                        color: 'text.secondary',
                        minHeight: 18,
                    }}
                >
                    {botThinking
                        ? 'Maia is thinking…'
                        : playerToMove
                          ? 'Your move'
                          : 'Waiting for Maia…'}
                </Typography>
            )}

            <Box sx={{ flex: 1 }} />

            {/* Player clock — bottom */}
            {isTimed && (
                <ClockDisplay
                    ms={playerMs}
                    isActive={playerClockActive}
                    isLow={playerLow}
                    label='You'
                />
            )}

            <Divider />

            {/* Actions */}
            <Stack spacing={1}>
                <Button
                    variant='contained'
                    startIcon={<Add />}
                    onClick={onNewGame}
                    fullWidth
                    size='small'
                >
                    New Game
                </Button>
                {!gameOver && (
                    <Button
                        variant='outlined'
                        color='error'
                        startIcon={<Flag />}
                        onClick={resign}
                        disabled={!canResign}
                        fullWidth
                        size='small'
                    >
                        Resign
                    </Button>
                )}
                {gameOver && moves.length > 0 && (
                    <>
                        <Button
                            variant='outlined'
                            startIcon={<SaveOutlined />}
                            onClick={() => setSaveOpen(true)}
                            fullWidth
                            size='small'
                        >
                            Save Game
                        </Button>
                        <SaveMaiaGameDialog
                            open={saveOpen}
                            onClose={() => setSaveOpen(false)}
                            result={result}
                            moves={moves}
                            playerColor={playerColor}
                            maiaRating={maiaRating}
                            startFen={startFen}
                        />
                    </>
                )}
            </Stack>
        </Stack>
    );
}
