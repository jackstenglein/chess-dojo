'use client';

import { Link } from '@/components/navigation/Link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import {
    Body,
    Condensed,
    EASE_OUT,
    HAIRLINE,
    Heading,
    MUTED,
    ORANGE,
    revealSx,
    Section,
} from '../../class/sections/shared';
import { PUZZLE } from '../content';

type PieceCode = 'wK' | 'wR' | 'wB' | 'wP' | 'bK' | 'bR' | 'bB' | 'bP';

interface Piece {
    id: string;
    code: PieceCode;
    square: string;
    captured?: boolean;
}

interface Move {
    from: string;
    to: string;
}

/**
 * Ding Liren vs Gukesh D, World Championship 2024, Game 14, after 55.Rf2.
 * FEN: B7/8/4b3/4kp2/6p1/6P1/1r3R2/6K1 b - - 17 55, taken from the Lichess
 * broadcast PGN and replayed with chess.js. The game went 55...Rxf2 56.Kxf2 Bd5
 * 57.Bxd5 Kxd5 58.Ke3 Ke5 and White resigned.
 */
const START: Piece[] = [
    { id: 'wB', code: 'wB', square: 'a8' },
    { id: 'wR', code: 'wR', square: 'f2' },
    { id: 'wK', code: 'wK', square: 'g1' },
    { id: 'wP', code: 'wP', square: 'g3' },
    { id: 'bB', code: 'bB', square: 'e6' },
    { id: 'bK', code: 'bK', square: 'e5' },
    { id: 'bPf', code: 'bP', square: 'f5' },
    { id: 'bPg', code: 'bP', square: 'g4' },
    { id: 'bR', code: 'bR', square: 'b2' },
];

/** The square White's last move came from and went to. */
const LAST_MOVE: Move = { from: 'f4', to: 'f2' };

/** Each move the visitor has to find, and what the board plays in answer. */
const SOLUTION: { move: Move; replies: Move[] }[] = [
    { move: { from: 'b2', to: 'f2' }, replies: [{ from: 'g1', to: 'f2' }] },
    {
        move: { from: 'e6', to: 'd5' },
        replies: [
            { from: 'a8', to: 'd5' },
            { from: 'e5', to: 'd5' },
        ],
    },
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
/** Black is at the bottom, so the board runs h to a and 1 to 8. */
const COLUMNS = [...FILES].reverse();
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8];
const REPLY_DELAY_MS = 550;
/**
 * The board and pieces a ChessDojo member sees by default (BoardStyle.Standard
 * and PieceStyle.Standard in board/boardThemes.ts), with the same highlight
 * colors the site's boards use for the last move and the selected square.
 */
const BOARD_IMAGE = "url('/static/board/backgrounds/standard.png')";
const PIECE_PATH = '/static/board/pieces/standard/';
const COORD_ON_LIGHT = '#7296ac';
const COORD_ON_DARK = '#fff';
const LAST_MOVE_TINT = 'rgba(155, 199, 0, 0.41)';
const SELECTED_TINT = 'rgba(20, 85, 30, 0.5)';

const shake = keyframes`
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
`;

function position(square: string): { column: number; row: number } {
    return { column: COLUMNS.indexOf(square[0]), row: Number(square[1]) - 1 };
}

function play(pieces: Piece[], move: Move): Piece[] {
    return pieces.map((piece) => {
        if (piece.captured) {
            return piece;
        }
        if (piece.square === move.from) {
            return { ...piece, square: move.to };
        }
        return piece.square === move.to ? { ...piece, captured: true } : piece;
    });
}

function pieceName(code: PieceCode): string {
    const names: Record<string, string> = PUZZLE.pieceNames;
    return `${code.startsWith('w') ? 'White' : 'Black'} ${names[code[1]]}`;
}

