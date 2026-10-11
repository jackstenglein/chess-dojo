'use client';

import {
    PUZZLEBASE_BUCKET_GROUPS,
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    addBucket,
    addTheme,
    removeBucket,
    removeTheme,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/tags';
import { Box, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { tagChipSx, themeOutline } from './bucketStyle';
import { countTags } from './tagCounts';

/** How many themes to offer. */
export const COMMON_THEME_COUNT = 6;

/**
 * The themes most used by other puzzles of the same kind, most common first. A puzzle's kind is
 * its buckets: for a Tactics puzzle in the Middlegame, that is the other Tactics middlegame
 * puzzles. With no buckets picked yet, every puzzle counts. Ties go alphabetically.
 */
export function commonThemes(
    puzzles: Pick<PuzzlebasePuzzle, 'id' | 'buckets' | 'themes'>[],
    puzzle: Pick<PuzzlebasePuzzle, 'id' | 'buckets'>,
    limit = COMMON_THEME_COUNT,
): string[] {
    const kinds = PUZZLEBASE_BUCKET_GROUPS.map((group) =>
        group.find((bucket) => puzzle.buckets.includes(bucket)),
    ).filter((bucket): bucket is string => bucket !== undefined);
    const similar = puzzles.filter(
        (p) => p.id !== puzzle.id && kinds.every((bucket) => p.buckets.includes(bucket)),
    );
    return Object.entries(countTags(similar).themes)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([theme]) => theme);
}

interface CommonTagsProps {
    puzzle: PuzzlebasePuzzle;
    puzzles: PuzzlebasePuzzle[];
    taxonomy: PuzzlebaseTaxonomy;
    onChange: (update: (p: PuzzlebasePuzzle) => PuzzlebasePuzzle) => void;
}

/**
 * Quick tagging: a button choice between Tactics and Strategy, another between Opening,
 * Middlegame and Endgame, and below them the themes most used by puzzles of the same kind.
 */
export function CommonTags({ puzzle, puzzles, taxonomy, onChange }: CommonTagsProps) {
    const tags = { buckets: puzzle.buckets, themes: puzzle.themes };
    const themes = commonThemes(puzzles, puzzle);

    return (
        <Box>
            <Stack sx={{ gap: 1, alignItems: 'flex-start' }}>
                {PUZZLEBASE_BUCKET_GROUPS.map((group) => {
                    const value = group.find((bucket) => puzzle.buckets.includes(bucket)) ?? null;
                    return (
                        <ToggleButtonGroup
                            key={group.join('/')}
                            exclusive
                            size='small'
                            color='primary'
                            value={value}
                            aria-label={group.join(' or ')}
                            onChange={(_, bucket: string | null) =>
                                onChange((p) => ({
                                    ...p,
                                    ...(bucket === null
                                        ? removeBucket(taxonomy, tags, value ?? '')
                                        : addBucket(tags, bucket, taxonomy)),
                                }))
                            }
                        >
                            {group.map((bucket) => (
                                <ToggleButton key={bucket} value={bucket} sx={{ px: 2 }}>
                                    {bucket}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    );
                })}
            </Stack>
            {themes.length > 0 && (
                <>
                    <Typography
                        variant='overline'
                        color='text.secondary'
                        sx={{ display: 'block', mt: 1.5 }}
                    >
                        Common themes
                    </Typography>
                    <Stack direction='row' sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                        {themes.map((theme) => {
                            const on = puzzle.themes.includes(theme);
                            return (
                                <Chip
                                    key={theme}
                                    size='small'
                                    clickable
                                    aria-pressed={on}
                                    variant={on ? 'filled' : 'outlined'}
                                    label={theme}
                                    onClick={() =>
                                        onChange((p) => ({
                                            ...p,
                                            ...(on
                                                ? removeTheme(tags, theme)
                                                : addTheme(taxonomy, tags, theme)),
                                        }))
                                    }
                                    sx={{ ...tagChipSx, borderColor: themeOutline }}
                                />
                            );
                        })}
                    </Stack>
                </>
            )}
        </Box>
    );
}
