import { Move } from '@jackstenglein/chess';
import { Help } from '@mui/icons-material';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    ListItemText,
    Tooltip,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useReconcile } from '../Board';
import { compareNags, getStandardNag, nags } from './Nag';
import { BlockBoardKeyboardShortcuts, useChess } from './PgnBoard';
import { getTextColor } from './pgnText/MoveButton';

const DIALOG_WIDTH = 231;

interface VariationDialogProps {
    move: Move;
    setMove: (move: Move | null) => void;
}

const VariationDialog: React.FC<VariationDialogProps> = ({ move, setMove }) => {
    const [selected, setSelected] = useState(0);
    const { chess } = useChess();
    const reconcile = useReconcile();

    const selectMove = useCallback(
        (move: Move) => {
            chess?.seek(move);
            reconcile();
            setMove(null);
        },
        [chess, setMove, reconcile],
    );

    useEffect(() => {
        if (document.activeElement) {
            (document.activeElement as HTMLElement).blur();
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowUp') {
                setSelected((s) => {
                    if (s > 0) {
                        return s - 1;
                    }
                    return move.variations.length || 0;
                });
            } else if (event.key === 'ArrowDown') {
                setSelected((s) => {
                    if (s < (move.variations.length || 0)) {
                        return s + 1;
                    }
                    return 0;
                });
            } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
                selectMove(selected === 0 ? move : move.variations[selected - 1][0]);
            } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
                setMove(null);
            } else if (event.key >= '0' && event.key <= '9') {
                const index = parseInt(event.key);
                if (index === 0 && move.variations.length > 8) {
                    // 0 is out of order to match its position on the keyboard
                    selectMove(move.variations[8][0]);
                } else if (index === 1) {
                    selectMove(move);
                } else if (index - 2 >= 0 && index - 2 < move.variations.length) {
                    selectMove(move.variations[index - 2][0]);
                }
            } else {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [move, selected, setMove, selectMove]);

    if (!move.variations || move.variations.length === 0) {
        return null;
    }

    const position = getPosition();

    return (
        <Dialog
            open
            onClose={() => setMove(null)}
            classes={{
                container: BlockBoardKeyboardShortcuts,
            }}
            PaperProps={{
                sx: {
                    width: `${DIALOG_WIDTH}px`,
                    position: {
                        sm: 'absolute',
                    },
                    left: position?.x,
                    top: position?.y,
                    margin: { sm: 0 },
                    pointerEvents: 'auto',
                },
            }}
            style={{ pointerEvents: 'none' }}
            hideBackdrop
        >
            <DialogTitle>
                Choose Variation
                <Tooltip title='Use arrow keys/enter, numbers or click to select a move. Use left arrow or escape to cancel.'>
                    <Help
                        fontSize='small'
                        sx={{ color: 'text.secondary', ml: 1, verticalAlign: 'middle' }}
                    />
                </Tooltip>
            </DialogTitle>
            <DialogContent>
                <List>
                    {[[move, move.next, move.next?.next]]
                        .concat(move.variations)
                        .map((variation, i) => {
                            if (!variation?.[0]) {
                                return null;
                            }

                            return (
                                <ListItemButton
                                    key={i}
                                    selected={selected === i}
                                    onClick={() => variation[0] && selectMove(variation[0])}
                                >
                                    <ListItemText
                                        slotProps={{
                                            primary: {
                                                textOverflow: 'ellipsis',
                                                overflow: 'hidden',
                                                whiteSpace: 'nowrap',
                                            },
                                        }}
                                    >
                                        {variation.slice(0, 3).map((m, i) => {
                                            if (!m) {
                                                return null;
                                            }
                                            return (
                                                <span key={i} style={{ color: getTextColor(m) }}>
                                                    {i === 0 || m.ply % 2 === 1
                                                        ? `${Math.ceil(m.ply / 2)}${m.ply % 2 ? '. ' : '... '}`
                                                        : ''}
                                                    {m.san}
                                                    {m.nags
                                                        ?.sort(compareNags)
                                                        .map(
                                                            (n) =>
                                                                nags[getStandardNag(n)]?.label ||
                                                                '',
                                                        )
                                                        .join('') ?? ''}{' '}
                                                </span>
                                            );
                                        })}
                                    </ListItemText>
                                    {i < 10 && (
                                        <Typography variant='body2' sx={{ ml: 0.5 }}>
                                            {(i + 1) % 10}
                                        </Typography>
                                    )}
                                </ListItemButton>
                            );
                        })}
                </List>
            </DialogContent>
        </Dialog>
    );
};

export default VariationDialog;

/**
 * Gets the X, Y position of the variation dialog on md and larger screen sizes.
 * Depending on how the space is allocated to different sections of the game page,
 * the variation dialog is preferred to be placed:
 *   1. Immediately to the right of the board, with some slight padding.
 *   2. Immediately to the left of the board, with some slight padding.
 *   3. Centered in the screen.
 * @returns The X, Y position of the variation dialog.
 */
function getPosition(): { x: number; y: number } | undefined {
    const board = document.querySelector('cg-container');
    if (!board) {
        return undefined;
    }

    const boardRect = board.getBoundingClientRect();

    let position = boardRect.x + boardRect.width + 10;
    if (window.innerWidth - position - DIALOG_WIDTH >= 4) {
        return { x: position, y: boardRect.y };
    }

    position = boardRect.x - 8 - DIALOG_WIDTH;
    if (position >= 4) {
        return { x: position, y: boardRect.y };
    }

    return undefined;
}
