'use client';

import Board from '@/board/Board';
import { Chess } from '@jackstenglein/chess';
import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { splitPuzzlePgn, validatePuzzleEdit } from './editPuzzle';
import { EditSolutionDialog } from './EditSolutionDialog';

interface EditPuzzleDialogProps {
    puzzle: PuzzlebasePuzzle;
    onClose: () => void;
    onSave: (fen: string, solutionPgn: string) => void;
}

/** Returns true if the given FEN describes a legal position. */
function isValidFen(fen: string): boolean {
    try {
        new Chess({ fen: fen.trim() });
        return true;
    } catch {
        return false;
    }
}

const monoSx = { fontFamily: 'monospace', fontSize: '0.85rem' } as const;

/**
 * Edits a puzzle's starting position (FEN) and its solution (PGN moves). Saving is only possible
 * when the FEN is legal and every move in the solution is legal from it.
 */
export function EditPuzzleDialog({ puzzle, onClose, onSave }: EditPuzzleDialogProps) {
    const [fen, setFen] = useState(puzzle.fen);
    const [movetext, setMovetext] = useState(() => splitPuzzlePgn(puzzle.solutionPgn).movetext);
    const [annotating, setAnnotating] = useState(false);

    const result = useMemo(
        () => validatePuzzleEdit(fen, movetext, puzzle.solutionPgn),
        [fen, movetext, puzzle.solutionPgn],
    );
    const fenValid = isValidFen(fen);
    const blackToMove = fen.trim().split(' ')[1] === 'b';

    const fenError = !fen.trim() || !fenValid;
    const movesError = fenValid && !result.ok;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='md'>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Edit puzzle #{puzzle.id}</DialogTitle>
            <DialogContent>
                <Stack sx={{ flexDirection: { xs: 'column', md: 'row' }, gap: 3, pt: 1 }}>
                    <Stack sx={{ flex: 1, gap: 2 }}>
                        <TextField
                            label='FEN'
                            value={fen}
                            onChange={(e) => setFen(e.target.value)}
                            error={fenError}
                            helperText={
                                fenError
                                    ? 'Not a legal position.'
                                    : 'The starting position. The side to move is the solver.'
                            }
                            slotProps={{ htmlInput: { sx: monoSx, spellCheck: false } }}
                            fullWidth
                        />
                        <Button
                            variant='outlined'
                            disabled={!fenValid}
                            onClick={() => setAnnotating(true)}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            Edit on a board
                        </Button>
                        <TextField
                            label='Solution (PGN moves)'
                            value={movetext}
                            onChange={(e) => setMovetext(e.target.value)}
                            error={movesError}
                            helperText={
                                movesError && !result.ok
                                    ? result.error
                                    : 'The first main-line move is the answer. Variations go in parentheses.'
                            }
                            multiline
                            minRows={5}
                            maxRows={12}
                            slotProps={{ htmlInput: { sx: monoSx, spellCheck: false } }}
                            fullWidth
                        />
                    </Stack>

                    <Stack sx={{ width: { xs: '100%', md: 240 }, gap: 1, alignItems: 'center' }}>
                        <Typography
                            variant='overline'
                            sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                        >
                            Position
                        </Typography>
                        <Box sx={{ width: '100%', maxWidth: 240, aspectRatio: '1 / 1' }}>
                            {fenValid ? (
                                <Board
                                    key={fen.trim()}
                                    config={{
                                        fen: fen.trim(),
                                        viewOnly: true,
                                        orientation: blackToMove ? 'black' : 'white',
                                    }}
                                />
                            ) : (
                                <Stack
                                    sx={{
                                        height: '100%',
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography variant='body2' color='text.secondary'>
                                        No valid position
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                </Stack>
            </DialogContent>
            {annotating && (
                <EditSolutionDialog
                    puzzleId={puzzle.id}
                    fen={fen.trim()}
                    movetext={movetext}
                    headers={splitPuzzlePgn(puzzle.solutionPgn).headers}
                    onClose={() => setAnnotating(false)}
                    onApply={setMovetext}
                />
            )}
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button color='inherit' onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant='contained'
                    disabled={!result.ok}
                    onClick={() => {
                        if (result.ok) {
                            onSave(result.fen, result.solutionPgn);
                            onClose();
                        }
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
