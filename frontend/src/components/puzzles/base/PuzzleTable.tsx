'use client';

import Board from '@/board/Board';
import {
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Edit } from '@mui/icons-material';
import {
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { MouseEvent, useState } from 'react';
import { AnnotatorLink } from './AnnotatorLink';
import { bucketColor } from './bucketStyle';
import { PuzzleTagList } from './PuzzleTagList';
import { RatingEditor } from './RatingEditor';
import { TagCounts } from './tagCounts';

const PREVIEW_SIZE = 280;

interface PuzzleTableProps {
    puzzles: PuzzlebasePuzzle[];
    taxonomy: PuzzlebaseTaxonomy;
    counts: TagCounts;
    onChange: (id: string, update: (p: PuzzlebasePuzzle) => PuzzlebasePuzzle) => void;
    onCreateTheme: (id: string, bucket: string, theme: string) => void;
    onEdit: (puzzle: PuzzlebasePuzzle) => void;
}

interface Hover {
    puzzle: PuzzlebasePuzzle;
    x: number;
    y: number;
}

const headCellSx = {
    typography: 'overline',
    color: 'text.secondary',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
} as const;

/** A compact list of puzzles. The board is only shown in a floating preview while hovering a row. */
export function PuzzleTable({
    puzzles,
    taxonomy,
    counts,
    onChange,
    onCreateTheme,
    onEdit,
}: PuzzleTableProps) {
    const router = useRouter();
    const [hover, setHover] = useState<Hover>();

    /**
     * Whether a pointer event on a row is really on the row itself. Popovers such as the tag menu
     * render in a portal, but React still bubbles their events up to the row that contains them.
     * Those events must not count as hovering or clicking the row. Editable controls (rating,
     * tags, edit button) are also excluded: the preview would only get in their way.
     */
    const isOnRow = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        return e.currentTarget.contains(target) && !target.closest('[data-no-nav]');
    };

    // Shows the board preview for a row while the pointer is over the row itself.
    const trackHover = (puzzle: PuzzlebasePuzzle) => (e: MouseEvent) => {
        if (isOnRow(e)) {
            setHover({ puzzle, x: e.clientX, y: e.clientY });
        } else {
            setHover(undefined);
        }
    };

    // Keep the preview on screen: to the right of the cursor, or to the left near the edge.
    const previewLeft = (x: number) =>
        x + 24 + PREVIEW_SIZE > window.innerWidth ? x - 24 - PREVIEW_SIZE : x + 24;
    const previewTop = (y: number) =>
        Math.min(Math.max(y - PREVIEW_SIZE / 2, 8), window.innerHeight - PREVIEW_SIZE - 40);

    return (
        <>
            <TableContainer component={Paper} variant='outlined'>
                <Table size='small' aria-label='Puzzles'>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headCellSx}>ID</TableCell>
                            <TableCell sx={headCellSx}>Rating</TableCell>
                            <TableCell sx={headCellSx}>Turn</TableCell>
                            <TableCell sx={headCellSx}>Tags</TableCell>
                            <TableCell sx={headCellSx}>Game</TableCell>
                            <TableCell sx={headCellSx}>Source</TableCell>
                            <TableCell sx={headCellSx}>Annotator</TableCell>
                            <TableCell sx={headCellSx} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {puzzles.map((puzzle) => {
                            const blackToMove = puzzle.fen.split(' ')[1] === 'b';
                            return (
                                <TableRow
                                    key={puzzle.id}
                                    hover
                                    onMouseEnter={trackHover(puzzle)}
                                    onMouseMove={trackHover(puzzle)}
                                    onMouseLeave={() => setHover(undefined)}
                                    onClick={(e) => {
                                        if (isOnRow(e)) {
                                            router.push(`/puzzles/base/${puzzle.id}`);
                                        }
                                    }}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:last-child > td': { borderBottom: 0 },
                                        '& > td': { verticalAlign: 'middle' },
                                        '& > td:first-of-type': {
                                            borderLeft: `3px solid ${
                                                puzzle.buckets[0]
                                                    ? bucketColor(puzzle.buckets[0])
                                                    : 'transparent'
                                            }`,
                                        },
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 'bold' }}>#{puzzle.id}</TableCell>
                                    <TableCell>
                                        <RatingEditor
                                            value={puzzle.rating}
                                            onChange={(rating) =>
                                                onChange(puzzle.id, (p) => ({ ...p, rating }))
                                            }
                                        />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Box
                                            component='span'
                                            sx={{
                                                display: 'inline-block',
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                mr: 1,
                                                verticalAlign: 'middle',
                                                bgcolor: blackToMove ? '#111' : '#fff',
                                                border: '1px solid',
                                                borderColor: 'text.secondary',
                                            }}
                                        />
                                        {blackToMove ? 'Black' : 'White'}
                                    </TableCell>
                                    <TableCell>
                                        <PuzzleTagList
                                            puzzle={puzzle}
                                            taxonomy={taxonomy}
                                            counts={counts}
                                            onChange={(update) => onChange(puzzle.id, update)}
                                            onCreateTheme={(bucket, theme) =>
                                                onCreateTheme(puzzle.id, bucket, theme)
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {puzzle.white && puzzle.black
                                            ? `${puzzle.white} – ${puzzle.black}`
                                            : '—'}
                                        {puzzle.year && (
                                            <Typography
                                                component='span'
                                                variant='body2'
                                                color='text.secondary'
                                            >
                                                {', '}
                                                {puzzle.year}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{puzzle.composer ?? '—'}</TableCell>
                                    <TableCell>
                                        <AnnotatorLink
                                            username={puzzle.annotator}
                                            displayName={puzzle.annotatorDisplayName}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 0, width: 48 }}>
                                        <IconButton
                                            data-no-nav
                                            size='small'
                                            aria-label={`Edit puzzle ${puzzle.id}`}
                                            onClick={() => onEdit(puzzle)}
                                        >
                                            <Edit fontSize='small' />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {hover && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        zIndex: (theme) => theme.zIndex.tooltip,
                        left: previewLeft(hover.x),
                        top: previewTop(hover.y),
                        width: PREVIEW_SIZE,
                        p: 0.75,
                        pointerEvents: 'none',
                    }}
                >
                    <Box sx={{ width: '100%', aspectRatio: '1 / 1' }}>
                        <Board
                            key={hover.puzzle.id}
                            config={{
                                fen: hover.puzzle.fen,
                                viewOnly: true,
                                orientation:
                                    hover.puzzle.fen.split(' ')[1] === 'b' ? 'black' : 'white',
                            }}
                        />
                    </Box>
                </Paper>
            )}
        </>
    );
}
