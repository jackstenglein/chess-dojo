'use client';

import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { PuzzleTags } from '@jackstenglein/chess-dojo-common/src/puzzlebase/tags';
import { Add } from '@mui/icons-material';
import { Chip } from '@mui/material';
import { BucketThemeMenu } from './BucketThemeMenu';
import { tagChipSx } from './bucketStyle';
import { TagCounts } from './tagCounts';

interface TagPickerProps {
    taxonomy: PuzzlebaseTaxonomy;
    tags: PuzzleTags;
    counts: TagCounts;
    onToggleBucket: (bucket: string) => void;
    onToggleTheme: (theme: string, bucket: string) => void;
    /** Called when the user creates a new theme in a bucket. The theme should also be added to the puzzle. */
    onCreateTheme: (bucket: string, theme: string) => void;
    /** For puzzle admins: deletes a theme for good. */
    onDeleteTheme?: (bucket: string, theme: string) => void;
}

/**
 * A "+" chip that opens the bucket menu. Hover a bucket to see its themes. Picking a theme also
 * adds its bucket to the puzzle.
 */
export function TagPicker({
    taxonomy,
    tags,
    counts,
    onToggleBucket,
    onToggleTheme,
    onCreateTheme,
    onDeleteTheme,
}: TagPickerProps) {
    return (
        <BucketThemeMenu
            taxonomy={taxonomy}
            counts={counts}
            selectedBuckets={tags.buckets}
            selectedThemes={tags.themes}
            onToggleBucket={onToggleBucket}
            onToggleTheme={onToggleTheme}
            onCreateTheme={onCreateTheme}
            onDeleteTheme={onDeleteTheme}
            renderTrigger={({ onClick }) => (
                <Chip
                    size='small'
                    icon={<Add />}
                    label='Tag'
                    variant='outlined'
                    clickable
                    onClick={onClick}
                    aria-label='Add tag'
                    data-no-nav
                    sx={{
                        ...tagChipSx,
                        borderStyle: 'dashed',
                        borderColor: 'text.disabled',
                        color: 'text.secondary',
                        '& .MuiChip-icon': { fontSize: 14 },
                    }}
                />
            )}
        />
    );
}
