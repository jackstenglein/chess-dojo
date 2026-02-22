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
import { Game, PositionComment } from '@/database/game';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import { Chess, EventType as ChessEventType, Move } from '@jackstenglein/chess';
import {
    GameHeader,
    GameImportTypes,
    GameOrientation,
    UpdateGameRequest,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { Box } from '@mui/material';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { useEffect } from 'react';
import { MissingGameDataPreflight } from '../edit/MissingGameDataPreflight';
import PgnErrorBoundary from './PgnErrorBoundary';

const GamePage = ({ cohort, id }: { cohort: string; id: string }) => {
    const api = useApi();
    const request = useRequest<Game>();
    const featureRequest = useRequest();
    const updateRequest = useRequest<Game>();
    const { user, status } = useAuth();
    const { searchParams, updateSearchParams } = useNextSearchParams({
        firstLoad: 'false',
    });
    const firstLoad = searchParams.get('firstLoad') === 'true';

    const reset = request.reset;
    useEffect(() => {
        if (cohort && id) {
            reset();
        }
    }, [cohort, id, reset]);

    useEffect(() => {
        if (!request.isSent() && cohort && id) {
            request.onStart();
            api.getGame(cohort, id)
                .then((response) => {
                    const game = response.data;
                    mergeSuggestedVariations(game);
                    request.onSuccess(game);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, cohort, id]);

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (
        request.isFailure() &&
        isAxiosError(request.error) &&
        request.error.response?.status === 404
    ) {
        notFound();
    }

    const onSave = (headers: GameHeader, orientation: GameOrientation) => {
        const game = request.data;

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
        request.onSuccess({ ...g, pgn: request.data?.pgn ?? g.pgn });
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

    const isOwner = request.data?.owner === user?.username;
    const showPreflight =
        isOwner && firstLoad && request.data !== undefined && isMissingData(request.data);

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

            <PgnErrorBoundary pgn={request.data?.pgn} game={request.data}>
                <GameContext.Provider
                    value={{
                        game: request.data,
                        onUpdateGame,
                        isOwner,
                    }}
                >
                    <PgnBoard
                        pgn={request.data?.pgn}
                        startOrientation={request.data?.orientation}
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
                        allowMoveDeletion={request.data?.owner === user?.username}
                        allowDeleteBefore={request.data?.owner === user?.username}
                        showElapsedMoveTimes
                        slots={{
                            moveButtonExtras: GameMoveButtonExtras,
                        }}
                        onInitialize={onInitialize}
                    />
                </GameContext.Provider>
            </PgnErrorBoundary>
            {request.data && (
                <MissingGameDataPreflight
                    skippable
                    open={showPreflight}
                    initHeaders={request.data.headers}
                    initOrientation={request.data.orientation}
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

function mergeSuggestedVariations(game: Game) {
    const suggestions: Record<string, PositionComment[]> = {};
    for (const [fen, positionComments] of Object.entries(game.positionComments || {})) {
        for (const comment of Object.values(positionComments)) {
            if (comment.suggestedVariation) {
                suggestions[fen] = (suggestions[fen] ?? []).concat(comment);
            }
        }
    }

    if (Object.keys(suggestions).length === 0) {
        return;
    }

    const chess = new Chess({ pgn: game.pgn });
    const stack: Move[] = [];
    let move = null;

    do {
        const comments = suggestions[chess.normalizedFen(move)];
        if (comments) {
            mergeFromMove(chess, move, comments);
        }

        const nextMove = chess.nextMove(move);
        if (nextMove) {
            stack.push(nextMove);
        }
        for (const variation of move?.variations ?? []) {
            stack.push(variation[0]);
        }

        move = stack.pop() ?? null;
    } while (move);

    game.pgn = chess.renderPgn();
}

function mergeFromMove(chess: Chess, move: Move | null, comments: PositionComment[]) {
    comments.sort((lhs, rhs) => lhs.createdAt.localeCompare(rhs.createdAt));

    for (const comment of comments) {
        const commentChess = new Chess({ pgn: comment.suggestedVariation });
        recursiveMergeLine(commentChess.history(), chess, move, comment);
    }
}

/**
 * Recursively merges the given line into the target Chess instance.
 * @param line The line to merge into the Chess instance.
 * @param target The target Chess to merge the line into.
 * @param currentTargetMove The current move to start from in the target Chess.
 * @param comment The comment that generated the merge.
 */
function recursiveMergeLine(
    line: Move[],
    target: Chess,
    currentTargetMove: Move | null,
    comment: PositionComment,
) {
    for (const move of line) {
        const newTargetMove = target.move(move.san, {
            previousMove: currentTargetMove,
            skipSeek: true,
        });
        if (!newTargetMove) {
            return;
        }

        target.setCommand(
            'dojoComment',
            `${comment.owner.username},${comment.owner.displayName},${comment.id}`,
            newTargetMove,
        );
        for (const variation of move.variations) {
            recursiveMergeLine(variation, target, currentTargetMove, comment);
        }

        currentTargetMove = newTargetMove;
    }
}
