import Board from '@/board/Board';
import { getPieceSx } from '@/board/boardThemes';
import {
    PieceStyle,
    PieceStyleKey,
} from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { BlockBoardKeyboardShortcuts } from '@/board/pgn/PgnBoard';
import { Chess, FEN } from '@jackstenglein/chess';
import { BackHand, Delete, Replay, WifiProtectedSetup } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { Api as BoardApi } from 'chessground/api';
import { Key, Piece } from 'chessground/types';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

const blackPieces = ['k', 'q', 'r', 'b', 'n', 'p'];
const whitePieces = blackPieces.map((p) => p.toUpperCase());

const pieceMap: Record<string, Piece> = {
    K: { color: 'white', role: 'king' },
    Q: { color: 'white', role: 'queen' },
    R: { color: 'white', role: 'rook' },
    B: { color: 'white', role: 'bishop' },
    N: { color: 'white', role: 'knight' },
    P: { color: 'white', role: 'pawn' },
    k: { color: 'black', role: 'king' },
    q: { color: 'black', role: 'queen' },
    r: { color: 'black', role: 'rook' },
    b: { color: 'black', role: 'bishop' },
    n: { color: 'black', role: 'knight' },
    p: { color: 'black', role: 'pawn' },
};

export function BoardEditor({ fen, onUpdate }: { fen: string; onUpdate: (fen: string) => void }) {
    const [currentButton, setCurrentButton] = useState<string>('move');
    const [board, setBoard] = useState<BoardApi>();
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');

    if (!fen) {
        fen = FEN.start;
    }

    const fenTokens = fen.split(' ');
    const toMove = fenTokens[1] || 'w';
    const castling = fenTokens[2] || '-';
    const enPassantTarget = fenTokens[3] || '-';
    const enPassantOptions = getEnPassantOptions(fen);
    const moveNumber = fenTokens[5] || '1';

    const updatePiecePositions = useCallback(() => {
        const tokens = fen.split(' ');
        tokens[0] = board?.getFen() || tokens[0];
        onUpdate(tokens.join(' '));
    }, [fen, board, onUpdate]);

    const onSquareClick = useCallback(
        (square: Key) => {
            if (!board || currentButton === 'move') {
                return;
            }

            const piece = pieceMap[currentButton];
            if (piece) {
                board.setPieces(new Map([[square, piece]]));
            } else if (currentButton === 'delete') {
                board.setPieces(new Map([[square, undefined]]));
            }

            updatePiecePositions();
        },
        [board, currentButton, updatePiecePositions],
    );

    useEffect(() => {
        board?.set({
            events: {
                change: updatePiecePositions,
                select: onSquareClick,
            },
        });
    }, [board, onSquareClick, updatePiecePositions]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (document.activeElement?.id === BlockBoardKeyboardShortcuts) {
                return;
            }

            if (
                event.key === MOVE_KEYBOARD_SHORTCUT ||
                event.key.toLowerCase() === MOVE_KEYBOARD_SHORTCUT
            ) {
                setCurrentButton('move');
            } else if (
                event.key === DELETE_KEYBOARD_SHORTCUT ||
                event.key.toLowerCase() === DELETE_KEYBOARD_SHORTCUT
            ) {
                setCurrentButton('delete');
            } else if (blackPieces.includes(event.key) || whitePieces.includes(event.key)) {
                setCurrentButton(event.key);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [setCurrentButton]);

    const onChangeColor = (color: string) => {
        const tokens = fen.split(' ');
        tokens[1] = color;
        tokens[3] = '-';
        onUpdate(tokens.join(' '));
    };

    const onStartingPosition = () => {
        onUpdate('');
    };

    const onClearBoard = () => {
        onUpdate(FEN.empty);
    };

    const onFlipBoard = () => {
        const newOrientation = orientation === 'white' ? 'black' : 'white';
        setOrientation(newOrientation);
        board?.set({ orientation: newOrientation });
    };

    const onChangeCastling = (field: 'K' | 'k' | 'Q' | 'q', enabled: boolean) => {
        const tokens = fen.split(' ');
        const castling = tokens[2];

        if (enabled && !castling?.includes(field)) {
            if (!castling || castling === '-') {
                tokens[2] = field;
            } else {
                tokens[2] = `${castling}${field}`;
            }
        } else if (!enabled && castling?.includes(field)) {
            tokens[2] = castling.replaceAll(field, '') || '-';
        }

        onUpdate(tokens.join(' '));
    };

    const onChangeEnPassant = (value: string) => {
        const tokens = fen.split(' ');
        tokens[3] = value;
        onUpdate(tokens.join(' '));
    };

    const onChangeMoveNumber = (value: string) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
            return;
        }

        const tokens = fen.split(' ');
        tokens[5] = `${num}`;
        onUpdate(tokens.join(' '));
    };

    return (
        <Stack width={1} direction='row' flexWrap='wrap' gap={2}>
            <Stack spacing={1} width={1} maxWidth='336px'>
                <PieceToggleButtonGroup
                    pieces={orientation === 'white' ? blackPieces : whitePieces}
                    value={currentButton}
                    onChange={setCurrentButton}
                />
                <Box sx={{ aspectRatio: 1, width: '100%', maxWidth: '336px' }}>
                    <Board
                        config={{
                            fen: fen || FEN.start,
                            movable: { free: true },
                            selectable: { enabled: false },
                            draggable: {
                                deleteOnDropOff: true,
                            },
                            highlight: {
                                lastMove: false,
                            },
                        }}
                        onInitializeBoard={(board) => setBoard(board)}
                    />
                </Box>
                <PieceToggleButtonGroup
                    pieces={orientation === 'white' ? whitePieces : blackPieces}
                    value={currentButton}
                    onChange={setCurrentButton}
                />
            </Stack>

            <Stack alignItems='start' maxWidth='188px'>
                <TextField
                    select
                    value={toMove}
                    size='small'
                    onChange={(e) => onChangeColor(e.target.value)}
                    sx={{ ml: 0.5, width: 1 }}
                >
                    <MenuItem value='w'>White to play</MenuItem>
                    <MenuItem value='b'>Black to play</MenuItem>
                </TextField>

                <TextField
                    select
                    label='En Passant'
                    value={enPassantTarget}
                    onChange={(e) => onChangeEnPassant(e.target.value)}
                    size='small'
                    sx={{ mt: 2, ml: 0.5, width: 1 }}
                >
                    <MenuItem value='-'>None</MenuItem>
                    {enPassantOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                            {opt}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label='Move Number'
                    value={moveNumber}
                    onChange={(e) => onChangeMoveNumber(e.target.value)}
                    size='small'
                    sx={{ width: 1, ml: 0.5, mt: 2 }}
                />

                <Typography variant='subtitle2' color='textSecondary' mt={1.5} ml={0.5}>
                    Castling
                </Typography>
                <Stack direction='row' width={1} justifyContent='space-between' ml={0.5}>
                    <FormControl>
                        <FormLabel>White</FormLabel>
                        <FormGroup>
                            <CastlingEditor
                                label='O-O'
                                field='K'
                                value={castling}
                                onChange={onChangeCastling}
                            />
                            <CastlingEditor
                                label='O-O-O'
                                field='Q'
                                value={castling}
                                onChange={onChangeCastling}
                            />
                        </FormGroup>
                    </FormControl>

                    <FormControl>
                        <FormLabel>Black</FormLabel>
                        <FormGroup>
                            <CastlingEditor
                                label='O-O'
                                field='k'
                                value={castling}
                                onChange={onChangeCastling}
                            />
                            <CastlingEditor
                                label='O-O-O'
                                field='q'
                                value={castling}
                                onChange={onChangeCastling}
                            />
                        </FormGroup>
                    </FormControl>
                </Stack>

                <Button onClick={onStartingPosition} startIcon={<Replay />} sx={{ mt: 1.5 }}>
                    Starting Position
                </Button>
                <Button onClick={onClearBoard} startIcon={<Delete />}>
                    Clear Board
                </Button>
                <Button onClick={onFlipBoard} startIcon={<WifiProtectedSetup />}>
                    Flip Board
                </Button>
            </Stack>
        </Stack>
    );
}

