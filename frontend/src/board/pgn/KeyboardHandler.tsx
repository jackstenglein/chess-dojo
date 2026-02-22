import { EventType, Move } from '@jackstenglein/chess';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useReconcile } from '../Board';
import { BlockBoardKeyboardShortcuts, useChess } from './PgnBoard';
import VariationDialog from './VariationDialog';
import { UnderboardApi } from './boardTools/underboard/Underboard';
import {
    keyboardShortcutHandlers,
    matchAction,
    modifierKeys,
} from './boardTools/underboard/settings/KeyboardShortcuts';
import ViewKeyboardShortcutsDialog from './boardTools/underboard/settings/ShortCutKeyBoardDialog';
import { ShortcutAction, ShortcutBindings } from './boardTools/underboard/settings/ShortcutAction';
import {
    ScrollToMove,
    VariationBehavior,
    VariationBehaviorKey,
} from './boardTools/underboard/settings/ViewerSettings';

const SCROLL_THROTTLE_DELAY = 250; // milliseconds

interface KeyboardHandlerProps {
    underboardRef: React.RefObject<UnderboardApi | null>;
}

const KeyboardHandler: React.FC<KeyboardHandlerProps> = ({ underboardRef }) => {
    const { chess, board, boardRef, keydownMap, toggleOrientation, solitaire, addEngineMoveRef } =
        useChess();
    const reconcile = useReconcile();
    const [variationBehavior] = useLocalStorage(VariationBehaviorKey, VariationBehavior.Dialog);
    const [variationDialogMove, setVariationDialogMove] = useState<Move | null>(null);
    const [viewKeyDialog, setViewKeyDialog] = useState<boolean>(false);
    const [keyBindings] = useLocalStorage(ShortcutBindings.key, ShortcutBindings.default);
    const [scrollToMove] = useLocalStorage(ScrollToMove.key, ScrollToMove.default);

    useEffect(() => {
        if (variationBehavior !== VariationBehavior.Dialog) {
            return;
        }

        const observer = {
            types: [
                EventType.LegalMove,
                EventType.NewVariation,
                EventType.Initialized,
                EventType.DeleteMove,
                EventType.DeleteBeforeMove,
                EventType.PromoteVariation,
            ],
            handler: () => setVariationDialogMove(null),
        };
        chess?.addObserver(observer);
        return () => chess?.removeObserver(observer);
    }, [chess, variationBehavior, setVariationDialogMove]);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!chess || !board) {
                return;
            }

            if (modifierKeys.includes(event.key) && keydownMap) {
                // eslint-disable-next-line react-hooks/immutability
                keydownMap.current[event.key] = true;
            }

            const matchedAction = matchAction(
                keyBindings,
                event.code.replace('Key', ''),
                keydownMap?.current || {},
            );
            if (!matchedAction) {
                return;
            }

            const activeElement = document.activeElement;

            let ancestorBlockingKeyboardInput = false;
            if (event.target instanceof Element) {
                ancestorBlockingKeyboardInput = !!event.target.closest(
                    `.${BlockBoardKeyboardShortcuts}`,
                );
            }

            if (
                activeElement?.tagName === 'INPUT' ||
                activeElement?.id === BlockBoardKeyboardShortcuts ||
                activeElement?.classList.contains(BlockBoardKeyboardShortcuts) ||
                ancestorBlockingKeyboardInput
            ) {
                if (matchedAction !== ShortcutAction.UnfocusTextField) {
                    return;
                }
            }

            if (
                matchedAction === ShortcutAction.NextMove &&
                solitaire?.enabled &&
                !solitaire.complete &&
                chess.currentMove() === solitaire.currentMove
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            keyboardShortcutHandlers[matchedAction]?.({
                chess,
                board,
                reconcile,
                opts: {
                    underboardApi: underboardRef.current,
                    toggleOrientation,
                    setViewKeysDialog: setViewKeyDialog,
                    setVariationDialogMove:
                        variationBehavior === VariationBehavior.Dialog
                            ? setVariationDialogMove
                            : undefined,
                    addEngineMove: addEngineMoveRef?.current || undefined,
                },
            });
        },
        [
            board,
            chess,
            keyBindings,
            keydownMap,
            toggleOrientation,
            variationBehavior,
            setVariationDialogMove,
            setViewKeyDialog,
            underboardRef,
            reconcile,
            addEngineMoveRef,
            solitaire,
        ],
    );

    const onKeyUp = useCallback(
        (event: KeyboardEvent) => {
            if (modifierKeys.includes(event.key) && keydownMap) {
                // eslint-disable-next-line react-hooks/immutability
                keydownMap.current[event.key] = false;
            }
        },
        [keydownMap],
    );

    const onWheel = useCallback(() => {
        if (!chess || !board || !scrollToMove) {
            return;
        }

        let timeoutId: unknown;
        let lastExecTime = 0;

        return function onWheel(event: WheelEvent) {
            event.preventDefault();
            event.stopPropagation();

            const currentTime = Date.now();
            const timeSinceLastExec = currentTime - lastExecTime;

            if (!timeoutId) {
                timeoutId = setTimeout(
                    () => {
                        const action =
                            event.deltaY < 0
                                ? ShortcutAction.PreviousMove
                                : ShortcutAction.NextMove;

                        if (
                            action === ShortcutAction.NextMove &&
                            solitaire?.enabled &&
                            !solitaire.complete &&
                            chess.currentMove() === solitaire.currentMove
                        ) {
                            return;
                        }

                        keyboardShortcutHandlers[action]({
                            chess,
                            board,
                            reconcile,
                        });
                        lastExecTime = Date.now();
                        timeoutId = null;
                    },
                    Math.max(1, SCROLL_THROTTLE_DELAY - timeSinceLastExec),
                );
            }
        };
    }, [board, chess, scrollToMove, reconcile, solitaire]);

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        const boardNode = boardRef?.current;
        const wheelListener = onWheel();
        if (wheelListener) {
            boardNode?.addEventListener('wheel', wheelListener);
        }
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            if (wheelListener) {
                boardNode?.removeEventListener('wheel', wheelListener);
            }
        };
    }, [onKeyDown, onKeyUp, onWheel, boardRef]);

    return (
        <>
            {variationDialogMove && (
                <VariationDialog move={variationDialogMove} setMove={setVariationDialogMove} />
            )}
            <ViewKeyboardShortcutsDialog open={viewKeyDialog} setOpen={setViewKeyDialog} />
        </>
    );
};

export default KeyboardHandler;
