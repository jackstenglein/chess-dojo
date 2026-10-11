'use client';

import {
    missingBucketGroups,
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    addBucket,
    addTheme,
    removeBucket,
    removeTheme,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/tags';
import { Chip, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { bucketColor, tagChipSx, themeOutline } from './bucketStyle';
import { TagCounts } from './tagCounts';
import { groupTags } from './tagGroups';
import { TagPicker } from './TagPicker';

interface PuzzleTagListProps {
    puzzle: PuzzlebasePuzzle;
    taxonomy: PuzzlebaseTaxonomy;
    counts: TagCounts;
    onChange: (update: (p: PuzzlebasePuzzle) => PuzzlebasePuzzle) => void;
    onCreateTheme: (bucket: string, theme: string) => void;
    /** For puzzle admins: deletes a theme for good. */
    onDeleteTheme?: (bucket: string, theme: string) => void;
}

/** A puzzle's bucket and theme chips, with delete buttons and the + Tag picker. */
export function PuzzleTagList({
    puzzle,
    taxonomy,
    counts,
    onChange,
    onCreateTheme,
    onDeleteTheme,
}: PuzzleTagListProps) {
    const tags = { buckets: puzzle.buckets, themes: puzzle.themes };
    const groups = groupTags(taxonomy, tags);

    return (
        <Stack direction='row' sx={{ gap: 0.5, flexWrap: 'wrap' }}>
            {groups
                .filter((group) => group.hasBucketTag)
                .map((group) => (
                    <Chip
                        key={group.bucket}
                        data-no-nav
                        size='small'
                        label={group.bucket}
                        onDelete={() =>
                            onChange((p) => ({
                                ...p,
                                ...removeBucket(taxonomy, tags, group.bucket),
                            }))
                        }
                        sx={{
                            ...tagChipSx,
                            fontWeight: 600,
                            bgcolor: alpha(bucketColor(group.bucket), 0.42),
                            '& .MuiChip-deleteIcon': { fontSize: 14 },
                        }}
                    />
                ))}
            {missingBucketGroups(puzzle.buckets).map((group) => (
                <Chip
                    key={group.join('/')}
                    size='small'
                    variant='outlined'
                    color='warning'
                    label={`Needs ${group.join(' / ')}`}
                    sx={{ ...tagChipSx, borderStyle: 'dashed' }}
                />
            ))}
            {groups.flatMap((group) =>
                group.themes.map((theme) => (
                    <Chip
                        key={theme}
                        data-no-nav
                        size='small'
                        variant='outlined'
                        label={theme}
                        onDelete={() => onChange((p) => ({ ...p, ...removeTheme(tags, theme) }))}
                        sx={{
                            ...tagChipSx,
                            borderColor: themeOutline,
                            '& .MuiChip-deleteIcon': { fontSize: 14 },
                        }}
                    />
                )),
            )}
            <TagPicker
                taxonomy={taxonomy}
                counts={counts}
                tags={tags}
                onToggleBucket={(bucket) =>
                    onChange((p) => ({
                        ...p,
                        ...(p.buckets.includes(bucket)
                            ? removeBucket(taxonomy, tags, bucket)
                            : addBucket(tags, bucket, taxonomy)),
                    }))
                }
                onToggleTheme={(theme, bucket) =>
                    onChange((p) => ({
                        ...p,
                        ...(p.themes.includes(theme)
                            ? removeTheme(tags, theme)
                            : addTheme(taxonomy, tags, theme, bucket)),
                    }))
                }
                onCreateTheme={onCreateTheme}
                onDeleteTheme={onDeleteTheme}
            />
        </Stack>
    );
}
