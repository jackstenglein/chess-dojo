import { useAuth } from '@/auth/Auth';
import useGame from '@/context/useGame';
import { Move } from '@jackstenglein/chess';
import { useCallback } from 'react';
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
    const needReminder = move.previous === null || hasMoveInterrupt(move.previous);

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
