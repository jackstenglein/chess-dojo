'use client';

import { useChess } from '@/board/pgn/PgnBoard';
import { CommentType, Move } from '@jackstenglein/chess';
import { VariationMarker } from '@jackstenglein/chess-dojo-common/src/puzzlebase/lines';
import { Check, Flag } from '@mui/icons-material';
import { Divider, ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { isVariationHead, markerOf, mover, withMarker } from './solutionMarkers';

const LABELS: Record<VariationMarker, { title: string; hint: string }> = {
    ALT: { title: 'Alternate solution', hint: 'ALT: another move that wins' },
    ALT2: { title: 'Good, not the best', hint: 'ALT2: solver tries again at no cost' },
    SKIP: { title: 'Skip this defense', hint: 'SKIP: not tested in the puzzle' },
};

/**
 * Menu items for the puzzle editor's move menu. They write the marker the trainer reads (ALT,
 * ALT2 or SKIP) at the start of the comment of the first move of a variation, so no one has to
 * type it. Which markers make sense depends on whose move the variation replaces.
 */
export function SolutionMarkerMenuItems({ move, onClose }: { move: Move; onClose: () => void }) {
    const { chess } = useChess();
    if (!chess) {
        return null;
    }

    const head = isVariationHead(chess, move);
    const current = markerOf(move);
    const options: VariationMarker[] = mover(move) === 'solver' ? ['ALT', 'ALT2'] : ['SKIP'];

    const setMarker = (marker?: VariationMarker) => {
        chess.setComment(withMarker(move.commentAfter, marker), CommentType.After, move);
        if (move.commentMove) {
            chess.setComment(withMarker(move.commentMove, undefined), CommentType.Before, move);
        }
        onClose();
    };

    return (
        <>
            <Divider />
            {!head ? (
                <MenuItem disabled>
                    <ListItemText
                        secondary='Right-click the first move of a variation to mark it'
                        slotProps={{ secondary: { sx: { whiteSpace: 'normal', maxWidth: 240 } } }}
                    />
                </MenuItem>
            ) : (
                [
                    ...options.map((marker) => (
                        <MenuItem key={marker} onClick={() => setMarker(marker)}>
                            <ListItemIcon>{current === marker ? <Check /> : <Flag />}</ListItemIcon>
                            <ListItemText
                                primary={LABELS[marker].title}
                                secondary={LABELS[marker].hint}
                            />
                        </MenuItem>
                    )),
                    <MenuItem key='clear' disabled={!current} onClick={() => setMarker(undefined)}>
                        <ListItemIcon />
                        <ListItemText>Clear marker</ListItemText>
                    </MenuItem>,
                ]
            )}
        </>
    );
}
