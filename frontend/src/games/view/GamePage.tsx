'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { isMissingData } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { BoardApi } from '@/board/Board';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import PgnBoard from '@/board/pgn/PgnBoard';
import { GameMoveButtonExtras } from '@/components/games/view/GameMoveButtonExtras';
import { GameContext } from '@/context/useGame';
import { Game } from '@/database/game';
import { mergeSuggestedVariations } from '@/games/mergeSuggestedVariations';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import { Chess, EventType as ChessEventType } from '@jackstenglein/chess';
import {
    GameHeader,
    GameImportTypes,
    GameOrientation,
    UpdateGameRequest,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { Box } from '@mui/material';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MissingGameDataPreflight } from '../edit/MissingGameDataPreflight';
import PgnErrorBoundary from './PgnErrorBoundary';

/** Module-level cache so it survives React Strict Mode remounts in dev. */
const gameCache = new Map<string, Game>();

const GamePage = ({ cohort: initialCohort, id: initialId }: { cohort: string; id: string }) => {
    const api = useApi();
    const request = useRequest<Game>();
    const featureRequest = useRequest();
    const updateRequest = useRequest<Game>();
    const { user, status } = useAuth();
    const { searchParams, updateSearchParams } = useNextSearchParams({
        firstLoad: 'false',
    });
    const firstLoad = searchParams.get('firstLoad') === 'true';

    // Track the current game separately so we can swap without navigation
    const [currentCohort, setCurrentCohort] = useState(initialCohort);
    const [currentId, setCurrentId] = useState(initialId);
    const [currentGame, setCurrentGame] = useState<Game | undefined>();

    const cohort = currentCohort;
    const id = currentId;

    const reset = request.reset;
    useEffect(() => {
        if (cohort && id) {
            const cached = gameCache.get(`${cohort}/${id}`);
            if (cached) {
                setCurrentGame(cached);
                return;
            }
            reset();
        }
    }, [cohort, id, reset]);

    useEffect(() => {
        if (!request.isSent() && cohort && id && !gameCache.has(`${cohort}/${id}`)) {
            request.onStart();
            api.getGame(cohort, id)
                .then((response) => {
                    const game = response.data;
                    mergeSuggestedVariations(game);
                    gameCache.set(`${cohort}/${id}`, game);
                    setCurrentGame(game);
                    request.onSuccess(game);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, cohort, id]);

    const onNavigateToGame = useCallback((newCohort: string, newId: string) => {
        setCurrentCohort(newCohort);
        setCurrentId(newId);
        // Update URL without triggering Next.js navigation
        const newUrl = `/games/${newCohort.replaceAll('+', '%2B')}/${newId.replaceAll('?', '%3F')}${window.location.search}`;
        window.history.replaceState(null, '', newUrl);
    }, []);

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (
        !currentGame &&
        request.isFailure() &&
        isAxiosError(request.error) &&
        request.error.response?.status === 404
    ) {
        notFound();
    }

    const onSave = (headers: GameHeader, orientation: GameOrientation) => {
        const game = currentGame ?? request.data;

        if (game === undefined) {
            logger.error?.('Game is unexpectedly undefined');
            return;
        }

        updateRequest.onStart();

        const chess = new Chess();
        chess.loadPgn(game.pgn);
        const headerMap = {
            White: headers.white,
            Black: headers.black,
            Date: headers.date,
            Result: headers.result,
        };

        for (const [name, value] of Object.entries(headerMap)) {
            if (value) {
                chess.setHeader(name, value);
            }
        }

        const update: UpdateGameRequest = {
            cohort: game.cohort,
            id: game.id,
            headers,
            unlisted: true,
            orientation,
            type: GameImportTypes.editor,
            pgnText: chess.renderPgn(),
        };

        api.updateGame(game.cohort, game.id, update)
            .then((resp) => {
                trackEvent(EventType.UpdateGame, {
                    method: 'preflight',
                    dojo_cohort: game.cohort,
                });

                const updatedGame = resp.data;
                request.onSuccess(updatedGame);
                updateRequest.onSuccess(updatedGame);
                updateSearchParams({ firstLoad: 'false' });
            })
            .catch((err) => {
                updateRequest.onFailure(err);
            });
    };

    const onUpdateGame = (g: Game) => {
        const current = currentGame ?? request.data;
        const updated = { ...g, pgn: current?.pgn ?? g.pgn };
        setCurrentGame(updated);
        gameCache.set(`${updated.cohort}/${updated.id}`, updated);
        request.onSuccess(updated);
    };

    const onInitialize = (_: BoardApi, chess: Chess) => {
        if (!isOwner && user) {
            chess.addObserver({
                types: [ChessEventType.NewVariation],
                handler(event) {
                    chess.setCommand(
                        'dojoComment',
                        `${user.username},${user.displayName},unsaved`,
                        event.move,
                    );
                },
            });
        }
    };

    // Use currentGame to keep the board visible while switching games
    const game = currentGame ?? request.data;
    const isOwner = game?.owner === user?.username;
    const showPreflight = isOwner && firstLoad && game !== undefined && isMissingData(game);

    return (
        <Box
            sx={{
                pt: 4,
                pb: 4,
                px: 0,
            }}
        >
            <RequestSnackbar request={request} />
            <RequestSnackbar request={featureRequest} showSuccess />
            <RequestSnackbar request={updateRequest} />

            <PgnErrorBoundary pgn={game?.pgn} game={game}>
                <GameContext.Provider
                    value={{
                        game,
                        onUpdateGame,
                        isOwner,
                        onNavigateToGame,
                    }}
                >
                    <PgnBoard
                        pgn={game?.pgn}
                        startOrientation={game?.orientation}
                        underboardTabs={[
                            ...(user ? [DefaultUnderboardTab.Directories] : []),
                            DefaultUnderboardTab.Tags,
                            ...(isOwner ? [DefaultUnderboardTab.Editor] : []),
                            DefaultUnderboardTab.Comments,
                            DefaultUnderboardTab.Explorer,
                            DefaultUnderboardTab.Clocks,
                            DefaultUnderboardTab.Tools,
                            DefaultUnderboardTab.Share,
                            DefaultUnderboardTab.Settings,
                        ]}
                        allowMoveDeletion={game?.owner === user?.username}
                        allowDeleteBefore={game?.owner === user?.username}
                        showElapsedMoveTimes
                        slots={{
                            moveButtonExtras: GameMoveButtonExtras,
                        }}
                        onInitialize={onInitialize}
                    />
                </GameContext.Provider>
            </PgnErrorBoundary>
            {game && (
                <MissingGameDataPreflight
                    skippable
                    open={showPreflight}
                    initHeaders={game.headers}
                    initOrientation={game.orientation}
                    loading={updateRequest.isLoading()}
                    onSubmit={onSave}
                    onClose={() => updateSearchParams({ firstLoad: 'false' })}
                >
                    You can fill this data out now or later in settings.
                </MissingGameDataPreflight>
            )}
        </Box>
    );
};

export default GamePage;
