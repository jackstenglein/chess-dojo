'use client';

import Board from '@/board/Board';
import {
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Edit } from '@mui/icons-material';
import { Box, Card, CardActionArea, IconButton, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { bucketGradient } from './bucketStyle';
import { PuzzleTagList } from './PuzzleTagList';
import { RatingEditor } from './RatingEditor';
import { TagCounts } from './tagCounts';

interface PuzzleCardProps {
    puzzle: PuzzlebasePuzzle;
    taxonomy: PuzzlebaseTaxonomy;
    counts: TagCounts;
    onChange: (update: (p: PuzzlebasePuzzle) => PuzzlebasePuzzle) => void;
    onCreateTheme: (bucket: string, theme: string) => void;
    onEdit: () => void;
}

/** A puzzle in the grid: board preview and editable tags. */
export function PuzzleCard({
    puzzle,
    taxonomy,
    counts,
    onChange,
    onCreateTheme,
    onEdit,
}: PuzzleCardProps) {
    const blackToMove = puzzle.fen.split(' ')[1] === 'b';
    const orientation = blackToMove ? 'black' : 'white';

    return (
        <Card
            variant='outlined'
            sx={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'border-color .15s ease',
                '&:hover': { borderColor: 'text.secondary' },
            }}
        >
            <Box sx={{ height: 3, background: bucketGradient(puzzle.buckets) }} />

            <Stack
                direction='row'
                sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 1,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Typography sx={{ fontWeight: 'bold' }}>#{puzzle.id}</Typography>
                <Stack direction='row' sx={{ alignItems: 'center', gap: 0.5 }}>
                    <RatingEditor
                        value={puzzle.rating}
                        onChange={(rating) => onChange((p) => ({ ...p, rating }))}
                    />
                    <IconButton
                        size='small'
                        aria-label={`Edit puzzle ${puzzle.id}`}
                        onClick={onEdit}
                    >
                        <Edit fontSize='small' />
                    </IconButton>
                </Stack>
            </Stack>

            <CardActionArea component={Link} href={`/puzzles/base/${puzzle.id}`}>
                <Box sx={{ aspectRatio: '1 / 1' }}>
                    <Board config={{ fen: puzzle.fen, viewOnly: true, orientation }} />
                </Box>
                <Stack sx={{ px: 2, py: 1, gap: 0.25 }}>
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: blackToMove ? '#111' : '#fff',
                                border: '1px solid',
                                borderColor: 'text.secondary',
                            }}
                        />
                        <Typography variant='body2' color='text.secondary'>
                            {blackToMove ? 'Black' : 'White'} to play
                        </Typography>
                    </Stack>
                    <Typography variant='caption' color='text.secondary' noWrap>
                        {puzzle.white && puzzle.black
                            ? `${puzzle.white} – ${puzzle.black}${puzzle.year ? `, ${puzzle.year}` : ''}`
                            : (puzzle.composer ?? '')}
                    </Typography>
                </Stack>
            </CardActionArea>

            <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
                <PuzzleTagList
                    puzzle={puzzle}
                    taxonomy={taxonomy}
                    counts={counts}
                    onChange={onChange}
                    onCreateTheme={onCreateTheme}
                />
            </Box>
        </Card>
    );
}