const TOGGLE_BUTTON_GROUP_LENGTH = 8;
const MOVE_KEYBOARD_SHORTCUT = 'm';
const DELETE_KEYBOARD_SHORTCUT = 'd';

function PieceToggleButtonGroup({
    value,
    onChange,
    pieces,
}: {
    value: string;
    onChange: (value: string) => void;
    pieces: string[];
}) {
    const [pieceStyle] = useLocalStorage<PieceStyle>(PieceStyleKey, PieceStyle.Standard);
    const pieceImages = getPieceSx(pieceStyle);

    return (
        <ToggleButtonGroup
            value={value}
            exclusive
            onChange={(_, value: string) => value && onChange(value)}
            sx={{ justifyContent: 'center' }}
        >
            <Tooltip title={`Keyboard Shortcut: ${MOVE_KEYBOARD_SHORTCUT}`} disableInteractive>
                <ToggleButton
                    value='move'
                    sx={{ width: `${100 / TOGGLE_BUTTON_GROUP_LENGTH}%`, aspectRatio: 1 }}
                >
                    <BackHand sx={{ color: 'text.secondary' }} />
                </ToggleButton>
            </Tooltip>

            {pieces.map((p) => (
                <Tooltip key={p} title={`Keyboard Shortcut: ${p}`} disableInteractive>
                    <ToggleButton
                        value={p}
                        sx={{
                            width: `${100 / TOGGLE_BUTTON_GROUP_LENGTH}%`,
                            aspectRatio: 1,
                            backgroundImage:
                                pieceImages[`--${pieceMap[p].color}-${pieceMap[p].role}`],
                            backgroundSize: 'cover',
                        }}
                    />
                </Tooltip>
            ))}

            <Tooltip title={`Keyboard Shortcut: ${DELETE_KEYBOARD_SHORTCUT}`} disableInteractive>
                <ToggleButton
                    value='delete'
                    sx={{ width: `${100 / TOGGLE_BUTTON_GROUP_LENGTH}%`, aspectRatio: 1 }}
                >
                    <Delete sx={{ color: 'text.secondary' }} />
                </ToggleButton>
            </Tooltip>
        </ToggleButtonGroup>
    );
}

