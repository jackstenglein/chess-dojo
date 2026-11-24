'use client';

import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { bucketColor, tagChipSx, themeOutline } from './bucketStyle';
import { sortThemes } from './BucketThemeMenu';

interface TagChoiceProps {
    taxonomy: PuzzlebaseTaxonomy;
    /** The names of the chosen buckets and themes. */
    selected: string[];
    onToggle: (name: string) => void;
    /** Tags that cannot be chosen, such as ones the puzzle already has. */
    disabled?: string[];
}

/**
 * Every bucket with its themes as chips to switch on and off, each bucket in its Dojo color. For
 * choosing several tags at once without opening menus.
 */
export function TagChoice({ taxonomy, selected, onToggle, disabled = [] }: TagChoiceProps) {
    return (
        <Stack sx={{ gap: 2 }}>
            {Object.entries(taxonomy.buckets).map(([bucket, themes]) => (
                <Stack key={bucket} sx={{ gap: 0.75 }}>
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                        <Chip
                            size='small'
                            clickable
                            label={bucket}
                            aria-pressed={selected.includes(bucket)}
                            disabled={disabled.includes(bucket)}
                            onClick={() => onToggle(bucket)}
                            sx={{
                                ...tagChipSx,
                                fontWeight: 600,
                                bgcolor: alpha(
                                    bucketColor(bucket),
                                    selected.includes(bucket) ? 0.9 : 0.25,
                                ),
                                color: selected.includes(bucket) ? '#fff' : undefined,
                            }}
                        />
                        <Typography variant='caption' color='text.secondary'>
                            {themes.length} themes
                        </Typography>
                    </Stack>
                    <Stack direction='row' sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                        {sortThemes(themes).map((theme) => {
                            const on = selected.includes(theme);
                            return (
                                <Chip
                                    key={theme}
                                    size='small'
                                    clickable
                                    label={theme}
                                    variant='outlined'
                                    aria-pressed={on}
                                    disabled={disabled.includes(theme)}
                                    onClick={() => onToggle(theme)}
                                    sx={{
                                        ...tagChipSx,
                                        borderColor: on ? bucketColor(bucket) : themeOutline,
                                        bgcolor: on ? alpha(bucketColor(bucket), 0.35) : undefined,
                                        fontWeight: on ? 600 : undefined,
                                    }}
                                />
                            );
                        })}
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );
}
