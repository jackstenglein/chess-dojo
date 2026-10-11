import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { mostPopular, popularity } from '@jackstenglein/chess-dojo-common/src/puzzlebase/votes';
import { ThumbDownOutlined, ThumbUpOutlined } from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { bucketColor } from './bucketStyle';

/** How many puzzles to list. */
const SHOWN = 5;

/**
 * The puzzles members like most, as on Lichess: popularity runs from -100 to 100, the share of
 * thumbs up minus the share of thumbs down. Puzzles with few votes need a lot of agreement to rank.
 */
export function PopularPuzzles({ puzzles }: { puzzles: PuzzlebasePuzzle[] }) {
    const rows = mostPopular(puzzles, SHOWN) as PuzzlebasePuzzle[];

    return (
        <Paper variant='outlined' sx={{ p: 2, minWidth: 260 }}>
            <Typography
                variant='overline'
                sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', mb: 1 }}
            >
                Most popular puzzles
            </Typography>
            {rows.length === 0 && (
                <Typography variant='body2' color='text.secondary'>
                    No votes yet. Members vote after they play a puzzle.
                </Typography>
            )}
            <Stack sx={{ gap: 1.25 }}>
                {rows.map((puzzle, i) => (
                    <Stack key={puzzle.id} direction='row' sx={{ alignItems: 'center', gap: 1.5 }}>
                        <Typography
                            variant='body2'
                            sx={{
                                width: 16,
                                fontWeight: 'bold',
                                color: i === 0 ? 'primary.main' : 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {i + 1}
                        </Typography>
                        <Box
                            aria-hidden
                            sx={{
                                width: 3,
                                alignSelf: 'stretch',
                                borderRadius: 1,
                                bgcolor: bucketColor(puzzle.buckets[0] ?? ''),
                            }}
                        />
                        <Typography
                            variant='body2'
                            component={Link}
                            href={`/puzzles/base/${puzzle.id}`}
                            sx={{ fontWeight: 'bold', flexGrow: 1 }}
                        >
                            #{puzzle.id}
                        </Typography>
                        <Stack
                            direction='row'
                            sx={{ gap: 1, color: 'text.secondary', alignItems: 'center' }}
                            aria-label={`${puzzle.upvotes ?? 0} up, ${puzzle.downvotes ?? 0} down`}
                        >
                            <Typography variant='caption' sx={{ display: 'flex', gap: 0.25 }}>
                                <ThumbUpOutlined sx={{ fontSize: 14 }} />
                                {puzzle.upvotes ?? 0}
                            </Typography>
                            <Typography variant='caption' sx={{ display: 'flex', gap: 0.25 }}>
                                <ThumbDownOutlined sx={{ fontSize: 14 }} />
                                {puzzle.downvotes ?? 0}
                            </Typography>
                        </Stack>
                        <Typography
                            variant='body2'
                            sx={{
                                fontWeight: 'bold',
                                minWidth: 40,
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {popularity(puzzle)}%
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
}
