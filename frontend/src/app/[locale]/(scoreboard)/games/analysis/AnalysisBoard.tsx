'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import { BoardApi, PrimitiveMove, reconcile } from '@/board/Board';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import {
    RepertoireSpyPlayProvider,
    RepertoireSpyStartOpts,
} from '@/board/pgn/explorer/player/RepertoireSpyPlayContext';
import PgnBoard from '@/board/pgn/PgnBoard';
import { getInitialSidePanelTab, useSidePanelTabs } from '@/board/pgn/sidePanelTabs';
import SaveGameDialog, { SaveGameDialogType } from '@/components/games/edit/SaveGameDialog';
import { GameMoveButtonExtras } from '@/components/games/view/GameMoveButtonExtras';
import { useMaiaGame } from '@/components/playbot/useMaiaGame';
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
import { useTranslations } from 'next-intl';
import { useNavigationGuard } from 'next-navigation-guard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const gameUrlRegex = /^\/games\/.*\/.*/;

const analysisTabs = [
    DefaultUnderboardTab.PgnText,
    DefaultUnderboardTab.Tags,
    DefaultUnderboardTab.Editor,
    DefaultUnderboardTab.Explorer,
    DefaultUnderboardTab.Clocks,
    DefaultUnderboardTab.Share,
    DefaultUnderboardTab.Settings,
];

function parseCreateGameRequest(req: CreateGameRequest | null) {
    if (req?.pgnText) {
        return { pgn: req.pgnText };
    }
    return { fen: FEN.start };
}

export default function AnalysisBoard() {
    const t = useTranslations('games.analysis');
    const { stagedGame } = useSaveGame();
    const { pgn, fen } = parseCreateGameRequest(stagedGame);
    const { searchParams } = useNextSearchParams();
    const { user, status } = useAuth();
    const navGuard = useNavigationGuard({
        enabled: ({ to }) =>
            !gameUrlRegex.test(to) && Math.ceil((latestChessRef.current?.plyCount() ?? 0) / 2) > 5,
    });
    const [chess, setChess] = useState<Chess>();
    const maiaGame = useMaiaGame();
    const [playInitKey, setPlayInitKey] = useState(0);
    const [playFen, setPlayFen] = useState<string | null>(null);
    const [playOrientation, setPlayOrientation] = useState<GameOrientation>(GameOrientations.white);
    const [isRepertoireSpyPlaying, setIsRepertoireSpyPlaying] = useState(false);
    const latestChessRef = useRef<Chess | undefined>(undefined);
    const {
        showDialog: showSaveDialog,
        setShowDialog: setShowSaveDialog,
        onSubmit,
        request,
    } = useUnsavedGame(chess);
    const { leftTabs, rightTabs } = useSidePanelTabs(analysisTabs);

    const onInitialize = useCallback(
        (board: BoardApi, c: Chess) => {
            setChess(c);
            latestChessRef.current = c;
            maiaGame.onBoardInit(board, c);
        },
        [maiaGame],
    );

    const startRepertoireSpyGame = useCallback(
        (opts: RepertoireSpyStartOpts) => {
            setPlayFen(opts.startFen || FEN.start);
            setPlayOrientation(opts.playerColor);
            setIsRepertoireSpyPlaying(true);
            maiaGame.startGame({
                playerColor: opts.playerColor,
                maiaRating: opts.maiaRating,
                startFen: opts.startFen || FEN.start,
                timeControl: opts.timeControl,
                botMoveProvider: opts.botMoveProvider,
            });
            setPlayInitKey((value) => value + 1);
        },
        [maiaGame],
    );

    const stopRepertoireSpyGame = useCallback(() => {
        setIsRepertoireSpyPlaying(false);
        maiaGame.resign();
    }, [maiaGame]);

    useEffect(() => {
        if (maiaGame.result !== null) {
            setIsRepertoireSpyPlaying(false);
        }
    }, [maiaGame.result]);

    const repertoireSpyPlayContext = useMemo(
        () => ({
            isAvailable: true,
            isPlaying: isRepertoireSpyPlaying,
            startRepertoireSpyGame,
            stopRepertoireSpyGame,
        }),
        [isRepertoireSpyPlaying, startRepertoireSpyGame, stopRepertoireSpyGame],
    );

    const onPlayModeMove = useCallback(
        (board: BoardApi, c: Chess, primitive: PrimitiveMove) => {
            if (!isRepertoireSpyPlaying) {
                return;
            }
            if (maiaGame.result !== null) {
                return;
            }
            if (!maiaGame.playerToMove) {
                return;
            }
            if (c.currentMove() !== c.lastMove()) {
                return;
            }

            const uci = primitive.orig + primitive.dest + (primitive.promotion ?? '');
            const moved = c.move(uci);
            if (!moved) {
                return;
            }
            reconcile(c, board);
            maiaGame.onPlayerMoved(uci);
        },
        [isRepertoireSpyPlaying, maiaGame],
    );

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
                <RepertoireSpyPlayProvider value={repertoireSpyPlayContext}>
                    <PgnBoard
                        pgn={pgn}
                        fen={playFen || searchParams.get('fen') || fen}
                        startOrientation={
                            playFen ? playOrientation : getDefaultOrientation(pgn, user)
                        }
                        underboardTabs={leftTabs}
                        rightTabs={rightTabs}
                        sidePanelTabs={analysisTabs}
                        initialUnderboardTab={getInitialSidePanelTab(
                            leftTabs,
                            DefaultUnderboardTab.Explorer,
                        )}
                        initialRightTab={getInitialSidePanelTab(
                            rightTabs,
                            DefaultUnderboardTab.PgnText,
                        )}
                        tabStorageKeyPrefix='analysis'
                        allowMoveDeletion={!isRepertoireSpyPlaying}
                        allowDeleteBefore={!isRepertoireSpyPlaying}
                        showElapsedMoveTimes
                        slots={{
                            moveButtonExtras: GameMoveButtonExtras,
                        }}
                        slotProps={{
                            board: {
                                onMove: isRepertoireSpyPlaying ? onPlayModeMove : undefined,
                            },
                        }}
                        disableNullMoves={false}
                        initKey={playFen ? `repertoire-spy-${playInitKey}` : undefined}
                        onInitialize={onInitialize}
                    />
                </RepertoireSpyPlayProvider>
            </GameContext.Provider>

            <Dialog
                data-testid='unsaved-analysis-nav-guard'
                open={navGuard.active && !showSaveDialog}
                onClose={navGuard.reject}
            >
                <DialogTitle>{t('saveTitle')}</DialogTitle>
                <DialogContent>{t('unsavedWarning')}</DialogContent>
                <DialogActions>
                    <Button onClick={navGuard.reject}>{t('cancel')}</Button>
                    <Button onClick={() => setShowSaveDialog(true)}>{t('save')}</Button>
                    <Button color='error' onClick={navGuard.accept}>
                        {t('delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {showSaveDialog && (
                <SaveGameDialog
                    type={SaveGameDialogType.Save}
                    open={showSaveDialog}
                    title={t('saveAnalysis')}
                    loading={request.isLoading()}
                    onSubmit={(form) => onSubmit(form, navGuard.accept)}
                    onClose={() => {
                        navGuard.reject();
                        setShowSaveDialog(false);
                    }}
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
