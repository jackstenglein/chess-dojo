'use client';

import {
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { SuggestTagsResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/suggestions';
import {
    Alert,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { bucketColor, tagChipSx } from './bucketStyle';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';
import { TagChoice } from './TagChoice';

interface SuggestTagsDialogProps {
    client: PuzzlebaseClient;
    taxonomy: PuzzlebaseTaxonomy;
    puzzle: Pick<PuzzlebasePuzzle, 'id' | 'buckets' | 'themes'>;
    onClose: () => void;
    /** Called once the suggestion has been sent, with what came of it. */
    onSent: (result: SuggestTagsResponse) => void;
}

/**
 * Where a member suggests tags for a puzzle they just played. Nothing is added to the puzzle: the
 * suggestion goes to a review pile, and a Puzzle Contributor accepts or dismisses each tag.
 */
export function SuggestTagsDialog({
    client,
    taxonomy,
    puzzle,
    onClose,
    onSent,
}: SuggestTagsDialogProps) {
    const [selected, setSelected] = useState<string[]>([]);
    // Tags the puzzle has that the member thinks do not belong.
    const [removing, setRemoving] = useState<string[]>([]);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string>();

    const toggle = (name: string) =>
        setSelected((current) =>
            current.includes(name) ? current.filter((n) => n !== name) : [...current, name],
        );

    const existing = [...puzzle.buckets, ...puzzle.themes];

    const toggleRemoving = (name: string) =>
        setRemoving((current) =>
            current.includes(name) ? current.filter((n) => n !== name) : [...current, name],
        );

    const isBucket = (name: string) => name in taxonomy.buckets;

    const send = async () => {
        setWorking(true);
        setError(undefined);
        try {
            const result = await client.suggestTags(puzzle.id, {
                buckets: selected.filter(isBucket),
                themes: selected.filter((name) => !isBucket(name)),
                removeBuckets: removing.filter(isBucket),
                removeThemes: removing.filter((name) => !isBucket(name)),
            });
            onSent(result);
        } catch (err) {
            setError(errorMessage(err));
            setWorking(false);
        }
    };

    return (
        <Dialog open onClose={working ? undefined : onClose} fullWidth maxWidth='sm'>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Suggest tags for #{puzzle.id}</DialogTitle>
            <DialogContent>
                <Typography color='text.secondary' sx={{ mb: 2 }}>
                    What is this puzzle about? Pick the themes you see, and mark any tag it has that
                    does not belong. A Puzzle Contributor reviews every suggestion before anything
                    changes.
                </Typography>
                <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                    Add tags
                </Typography>
                <TagChoice
                    taxonomy={taxonomy}
                    selected={selected}
                    onToggle={toggle}
                    disabled={[...puzzle.buckets, ...puzzle.themes]}
                />
                {existing.length > 0 && (
                    <>
                        <Typography
                            variant='overline'
                            color='text.secondary'
                            sx={{ display: 'block', mt: 2 }}
                        >
                            Remove tags
                        </Typography>
                        <Stack direction='row' sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                            {existing.map((name) => {
                                const on = removing.includes(name);
                                return (
                                    <Chip
                                        key={name}
                                        size='small'
                                        clickable
                                        label={name}
                                        aria-label={`Remove ${name}`}
                                        aria-pressed={on}
                                        onClick={() => toggleRemoving(name)}
                                        variant={isBucket(name) ? 'filled' : 'outlined'}
                                        color={on ? 'error' : 'default'}
                                        sx={{
                                            ...tagChipSx,
                                            textDecoration: on ? 'line-through' : undefined,
                                            ...(isBucket(name) && !on
                                                ? {
                                                      fontWeight: 600,
                                                      bgcolor: alpha(bucketColor(name), 0.42),
                                                  }
                                                : {}),
                                        }}
                                    />
                                );
                            })}
                        </Stack>
                    </>
                )}
                {error && (
                    <Alert severity='error' sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={working} color='inherit'>
                    Cancel
                </Button>
                <Button
                    variant='contained'
                    onClick={() => void send()}
                    disabled={working || selected.length + removing.length === 0}
                >
                    {working ? 'Sending…' : 'Send suggestion'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
