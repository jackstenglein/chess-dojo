'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import PgnBoard from '@/board/pgn/PgnBoard';
import SaveGameDialog, { SaveGameDialogType } from '@/components/games/edit/SaveGameDialog';
import { GameMoveButtonExtras } from '@/components/games/view/GameMoveButtonExtras';
import { GameContext } from '@/context/useGame';
import { User } from '@/database/user';
import PgnErrorBoundary from '@/games/view/PgnErrorBoundary';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import useSaveGame from '@/hooks/useSaveGame';
import { useUnsavedGame } from '@/hooks/useUnsavedGame';
import LoadingPage from '@/loading/LoadingPage';
import { Chess, FEN } from '@jackstenglein/chess';
import {
    CreateGameRequest,
    GameOrientation,
    GameOrientations,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useNavigationGuard } from 'next-navigation-guard';
import { useState } from 'react';

const gameUrlRegex = /^\/games\/.*\/.*/;

function parseCreateGameRequest(req: CreateGameRequest | null) {
    if (req?.pgnText) {
        return { pgn: req.pgnText };
    }
    return { fen: FEN.start };
}

export default function AnalysisBoard() {
    const { stagedGame } = useSaveGame();
    const { pgn, fen } = parseCreateGameRequest(stagedGame);
    const { searchParams } = useNextSearchParams();
    const { user, status } = useAuth();
    const navGuard = useNavigationGuard({
        enabled: ({ to }) => {
            return !gameUrlRegex.test(to);
        },
    });
    const [chess, setChess] = useState<Chess>();
    const {
        showDialog: showSaveDialog,
        setShowDialog: setShowSaveDialog,
        onSubmit,
        request,
    } = useUnsavedGame(chess);

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    return (
        <PgnErrorBoundary pgn={pgn}>
            <GameContext.Provider
                value={{
                    isOwner: true,
                    unsaved: true,
                }}
            >
                <PgnBoard
                    pgn={pgn}
                    fen={searchParams.get('fen') || fen}
                    startOrientation={getDefaultOrientation(pgn, user)}
                    underboardTabs={[
                        DefaultUnderboardTab.Tags,
                        DefaultUnderboardTab.Editor,
                        DefaultUnderboardTab.Explorer,
                        DefaultUnderboardTab.Clocks,
                        DefaultUnderboardTab.Share,
                        DefaultUnderboardTab.Settings,
                    ]}
                    allowMoveDeletion={true}
                    allowDeleteBefore={true}
                    showElapsedMoveTimes
                    slots={{
                        moveButtonExtras: GameMoveButtonExtras,
                    }}
                    initialUnderboardTab={DefaultUnderboardTab.Explorer}
                    disableNullMoves={false}
                    onInitialize={(_, c) => setChess(c)}
                />
            </GameContext.Provider>

            <Dialog
                data-testid='unsaved-analysis-nav-guard'
                open={navGuard.active}
                onClose={navGuard.reject}
            >
                <DialogTitle>Save Analysis?</DialogTitle>
                <DialogContent>
                    This analysis is unsaved. Navigating away will permanently delete it.
                </DialogContent>
                <DialogActions>
                    <Button onClick={navGuard.reject}>Cancel</Button>
                    <Button
                        onClick={() => {
                            navGuard.reject();
                            setShowSaveDialog(true);
                        }}
                    >
                        Save
                    </Button>
                    <Button color='error' onClick={navGuard.accept}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {showSaveDialog && (
                <SaveGameDialog
                    type={SaveGameDialogType.Save}
                    open={showSaveDialog}
                    title='Save Analysis'
                    loading={request.isLoading()}
                    onSubmit={onSubmit}
                    onClose={() => setShowSaveDialog(false)}
                    createGameRequest={stagedGame}
                />
            )}
        </PgnErrorBoundary>
    );
}

/**
 * Gets the default orientation for the given PGN and user. If any of
 * the user's usernames match the Black header in the PGN, black is
 * returned. If not, white is used as the default orientation.
 * @param pgn The PGN to get the default orientation for.
 * @param user The user to get the default orientation for.
 * @returns The default orientation of the game.
 */
function getDefaultOrientation(pgn?: string, user?: User): GameOrientation {
    if (!user || !pgn) {
        return GameOrientations.white;
    }

    const blackRegex = new RegExp(`^\\[Black "(.*)"\\]$`, 'mi');
    const results = blackRegex.exec(pgn);

    if (!results || results.length < 2) {
        return GameOrientations.white;
    }

    const black = results[1].toLowerCase();
    if (user.displayName.toLowerCase() === black) {
        return GameOrientations.black;
    }

    for (const rating of Object.values(user.ratings)) {
        if (rating.username?.toLowerCase() === black) {
            return GameOrientations.black;
        }
    }

    return GameOrientations.white;
}