/**
 * Renders a form control for changing the castling permissions.
 * @param value The current value of the castling permissions.
 * @param field Which field in the permissions this editor controls.
 * @param label The label of the form control.
 * @param onChange A callback function invoked when the value is changed.
 */
function CastlingEditor({
    value,
    field,
    label,
    onChange,
}: {
    value: string;
    field: 'K' | 'k' | 'Q' | 'q';
    label: string;
    onChange: (field: 'K' | 'k' | 'Q' | 'q', enabled: boolean) => void;
}) {
    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={value.includes(field)}
                    onChange={(e) => onChange(field, e.target.checked)}
                    size='small'
                    sx={{ p: 0.5 }}
                />
            }
            label={label}
            sx={{ m: 0, ml: -0.5 }}
        />
    );
}

/**
 * Gets the en passant options for the given FEN.
 * @param fen The FEN to get the en passant options for.
 * @returns The available en passant options.
 */
function getEnPassantOptions(fen: string): string[] {
    try {
        const result = [];
        const chess = new Chess({ fen });
        const board = chess.board();

        let rankIdx = 3;
        let captureRankIdx = 2;
        let captureRank = '6';
        let color = 'w';

        if (chess.turn() === 'b') {
            rankIdx = 4;
            captureRankIdx = 5;
            captureRank = '3';
            color = 'b';
        }

        const rank = board[rankIdx];
        for (let i = 0; i < 8; i++) {
            const piece = rank[i];
            if (piece?.type === 'p' && piece.color === color) {
                const leftPiece = rank[i - 1];
                if (
                    leftPiece?.type === 'p' &&
                    leftPiece.color !== color &&
                    board[captureRankIdx][i - 1] === null
                ) {
                    result.push(`${leftPiece.square[0]}${captureRank}`);
                }

                const rightPiece = rank[i + 1];
                if (
                    rightPiece?.type === 'p' &&
                    rightPiece.color !== color &&
                    board[captureRankIdx][i + 1] === null
                ) {
                    result.push(`${rightPiece.square[0]}${captureRank}`);
                }
            }
        }

        return result;
    } catch {
        return [];
    }
}
