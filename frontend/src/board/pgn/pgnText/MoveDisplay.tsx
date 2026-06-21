import { useAuth } from '@/auth/Auth';
import useGame from '@/context/useGame';
import { Event, EventType, Move } from '@jackstenglein/chess';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { getInlineCommentsForMove } from '../boardTools/underboard/comments/positionComments';
import {
    ShowInlineCommentsInPgn,
    ShowSuggestedVariations,
} from '../boardTools/underboard/settings/ViewerSettings';
import { useChess } from '../PgnBoard';
import { Ellipsis } from './Ellipsis';
import Interrupt, { hasInterrupt } from './Interrupt';
import MoveButton from './MoveButton';
import MoveNumber from './MoveNumber';

interface MoveProps {
    move: Move;
    handleScroll: (child: HTMLElement | null) => void;
    forceInline?: boolean;
}

const MoveDisplay: React.FC<MoveProps> = ({ move, handleScroll, forceInline }) => {
    const { user } = useAuth();
    const username = user?.username;
    const { chess } = useChess();
    const { game } = useGame();
    const [, setForceRender] = useState(0);
    const [, setHasComment] = useState(move.commentAfter && move.commentAfter !== '');
    const [showSuggestedVariations] = useLocalStorage<boolean>(
        ShowSuggestedVariations.key,
        ShowSuggestedVariations.default,
    );
    const [showInlineCommentsInPgn] = useLocalStorage<boolean>(
        ShowInlineCommentsInPgn.key,
        ShowInlineCommentsInPgn.default,
    );
    const hasMoveInterrupt = useCallback(
        (target: Move | null | undefined) => {
            if (!target) {
                return false;
            }
            const inlineComments = showInlineCommentsInPgn
                ? getInlineCommentsForMove(game, chess, target)
                : [];
            return hasInterrupt(
                target,
                showSuggestedVariations,
                username,
                inlineComments.length > 0,
            );
        },
        [chess, game, showInlineCommentsInPgn, showSuggestedVariations, username],
    );
    const [needReminder, setNeedReminder] = useState(
        move.previous === null || hasMoveInterrupt(move.previous),
    );

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [
                    EventType.NewVariation,
                    EventType.UpdateComment,
                    EventType.DeleteMove,
                    EventType.DeleteBeforeMove,
                    EventType.PromoteVariation,
                ],
                handler: (event: Event) => {
                    if (event.type === EventType.DeleteBeforeMove && event.move === move) {
                        setNeedReminder(true);
                    }
                    if (
                        event.type === EventType.NewVariation &&
                        move === chess.getVariantParent(event.move)
                    ) {
                        setForceRender((v) => v + 1);
                    }
                    if (event.type === EventType.UpdateComment && move === event.move) {
                        setHasComment(move.commentAfter && move.commentAfter.trim().length > 0);
                    }
                    if (event.type === EventType.DeleteMove && move === event.mainlineMove) {
                        setForceRender((v) => v + 1);
                    }
                    if (
                        event.type === EventType.PromoteVariation &&
                        chess.isDescendant(move, event.move)
                    ) {
                        setForceRender((v) => v + 1);
                    }

                    if (event.type === EventType.UpdateComment && move === event.move?.next) {
                        setNeedReminder(hasMoveInterrupt(event.move));
                    }
                    if (
                        event.type === EventType.NewVariation &&
                        move.ply % 2 === 0 &&
                        move === chess.getVariantParent(event.move)?.next
                    ) {
                        setNeedReminder(true);
                    }
                    if (event.type === EventType.DeleteMove && move === event.mainlineMove?.next) {
                        setNeedReminder(hasMoveInterrupt(event.mainlineMove));
                    }
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, move, setForceRender, setNeedReminder, hasMoveInterrupt]);

    useEffect(() => {
        setNeedReminder(move.previous === null || hasMoveInterrupt(move.previous));
    }, [setNeedReminder, move, hasMoveInterrupt]);

    return (
        <>
            {!forceInline && (move.ply % 2 === 1 || needReminder) && (
                <>
                    <MoveNumber key={`move-number-${move.ply}`} ply={move.ply} />

                    {move.ply % 2 === 0 && (
                        <Ellipsis
                            key={`ellipsis-${move.ply}`}
                            ply={move.ply}
                            firstMove={!move.previous}
                        />
                    )}
                </>
            )}

            <MoveButton
                key={`move-button-${move.ply}`}
                move={move}
                handleScroll={handleScroll}
                firstMove={move.previous === null}
                inline={forceInline}
            />

            <Interrupt
                key={`interrupt-${move.ply}`}
                move={move}
                handleScroll={handleScroll}
                forceInline={forceInline}
            />
        </>
    );
};

export default MoveDisplay;