export function Puzzle() {
    const [pieces, setPieces] = useState(START);
    const [step, setStep] = useState(0);
    const [selected, setSelected] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [misses, setMisses] = useState(0);
    const [shakeKey, setShakeKey] = useState(0);
    const [lastMove, setLastMove] = useState(LAST_MOVE);
    const timers = useRef<number[]>([]);

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    const solved = step >= SOLUTION.length;

    /** Plays a run of moves at an even pace, then moves the puzzle on to `nextStep`. */
    const playMoves = (moves: Move[], nextStep: number) => {
        let board = pieces;
        setBusy(true);
        moves.forEach((move, index) => {
            const run = () => {
                board = play(board, move);
                setPieces(board);
                setLastMove(move);
                if (index === moves.length - 1) {
                    setStep(nextStep);
                    setMisses(0);
                    setBusy(false);
                }
            };
            if (index === 0) {
                run();
            } else {
                timers.current.push(window.setTimeout(run, REPLY_DELAY_MS * index));
            }
        });
    };

    const onSquare = (square: string) => {
        if (busy || solved) {
            return;
        }
        const piece = pieces.find((item) => !item.captured && item.square === square);
        if (piece?.code.startsWith('b')) {
            setSelected(selected === square ? undefined : square);
            return;
        }
        if (!selected) {
            return;
        }
        const expected = SOLUTION[step].move;
        setSelected(undefined);
        if (selected === expected.from && square === expected.to) {
            playMoves([expected, ...SOLUTION[step].replies], step + 1);
        } else {
            setMisses((count) => count + 1);
            setShakeKey((key) => key + 1);
        }
    };

    const showMe = () => {
        if (busy || solved) {
            return;
        }
        setSelected(undefined);
        playMoves(
            SOLUTION.slice(step).flatMap((item) => [item.move, ...item.replies]),
            SOLUTION.length,
        );
    };

    const reset = () => {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];
        setPieces(START);
        setStep(0);
        setSelected(undefined);
        setBusy(false);
        setMisses(0);
        setLastMove(LAST_MOVE);
    };

    const status = solved
        ? PUZZLE.solved
        : misses === 0
          ? PUZZLE.steps[step].prompt
          : misses === 1
            ? PUZZLE.wrong
            : PUZZLE.steps[step].hint;

    return (
        <Section
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 27rem) 1fr' },
                gap: { xs: 3.5, md: 8 },
                alignItems: 'center',
            }}
        >
            <Box sx={{ ...revealSx, order: { xs: 2, md: 1 } }}>
                <Box
                    key={shakeKey}
                    role='group'
                    aria-label={PUZZLE.boardLabel}
                    sx={{
                        position: 'relative',
                        aspectRatio: '1',
                        backgroundImage: BOARD_IMAGE,
                        backgroundSize: 'cover',
                        borderRadius: 2,
                        overflow: 'hidden',
                        boxShadow: `0 0 0 1px ${HAIRLINE}, 0 40px 90px -30px rgba(0, 0, 0, 0.9)`,
                        animation: shakeKey ? `${shake} 220ms ${EASE_OUT}` : undefined,
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(8, 1fr)',
                            gridTemplateRows: 'repeat(8, 1fr)',
                        }}
                    >
                        {ROWS.map((rank, row) =>
                            COLUMNS.map((file, column) => {
                                const square = `${file}${rank}`;
                                const dark = (FILES.indexOf(file) + rank) % 2 === 1;
                                const piece = pieces.find(
                                    (item) => !item.captured && item.square === square,
                                );
                                const moved = square === lastMove.from || square === lastMove.to;
                                return (
                                    <Box
                                        key={square}
                                        component='button'
                                        type='button'
                                        aria-label={
                                            piece ? `${pieceName(piece.code)}, ${square}` : square
                                        }
                                        aria-pressed={selected === square}
                                        onClick={() => onSquare(square)}
                                        sx={{
                                            position: 'relative',
                                            p: 0,
                                            border: 0,
                                            cursor: solved || busy ? 'default' : 'pointer',
                                            bgcolor:
                                                selected === square
                                                    ? SELECTED_TINT
                                                    : moved
                                                      ? LAST_MOVE_TINT
                                                      : 'transparent',
                                            '&:focus-visible': {
                                                outline: `2px solid ${ORANGE}`,
                                                outlineOffset: '-2px',
                                                zIndex: 1,
                                            },
                                        }}
                                    >
                                        {(column === 0 || row === 7) && (
                                            <Box
                                                component='span'
                                                aria-hidden
                                                sx={{
                                                    position: 'absolute',
                                                    left: 3,
                                                    bottom: row === 7 ? 1 : 'auto',
                                                    top: row === 7 ? 'auto' : 2,
                                                    fontSize: '0.62rem',
                                                    fontWeight: 600,
                                                    lineHeight: 1,
                                                    color: dark ? COORD_ON_DARK : COORD_ON_LIGHT,
                                                }}
                                            >
                                                {column === 0 && row !== 7 ? rank : file}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            }),
                        )}
                    </Box>

                    {pieces.map((piece) => {
                        const { column, row } = position(piece.square);
                        return (
                            <Box
                                key={piece.id}
                                component='img'
                                src={`${PIECE_PATH}${piece.code}.webp`}
                                alt=''
                                draggable={false}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '12.5%',
                                    height: '12.5%',
                                    pointerEvents: 'none',
                                    transform: `translate(${column * 100}%, ${row * 100}%) scale(${piece.captured ? 0.6 : 1})`,
                                    opacity: piece.captured ? 0 : 1,
                                    transition: `transform 320ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`,
                                }}
                            />
                        );
                    })}
                </Box>
            </Box>

            <Box sx={{ order: { xs: 1, md: 2 } }}>
                <Heading sx={{ mb: 2.5 }}>{PUZZLE.heading}</Heading>
                <Body sx={{ color: 'common.white', fontSize: { xs: '1.125rem', md: '1.2rem' } }}>
                    {PUZZLE.intro}
                </Body>
                <Condensed
                    aria-live='polite'
                    sx={{
                        mt: 2.5,
                        minHeight: { xs: '4.6em', md: '3.5em' },
                        fontSize: '1.3rem',
                        fontWeight: 500,
                        color: solved ? '#7FD66B' : ORANGE,
                    }}
                >
                    {status}
                </Condensed>
                <Stack direction='row' sx={{ mt: 1, gap: 1.25, flexWrap: 'wrap' }}>
                    <Button
                        variant='outlined'
                        color='inherit'
                        onClick={solved ? reset : showMe}
                        disabled={busy}
                        sx={{
                            minHeight: 48,
                            px: 2.5,
                            fontWeight: 600,
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            transition: `transform 150ms ${EASE_OUT}, border-color 200ms ${EASE_OUT}`,
                            '&:active': { transform: 'scale(0.97)' },
                        }}
                    >
                        {solved ? PUZZLE.again : PUZZLE.showMe}
                    </Button>
                </Stack>
                <Typography
                    variant='body2'
                    sx={{
                        mt: 4,
                        pt: 3,
                        borderTop: `1px solid ${HAIRLINE}`,
                        color: MUTED,
                        fontSize: '1.05rem',
                        lineHeight: 1.55,
                        maxWidth: '34rem',
                    }}
                >
                    {PUZZLE.bridge}
                </Typography>
                <Button
                    component={Link}
                    href={PUZZLE.href}
                    variant='contained'
                    color='dojoOrange'
                    sx={{
                        mt: 2,
                        minHeight: 48,
                        px: 3,
                        fontWeight: 600,
                        transition: `transform 150ms ${EASE_OUT}`,
                        '&:active': { transform: 'scale(0.97)' },
                    }}
                >
                    {PUZZLE.cta}
                </Button>
            </Box>
        </Section>
    );
}
