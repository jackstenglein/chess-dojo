'use client';

import {
    ContributorStatusResponse,
    matchesFilters,
    PuzzlebasePuzzle,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { puzzlesToPgn } from '@jackstenglein/chess-dojo-common/src/puzzlebase/exportPgn';
import {
    Add,
    Clear,
    Download,
    GridView,
    LocalOffer,
    PlayArrow,
    TableRows,
    Tune,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { AddPuzzlesDialog } from './AddPuzzlesDialog';
import { AdminLogPanel } from './AdminLogPanel';
import { ApplicationsPanel } from './ApplicationsPanel';
import { bucketColor, tagChipSx } from './bucketStyle';
import { BucketThemeMenu } from './BucketThemeMenu';
import { downloadText } from './downloadFile';
import { EditPuzzleDialog } from './EditPuzzleDialog';
import { HeaderStat } from './HeaderStat';
import { Leaderboard } from './Leaderboard';
import { PopularPuzzles } from './PopularPuzzles';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { PuzzleCard } from './PuzzleCard';
import { PuzzleTable } from './PuzzleTable';
import { RatingBands } from './RatingBands';
import { countRatingBins, ratingBinIndex } from './ratingBins';
import { removedTags } from './removedTags';
import { countTags } from './tagCounts';
import { usePuzzlebaseData } from './usePuzzlebaseData';

type SortKey = 'newest' | 'easiest' | 'hardest';
type ViewMode = 'table' | 'grid';

interface PuzzlebaseContentProps {
    client: PuzzlebaseClient;
    /** The signed-in user's standing. Admins also get the applications panel. */
    status: ContributorStatusResponse;
}

/**
 * The Dojo PuzzleBase for Puzzle Contributors and admins: every puzzle, filterable by bucket,
 * theme and rating band, and editable in place.
 */
export function PuzzlebaseContent({ client, status }: PuzzlebaseContentProps) {
    const {
        puzzles,
        taxonomy,
        leaderboard,
        loadState,
        loadError,
        reload,
        notice,
        setNotice,
        updatePuzzle: savePuzzle,
        createTheme,
        addPuzzles,
    } = usePuzzlebaseData(client);
    const [adding, setAdding] = useState(false);
    // How many puzzles have tags waiting for review, for the badge on the Review tags button.
    const [pendingReviews, setPendingReviews] = useState(0);
    useEffect(() => {
        let cancelled = false;
        void Promise.resolve()
            .then(() => client.listSuggestions())
            .then((result) => {
                if (!cancelled) setPendingReviews(result.length);
            })
            .catch(() => {
                // The badge is a nicety. The button works without it.
            });
        return () => {
            cancelled = true;
        };
    }, [client]);
    const [filterBuckets, setFilterBuckets] = useState<string[]>([]);
    const [filterThemes, setFilterThemes] = useState<string[]>([]);
    const [filterBands, setFilterBands] = useState<number[]>([]);
    const [sort, setSort] = useState<SortKey>('newest');
    const [view, setView] = useLocalStorage<ViewMode>('dojo-puzzlebase.view', 'table', {
        initializeWithValue: false,
    });

    // The puzzle whose FEN and solution are being edited.
    const [editingId, setEditingId] = useState<string>();

    // The last tag removal, so it can be undone.
    const [undo, setUndo] = useState<{
        id: string;
        removed: string[];
        buckets: string[];
        themes: string[];
    }>();

    const buckets = Object.keys(taxonomy.buckets);

    // Puzzles matching the bucket and theme filters. The rating bands count these, so the bars
    // show what each band would add.
    const tagMatches = useMemo(
        () =>
            puzzles.filter((p) =>
                matchesFilters(p, { buckets: filterBuckets, themes: filterThemes }),
            ),
        [puzzles, filterBuckets, filterThemes],
    );

    const bandCounts = useMemo(
        () => countRatingBins(tagMatches.map((p) => p.rating)),
        [tagMatches],
    );

    const filtered = useMemo(() => {
        const result = tagMatches.filter(
            (p) => filterBands.length === 0 || filterBands.includes(ratingBinIndex(p.rating)),
        );
        if (sort === 'easiest') result.sort((a, b) => a.rating - b.rating);
        if (sort === 'hardest') result.sort((a, b) => b.rating - a.rating);
        if (sort === 'newest') result.sort((a, b) => b.id.localeCompare(a.id));
        return result;
    }, [tagMatches, filterBands, sort]);

    const tagCounts = useMemo(() => countTags(puzzles), [puzzles]);
    const editingPuzzle = puzzles.find((p) => p.id === editingId);

    const contributors = new Set(puzzles.map((p) => p.annotator)).size;
    const hasFilters =
        filterBuckets.length > 0 || filterThemes.length > 0 || filterBands.length > 0;

    const toggle = <T,>(list: T[], value: T): T[] =>
        list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

    /**
     * Applies an update to a puzzle and saves it. If the update removes any tags, offers to undo it.
     */
    const updatePuzzle = (id: string, update: (p: PuzzlebasePuzzle) => PuzzlebasePuzzle) => {
        const before = puzzles.find((p) => p.id === id);
        if (before) {
            const removed = removedTags(before, update(before));
            if (removed.length > 0) {
                setUndo({ id, removed, buckets: before.buckets, themes: before.themes });
            }
        }
        savePuzzle(id, update);
    };

    const undoRemoval = () => {
        if (undo) {
            savePuzzle(undo.id, (p) => ({ ...p, buckets: undo.buckets, themes: undo.themes }));
        }
        setUndo(undefined);
    };

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Container maxWidth='xl' sx={{ py: { xs: 3, md: 4 } }}>
                    <Stack
                        sx={{
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: 3,
                            justifyContent: 'space-between',
                            alignItems: { md: 'flex-end' },
                        }}
                    >
                        <Stack sx={{ gap: 2 }}>
                            <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                                Dojo PuzzleBase
                            </Typography>
                            <Stack direction='row' sx={{ gap: 4 }}>
                                <HeaderStat label='Puzzles'>{puzzles.length}</HeaderStat>
                                <HeaderStat label='Contributors'>{contributors}</HeaderStat>
                            </Stack>
                            <Stack direction='row' sx={{ gap: 1.5 }}>
                                <Button
                                    variant='contained'
                                    startIcon={<Add />}
                                    onClick={() => setAdding(true)}
                                >
                                    Add puzzles
                                </Button>
                                <Button
                                    component={Link}
                                    href='/puzzles/train'
                                    variant='outlined'
                                    startIcon={<PlayArrow />}
                                >
                                    Train
                                </Button>
                                <Button
                                    component={Link}
                                    href='/puzzles/base/review'
                                    variant='outlined'
                                    color='inherit'
                                    startIcon={<LocalOffer />}
                                >
                                    Review tags
                                    {pendingReviews > 0 && (
                                        <Chip
                                            size='small'
                                            color='primary'
                                            label={pendingReviews}
                                            sx={{ ml: 1, height: 20 }}
                                        />
                                    )}
                                </Button>
                                <Button
                                    color='inherit'
                                    startIcon={<Download />}
                                    onClick={() =>
                                        downloadText(
                                            `dojo-puzzlebase-${new Date().toISOString().slice(0, 10)}.pgn`,
                                            puzzlesToPgn(puzzles),
                                        )
                                    }
                                >
                                    Export PGN
                                </Button>
                            </Stack>
                        </Stack>
                        <Stack sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                            <PopularPuzzles puzzles={puzzles} />
                            <Leaderboard entries={leaderboard} />
                        </Stack>
                    </Stack>
                </Container>
                <Stack direction='row' aria-hidden sx={{ height: 3 }}>
                    {buckets.map((bucket) => (
                        <Box key={bucket} sx={{ flex: 1, bgcolor: bucketColor(bucket) }} />
                    ))}
                </Stack>
            </Box>

            <Container maxWidth='xl' sx={{ py: 3 }}>
                <Stack sx={{ gap: 2.5 }}>
                    {status.isAdmin && <ApplicationsPanel client={client} />}
                    {status.isAdmin && <AdminLogPanel client={client} />}
                    {loadState === 'loading' && (
                        <Stack
                            sx={{ alignItems: 'center', py: 8 }}
                            role='status'
                            aria-label='Loading puzzles'
                        >
                            <CircularProgress />
                        </Stack>
                    )}
                    {loadState === 'error' && (
                        <Alert
                            severity='error'
                            action={
                                <Button color='inherit' size='small' onClick={() => void reload()}>
                                    Try again
                                </Button>
                            }
                        >
                            {loadError}
                        </Alert>
                    )}
                    {loadState === 'ready' && (
                        <>
                            <Paper variant='outlined' sx={{ p: 2 }}>
                                <Stack sx={{ gap: 2 }}>
                                    <Stack
                                        direction='row'
                                        sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
                                    >
                                        {buckets.map((bucket) => {
                                            const selected = filterBuckets.includes(bucket);
                                            const color = bucketColor(bucket);
                                            return (
                                                <Chip
                                                    key={bucket}
                                                    variant='outlined'
                                                    icon={
                                                        <Box
                                                            component='span'
                                                            sx={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: '50%',
                                                                bgcolor: color,
                                                                ml: '10px !important',
                                                                mr: '-2px !important',
                                                            }}
                                                        />
                                                    }
                                                    label={
                                                        <>
                                                            {bucket}{' '}
                                                            <Box
                                                                component='span'
                                                                sx={{
                                                                    color: 'text.secondary',
                                                                    fontVariantNumeric:
                                                                        'tabular-nums',
                                                                }}
                                                            >
                                                                {tagCounts.buckets[bucket] ?? 0}
                                                            </Box>
                                                        </>
                                                    }
                                                    onClick={() =>
                                                        setFilterBuckets((prev) =>
                                                            toggle(prev, bucket),
                                                        )
                                                    }
                                                    sx={{
                                                        ...tagChipSx,
                                                        height: 28,
                                                        fontWeight: 600,
                                                        borderColor: selected ? color : 'divider',
                                                        bgcolor: selected
                                                            ? alpha(color, 0.16)
                                                            : undefined,
                                                        '&:hover': { bgcolor: alpha(color, 0.12) },
                                                    }}
                                                />
                                            );
                                        })}
                                        <BucketThemeMenu
                                            taxonomy={taxonomy}
                                            selectedBuckets={filterBuckets}
                                            selectedThemes={filterThemes}
                                            counts={tagCounts}
                                            onToggleBucket={(bucket) =>
                                                setFilterBuckets((prev) => toggle(prev, bucket))
                                            }
                                            onToggleTheme={(theme) =>
                                                setFilterThemes((prev) => toggle(prev, theme))
                                            }
                                            renderTrigger={({ onClick }) => (
                                                <Button
                                                    variant='outlined'
                                                    color='inherit'
                                                    size='small'
                                                    startIcon={<Tune />}
                                                    onClick={onClick}
                                                    sx={{
                                                        borderColor: 'divider',
                                                        height: 28,
                                                        textTransform: 'none',
                                                    }}
                                                >
                                                    Themes
                                                </Button>
                                            )}
                                        />
                                        {filterThemes.map((theme) => (
                                            <Chip
                                                key={theme}
                                                size='small'
                                                variant='outlined'
                                                label={theme}
                                                onDelete={() =>
                                                    setFilterThemes((prev) => toggle(prev, theme))
                                                }
                                                sx={{
                                                    ...tagChipSx,
                                                    height: 28,
                                                    borderColor: 'divider',
                                                }}
                                            />
                                        ))}
                                    </Stack>

                                    <RatingBands
                                        counts={bandCounts}
                                        selected={filterBands}
                                        onToggle={(band) =>
                                            setFilterBands((prev) => toggle(prev, band))
                                        }
                                    />
                                </Stack>
                            </Paper>

                            <Stack
                                direction='row'
                                sx={{
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                }}
                            >
                                <Stack direction='row' sx={{ alignItems: 'center', gap: 2 }}>
                                    <Typography variant='body2' color='text.secondary'>
                                        Showing {filtered.length} of {puzzles.length} puzzles
                                    </Typography>
                                    {hasFilters && (
                                        <Button
                                            size='small'
                                            startIcon={<Clear />}
                                            onClick={() => {
                                                setFilterBuckets([]);
                                                setFilterThemes([]);
                                                setFilterBands([]);
                                            }}
                                        >
                                            Clear filters
                                        </Button>
                                    )}
                                </Stack>
                                <Stack direction='row' sx={{ gap: 1.5, alignItems: 'center' }}>
                                    <Select
                                        size='small'
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value)}
                                        sx={{ minWidth: 140 }}
                                    >
                                        <MenuItem value='newest'>Newest</MenuItem>
                                        <MenuItem value='easiest'>Easiest first</MenuItem>
                                        <MenuItem value='hardest'>Hardest first</MenuItem>
                                    </Select>
                                    <ToggleButtonGroup
                                        size='small'
                                        exclusive
                                        value={view}
                                        onChange={(_, v: ViewMode | null) => v && setView(v)}
                                        aria-label='View'
                                    >
                                        <ToggleButton value='table' aria-label='Table view'>
                                            <TableRows fontSize='small' />
                                        </ToggleButton>
                                        <ToggleButton value='grid' aria-label='Grid view'>
                                            <GridView fontSize='small' />
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Stack>
                            </Stack>

                            {filtered.length === 0 ? (
                                <Stack sx={{ alignItems: 'center', py: 8, gap: 0.5 }}>
                                    {puzzles.length === 0 ? (
                                        <>
                                            <Typography variant='h6'>No puzzles yet</Typography>
                                            <Typography color='text.secondary'>
                                                Add the first one with the button above.
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <Typography variant='h6'>
                                                No puzzles match every filter
                                            </Typography>
                                            <Typography color='text.secondary'>
                                                Every selected bucket and theme has to be on the
                                                puzzle.
                                            </Typography>
                                        </>
                                    )}
                                </Stack>
                            ) : view === 'table' ? (
                                <PuzzleTable
                                    puzzles={filtered}
                                    taxonomy={taxonomy}
                                    counts={tagCounts}
                                    onChange={updatePuzzle}
                                    onCreateTheme={createTheme}
                                    onEdit={(puzzle) => setEditingId(puzzle.id)}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gap: 2,
                                        gridTemplateColumns:
                                            'repeat(auto-fill, minmax(280px, 1fr))',
                                    }}
                                >
                                    {filtered.map((puzzle) => (
                                        <PuzzleCard
                                            key={puzzle.id}
                                            puzzle={puzzle}
                                            taxonomy={taxonomy}
                                            counts={tagCounts}
                                            onChange={(update) => updatePuzzle(puzzle.id, update)}
                                            onCreateTheme={(bucket, theme) =>
                                                createTheme(puzzle.id, bucket, theme)
                                            }
                                            onEdit={() => setEditingId(puzzle.id)}
                                        />
                                    ))}
                                </Box>
                            )}
                        </>
                    )}
                </Stack>
            </Container>

            {editingPuzzle && (
                <EditPuzzleDialog
                    key={editingPuzzle.id}
                    puzzle={editingPuzzle}
                    onClose={() => setEditingId(undefined)}
                    onSave={(fen, solutionPgn) =>
                        updatePuzzle(editingPuzzle.id, (p) => ({ ...p, fen, solutionPgn }))
                    }
                />
            )}

            {adding && (
                <AddPuzzlesDialog
                    client={client}
                    taxonomy={taxonomy}
                    onClose={() => setAdding(false)}
                    onAdded={(added, notes) => {
                        addPuzzles(added);
                        if (notes.length > 0) {
                            setNotice({ severity: 'warning', message: notes.join(' ') });
                        }
                    }}
                />
            )}

            <Snackbar
                open={!!notice}
                autoHideDuration={8000}
                onClose={(_, reason) => {
                    if (reason !== 'clickaway') setNotice(undefined);
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={notice?.severity ?? 'error'} onClose={() => setNotice(undefined)}>
                    {notice?.message}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!undo}
                autoHideDuration={8000}
                onClose={(_, reason) => {
                    if (reason !== 'clickaway') setUndo(undefined);
                }}
                message={undo ? `Removed ${undo.removed.join(', ')} from #${undo.id}` : ''}
                slotProps={{
                    content: {
                        sx: {
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            border: 1,
                            borderColor: 'divider',
                            backgroundImage: 'none',
                        },
                    },
                }}
                action={
                    <Button color='primary' size='small' onClick={undoRemoval}>
                        Undo
                    </Button>
                }
            />
        </Box>
    );
}
