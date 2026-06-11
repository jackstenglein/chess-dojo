import {
    isSuggestedVariation,
    isUnsavedVariation,
    isVariationSuggestor,
} from '@/board/pgn/boardTools/underboard/comments/suggestVariation';
import { MoveButtonSlotProps } from '@/board/pgn/pgnText/MoveButton';
import Avatar from '@/profile/Avatar';
import { StockfishIcon } from '@/style/ChessIcons';
import { Move } from '@jackstenglein/chess';
import { Cloud, Warning } from '@mui/icons-material';
import { Tooltip } from '@mui/material';

export const GameMoveButtonExtras = ({
    move,
    slotProps,
}: {
    move: Move;
    slotProps?: MoveButtonSlotProps;
}) => {
    if (isSuggestedVariation(move)) {
        const comment = move?.commentDiag?.dojoComment || '';
        const firstComma = comment.indexOf(',');
        const lastComma = comment.lastIndexOf(',');
        const username = comment.slice(0, firstComma);
        const unsaved = isUnsavedVariation(move);

        if (
            isVariationSuggestor(username, move.previous) &&
            isUnsavedVariation(move.previous) === unsaved
        ) {
            return null;
        }

        if (unsaved) {
            return (
                <Tooltip title='This variation is not saved. Right click to save as a comment.'>
                    <Warning fontSize='small' sx={{ ml: 0.5 }} color='error' />
                </Tooltip>
            );
        }

        if (!slotProps?.hideSuggestedVariationOwner) {
            const displayName = comment.slice(firstComma + 1, lastComma);
            return (
                <Tooltip title={`Variation suggested by ${displayName}`}>
                    <span>
                        <Avatar
                            username={username}
                            displayName={displayName}
                            size={24}
                            sx={{ ml: 0.5 }}
                        />
                    </span>
                </Tooltip>
            );
        }
    }

    const engine = move.commentDiag?.dojoEngine;
    const prevEngine = move.previous?.commentDiag?.dojoEngine;

    if (engine && engine !== prevEngine) {
        if (engine === 'CloudDB') {
            return (
                <Tooltip title='This line was found with the Cloud Database.'>
                    <Cloud fontSize='small' sx={{ ml: 0.5 }} color='inherit' />
                </Tooltip>
            );
        }

        return (
            <Tooltip title='This line was found with the engine.'>
                <StockfishIcon fontSize='small' sx={{ ml: 0.5 }} color='error' />
            </Tooltip>
        );
    }

    return null;
};
