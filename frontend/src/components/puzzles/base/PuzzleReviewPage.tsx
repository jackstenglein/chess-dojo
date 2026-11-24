'use client';

import PgnBoard from '@/board/pgn/PgnBoard';
import {
    missingBucketGroups,
    PuzzlebasePuzzle,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { SuggestionSummary } from '@jackstenglein/chess-dojo-common/src/puzzlebase/suggestions';
import {
    ArrowBack,
    ArrowForward,
    Check,
    Close,
    LocalOffer,
    NavigateBefore,
    NavigateNext,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    IconButton,
    Snackbar,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PUZZLE_COORDINATE_SIZE } from '../settings/puzzleSettingsKeys';
import { bucketColor, tagChipSx, themeOutline } from './bucketStyle';
import { CommonTags } from './CommonTags';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';
import { PuzzlebaseGate } from './PuzzlebaseGate';
import { PuzzleTagList } from './PuzzleTagList';
import { RatingEditor } from './RatingEditor';
import { countTags } from './tagCounts';
import { usePuzzlebaseData } from './usePuzzlebaseData';

type Filter = 'untagged' | 'suggested' | 'all';

/**
 * Goes through the puzzles one at a time to tag them: the solution on a board with its move list,
 * the tag editor beside it, and any tags members suggested waiting to be accepted or dismissed.
 * For Puzzle Contributors and admins.
 */
export function PuzzleReviewPage() {
    return (
        <PuzzlebaseGate>
            {({ client, status }) => <PuzzleReview client={client} isAdmin={status.isAdmin} />}
        </PuzzlebaseGate>
    );
}

/** The ids of the puzzles to go through for a filter, in id order. */
export function reviewQueue(
    puzzles: PuzzlebasePuzzle[],
    suggestions: SuggestionSummary[],
    filter: Filter,
): string[] {
    const suggested = new Set(suggestions.map((s) => s.puzzleId));
    return puzzles
        .filter((p) =>
            filter === 'all'
                ? true
                : filter === 'untagged'
                  ? p.themes.length === 0 || missingBucketGroups(p.buckets).length > 0
                  : suggested.has(p.id),
        )
        .map((p) => p.id)
        .sort();
}

export function PuzzleReview({
    client,
    isAdmin = false,
}: {
    client: PuzzlebaseClient;
    /** Whether the reviewer is a puzzle admin, who can delete themes. */
    isAdmin?: boolean;
}) {
    const data = usePuzzlebaseData(client);
    const { puzzles, taxonomy, loadState } = data;
    const [suggestions, setSuggestions] = useState<SuggestionSummary[]>([]);
    const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
    const [filter, setFilter] = useState<Filter>('untagged');
    // The puzzles to go through. Fixed when the filter changes, so tagging a puzzle does not make
    // it vanish from under you.
    const [queue, setQueue] = useState<string[]>([]);
    const [position, setPosition] = useState(0);
    const [error, setError] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        client
            .listSuggestions()
            .then((result) => {
                if (!cancelled) setSuggestions(result);
            })
            .catch(() => {
                // Reviewing still works without the pile.
            })
            .finally(() => !cancelled && setSuggestionsLoaded(true));
        return () => {
            cancelled = true;
        };
    }, [client]);

    const ready = loadState === 'ready' && suggestionsLoaded;
    useEffect(() => {
        if (ready) {
            setQueue(reviewQueue(puzzles, suggestions, filter));
            setPosition(0);
        }
        // Only when the filter changes or the data first arrives, not on every edit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, filter]);

    const counts = useMemo(() => countTags(puzzles), [puzzles]);
    const current = puzzles.find((p) => p.id === queue[position]);
    const suggestionsHere = suggestions.find((s) => s.puzzleId === current?.id)?.tags ?? [];

    const resolve = useCallback(
        async (puzzleId: string, change: { accept?: string[]; reject?: string[] }) => {
            try {
                const updated = await client.resolveSuggestions(puzzleId, {
                    accept: change.accept ?? [],
                    reject: change.reject ?? [],
                });
                data.replacePuzzle(updated);
                const done = new Set([...(change.accept ?? []), ...(change.reject ?? [])]);
                setSuggestions((all) =>
                    all
                        .map((s) =>
                            s.puzzleId === puzzleId
                                ? { ...s, tags: s.tags.filter((t) => !done.has(t.name)) }
                                : s,
                        )
                        .filter((s) => s.tags.length > 0),
                );
            } catch (err) {
                setError(errorMessage(err));
            }
        },
        [client, data],
    );

    if (loadState === 'loading' || (loadState === 'ready' && !suggestionsLoaded)) {
        return (
            <Stack sx={{ alignItems: 'center', py: 10 }}>
                <CircularProgress />
            </Stack>
        );
    }
    if (loadState === 'error') {
        return (
            <Container maxWidth='sm' sx={{ py: 8 }}>
                <Alert
                    severity='error'
                    action={<Button onClick={() => void data.reload()}>Retry</Button>}
                >
                    {data.loadError}
                </Alert>
            </Container>
        );
    }

    const pending = suggestions.length;

    return (
        <Container maxWidth={false} sx={{ py: { xs: 2, sm: 4 } }}>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 2,
                }}
            >
                <Stack direction='row' sx={{ alignItems: 'center', gap: 2 }}>
                    <Button
                        component={Link}
                        href='/puzzles/base'
                        startIcon={<ArrowBack />}
                        color='inherit'
                    >
                        PuzzleBase
                    </Button>
                    <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                        Review tags
                    </Typography>
                </Stack>
                <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={filter}
                    onChange={(_, value: Filter | null) => value && setFilter(value)}
                    aria-label='Which puzzles'
                >
                    <ToggleButton value='untagged'>Missing tags</ToggleButton>
                    <ToggleButton value='suggested'>Suggested ({pending})</ToggleButton>
                    <ToggleButton value='all'>All</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {!current ? (
                <Alert severity='success'>
                    {filter === 'suggested'
                        ? 'No suggestions are waiting.'
                        : filter === 'untagged'
                          ? 'Every puzzle has a type, a phase and a theme.'
                          : 'There are no puzzles yet.'}
                </Alert>
            ) : (
                <PgnBoard
                    key={current.id}
                    pgn={current.solutionPgn}
                    largeBoard
                    slotProps={{
                        pgnText: { hideResultDivider: true },
                        board: { defaultCoordinateSize: PUZZLE_COORDINATE_SIZE },
                    }}
                    showPlayerHeaders={false}
                    initialUnderboardTab='review'
                    disableEngine
                    disableNullMoves
                    underboardTabs={[
                        {
                            name: 'review',
                            tooltip: 'Tag this puzzle',
                            icon: <LocalOffer />,
                            element: (
                                <CardContent>
                                    <Stack sx={{ gap: 2 }}>
                                        <Stack
                                            direction='row'
                                            sx={{
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Tooltip title='Previous puzzle'>
                                                <span>
                                                    <IconButton
                                                        aria-label='Previous puzzle'
                                                        disabled={position === 0}
                                                        onClick={() => setPosition((n) => n - 1)}
                                                    >
                                                        <NavigateBefore />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Typography sx={{ fontWeight: 'bold' }}>
                                                #{current.id}
                                                <Typography
                                                    component='span'
                                                    color='text.secondary'
                                                    sx={{ fontWeight: 'normal' }}
                                                >
                                                    {'  ·  '}
                                                    {position + 1} of {queue.length}
                                                </Typography>
                                            </Typography>
                                            <Tooltip title='Next puzzle'>
                                                <span>
                                                    <IconButton
                                                        aria-label='Next puzzle'
                                                        disabled={position >= queue.length - 1}
                                                        onClick={() => setPosition((n) => n + 1)}
                                                    >
                                                        <NavigateNext />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>

                                        <Stack
                                            direction='row'
                                            sx={{ alignItems: 'center', gap: 1 }}
                                        >
                                            <Typography variant='overline' color='text.secondary'>
                                                Rating
                                            </Typography>
                                            <RatingEditor
                                                value={current.rating}
                                                onChange={(rating) =>
                                                    data.updatePuzzle(current.id, (p) => ({
                                                        ...p,
                                                        rating,
                                                    }))
                                                }
                                            />
                                            <Typography
                                                variant='body2'
                                                color='text.secondary'
                                                sx={{ ml: 1 }}
                                            >
                                                {current.white && current.black
                                                    ? `${current.white} – ${current.black}`
                                                    : ''}
                                            </Typography>
                                        </Stack>

                                        <Box>
                                            <Typography
                                                variant='overline'
                                                color='text.secondary'
                                                sx={{ display: 'block' }}
                                            >
                                                Tags
                                            </Typography>
                                            <PuzzleTagList
                                                puzzle={current}
                                                taxonomy={taxonomy}
                                                counts={counts}
                                                onChange={(update) =>
                                                    data.updatePuzzle(current.id, update)
                                                }
                                                onCreateTheme={(bucket, theme) =>
                                                    void data.createTheme(current.id, bucket, theme)
                                                }
                                                onDeleteTheme={
                                                    isAdmin
                                                        ? (bucket, theme) =>
                                                              void data.deleteTheme(bucket, theme)
                                                        : undefined
                                                }
                                            />
                                        </Box>

                                        {suggestionsHere.length > 0 && (
                                            <Box>
                                                <Typography
                                                    variant='overline'
                                                    color='text.secondary'
                                                    sx={{ display: 'block' }}
                                                >
                                                    Suggested by members
                                                </Typography>
                                                <Stack sx={{ gap: 1 }}>
                                                    {suggestionsHere.map((tag) => (
                                                        <Stack
                                                            key={`${tag.action}:${tag.name}`}
                                                            direction='row'
                                                            sx={{ alignItems: 'center', gap: 1 }}
                                                        >
                                                            {tag.action === 'remove' && (
                                                                <Typography
                                                                    variant='caption'
                                                                    color='error'
                                                                    sx={{ fontWeight: 600 }}
                                                                >
                                                                    Remove
                                                                </Typography>
                                                            )}
                                                            <Chip
                                                                size='small'
                                                                label={tag.name}
                                                                variant={
                                                                    tag.kind === 'bucket'
                                                                        ? 'filled'
                                                                        : 'outlined'
                                                                }
                                                                sx={{
                                                                    ...tagChipSx,
                                                                    textDecoration:
                                                                        tag.action === 'remove'
                                                                            ? 'line-through'
                                                                            : undefined,
                                                                    ...(tag.kind === 'bucket'
                                                                        ? {
                                                                              fontWeight: 600,
                                                                              bgcolor: alpha(
                                                                                  bucketColor(
                                                                                      tag.name,
                                                                                  ),
                                                                                  0.42,
                                                                              ),
                                                                          }
                                                                        : {
                                                                              borderColor:
                                                                                  themeOutline,
                                                                          }),
                                                                }}
                                                            />
                                                            <Typography
                                                                variant='body2'
                                                                color='text.secondary'
                                                                sx={{ flexGrow: 1 }}
                                                            >
                                                                {tag.count}{' '}
                                                                {tag.count === 1
                                                                    ? 'person'
                                                                    : 'people'}
                                                                : {tag.suggestedBy.join(', ')}
                                                            </Typography>
                                                            <Tooltip
                                                                title={`${tag.action === 'remove' ? 'Remove' : 'Add'} ${tag.name}`}
                                                            >
                                                                <IconButton
                                                                    size='small'
                                                                    color='success'
                                                                    aria-label={
                                                                        tag.action === 'remove'
                                                                            ? `Accept removing ${tag.name}`
                                                                            : `Accept ${tag.name}`
                                                                    }
                                                                    onClick={() =>
                                                                        void resolve(current.id, {
                                                                            accept: [tag.name],
                                                                        })
                                                                    }
                                                                >
                                                                    <Check fontSize='small' />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title='Dismiss'>
                                                                <IconButton
                                                                    size='small'
                                                                    aria-label={`Dismiss ${tag.name}`}
                                                                    onClick={() =>
                                                                        void resolve(current.id, {
                                                                            reject: [tag.name],
                                                                        })
                                                                    }
                                                                >
                                                                    <Close fontSize='small' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}

                                        <Button
                                            variant='contained'
                                            endIcon={<ArrowForward />}
                                            disabled={position >= queue.length - 1}
                                            onClick={() => setPosition((n) => n + 1)}
                                        >
                                            Done, next puzzle
                                        </Button>

                                        <CommonTags
                                            puzzle={current}
                                            taxonomy={taxonomy}
                                            puzzles={puzzles}
                                            onChange={(update) =>
                                                data.updatePuzzle(current.id, update)
                                            }
                                        />
                                    </Stack>
                                </CardContent>
                            ),
                        },
                    ]}
                />
            )}

            <Snackbar
                open={!!data.notice || !!error}
                autoHideDuration={8000}
                onClose={() => {
                    data.setNotice(undefined);
                    setError(undefined);
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={data.notice?.severity ?? 'error'}>
                    {data.notice?.message ?? error}
                </Alert>
            </Snackbar>
        </Container>
    );
}
