'use client';

import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import PgnBoard from '@/board/pgn/PgnBoard';
import { GameContext } from '@/context/useGame';
import { Chess } from '@jackstenglein/chess';
import { AppBar, Box, Button, Dialog, Stack, Toolbar, Typography } from '@mui/material';
import { useMemo } from 'react';

/** A puzzle the Tactics Forger asks to analyse: Lichess format (FEN before their move, UCI moves). */
export interface ForgerAnalysis {
    fen: string;
    moves: string[];
    orientation?: 'white' | 'black';
    title?: string;
}

/** Builds a PGN from the puzzle's start and its solution moves, stopping at any move that doesn't fit. */
function puzzlePgn({ fen, moves }: ForgerAnalysis): string {
    const chess = new Chess({ fen });
    for (const uci of moves) {
        try {
            if (!chess.move(uci)) break; // the library takes UCI strings
        } catch {
            break;
        }
    }
    return chess.renderPgn();
}

/**
 * The site's analysis board (with Stockfish) over the Tactics Forger, for one puzzle and its
 * solution. The frame stays mounted underneath, so closing it returns the player to their set.
 */
export function ForgerAnalysisDialog({
    analysis,
    onClose,
}: {
    analysis: ForgerAnalysis;
    onClose: () => void;
}) {
    const pgn = useMemo(() => puzzlePgn(analysis), [analysis]);
    return (
        <Dialog open fullScreen onClose={onClose}>
            <AppBar
                position='static'
                color='default'
                elevation={0}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
                <Toolbar sx={{ gap: 2 }}>
                    <Typography noWrap sx={{ flexGrow: 1, minWidth: 0, fontWeight: 'bold' }}>
                        {analysis.title ?? 'Puzzle analysis'}
                    </Typography>
                    <Button
                        variant='contained'
                        onClick={onClose}
                        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                        Back
                        <Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            &nbsp;to the Forger
                        </Box>
                    </Button>
                </Toolbar>
            </AppBar>
            <Stack sx={{ p: 2, flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
                <GameContext.Provider value={{ isOwner: true }}>
                    <PgnBoard
                        pgn={pgn}
                        showPlayerHeaders={false}
                        startOrientation={analysis.orientation ?? 'white'}
                        underboardTabs={[
                            DefaultUnderboardTab.Explorer,
                            DefaultUnderboardTab.Settings,
                        ]}
                        rightTabs={[DefaultUnderboardTab.PgnText]}
                        initialRightTab={DefaultUnderboardTab.PgnText}
                        tabStorageKeyPrefix='tactics-forger-analysis'
                        allowMoveDeletion
                        disableNullMoves={false}
                    />
                </GameContext.Provider>
            </Stack>
        </Dialog>
    );
}
