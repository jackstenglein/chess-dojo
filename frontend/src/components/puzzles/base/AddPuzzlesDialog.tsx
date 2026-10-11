'use client';

import Board from '@/board/Board';
import {
    ImportLichessStudyResponse,
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    describeUnknownTag,
    resolveTagNames,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/pgnTags';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { bucketColor, tagChipSx } from './bucketStyle';
import { checkPuzzlePgn } from './editPuzzle';
import { PgnGuide } from './PgnGuide';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';
import { MAX_PUZZLE_RATING, parseRating } from './ratingBins';

interface AddPuzzlesDialogProps {
    client: PuzzlebaseClient;
    /** The real themes, so tags written in a PGN can be checked as it is pasted. */
    taxonomy: PuzzlebaseTaxonomy;
    onClose: () => void;
    /**
     * Called with the puzzles that were added, and anything in the PGN that was ignored. For a
     * study, the ignored things are shown in the dialog instead, so `notes` is empty.
     */
    onAdded: (puzzles: PuzzlebasePuzzle[], notes: string[]) => void;
}

const monoSx = { fontFamily: 'monospace', fontSize: '0.85rem' } as const;

/**
 * Adds puzzles: either one from a pasted PGN, or one per chapter of a public Lichess study.
 * Tags can be added on the list afterwards.
 */
export function AddPuzzlesDialog({ client, taxonomy, onClose, onAdded }: AddPuzzlesDialogProps) {
    const [tab, setTab] = useState<'pgn' | 'study'>('pgn');
    const [pgn, setPgn] = useState('');
    const [study, setStudy] = useState('');
    const [ratingText, setRatingText] = useState('1000');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string>();
    const [imported, setImported] = useState<ImportLichessStudyResponse>();

    const rating = parseRating(ratingText);
    const check = useMemo(() => checkPuzzlePgn(pgn), [pgn]);
    const blackToMove = check.ok && check.fen.split(' ')[1] === 'b';

    // What the PGN asks for, checked against the real themes as it is pasted.
    const pgnRating = check.ok ? check.rating : undefined;
    const found = useMemo(
        () => (check.ok ? resolveTagNames(taxonomy, check.tagNames) : undefined),
        [check, taxonomy],
    );
    const notes =
        check.ok && found ? [...check.problems, ...found.unknown.map(describeUnknownTag)] : [];
    const foundTags = found ? [...found.buckets, ...found.themes] : [];

    // A rating written in the PGN takes the place of the one typed here.
    const ratingFromPgn = tab === 'pgn' && pgnRating !== undefined;
    const ratingToUse = ratingFromPgn ? pgnRating : rating;

    const canAdd =
        ratingToUse !== undefined &&
        (tab === 'pgn' ? check.ok : study.trim().length > 0) &&
        !working;

    const add = async () => {
        if (ratingToUse === undefined) return;
        setWorking(true);
        setError(undefined);
        try {
            if (tab === 'pgn') {
                const { puzzle, warnings } = await client.createPuzzle({
                    pgn,
                    rating: ratingToUse,
                    themes: [],
                    buckets: [],
                });
                onAdded([puzzle], warnings);
                onClose();
            } else {
                const result = await client.importStudy({ study, rating: ratingToUse });
                onAdded(result.puzzles, []);
                setImported(result);
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorking(false);
        }
    };

    if (imported) {
        return (
            <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Import finished</DialogTitle>
                <DialogContent>
                    <Stack sx={{ gap: 2 }}>
                        <Typography>
                            Added {imported.puzzles.length}{' '}
                            {imported.puzzles.length === 1 ? 'puzzle' : 'puzzles'}
                            {imported.puzzles.length > 0 &&
                                ` (${imported.puzzles[0].id}${
                                    imported.puzzles.length > 1
                                        ? `–${imported.puzzles[imported.puzzles.length - 1].id}`
                                        : ''
                                })`}
                            .
                        </Typography>
                        {imported.warnings.length > 0 && (
                            <Stack sx={{ gap: 1 }}>
                                <Typography
                                    variant='overline'
                                    sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                                >
                                    Things that were left off · {imported.warnings.length}
                                </Typography>
                                {imported.warnings.map((note, i) => (
                                    <Alert key={i} severity='info' icon={false}>
                                        <strong>
                                            Chapter {note.chapter}
                                            {note.title ? `: ${note.title}` : ''}
                                        </strong>
                                        <br />
                                        {note.message}
                                    </Alert>
                                ))}
                            </Stack>
                        )}
                        {imported.skipped.length > 0 && (
                            <Stack sx={{ gap: 1 }}>
                                <Typography
                                    variant='overline'
                                    sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                                >
                                    Skipped chapters · {imported.skipped.length}
                                </Typography>
                                {imported.skipped.map((chapter) => (
                                    <Alert key={chapter.chapter} severity='warning' icon={false}>
                                        <strong>
                                            Chapter {chapter.chapter}
                                            {chapter.title ? `: ${chapter.title}` : ''}
                                        </strong>
                                        <br />
                                        {chapter.reason}
                                    </Alert>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant='contained' onClick={onClose}>
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open onClose={working ? undefined : onClose} fullWidth maxWidth='md'>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Add puzzles</DialogTitle>
            <DialogContent>
                <Tabs
                    value={tab}
                    onChange={(_, value: 'pgn' | 'study') => {
                        setTab(value);
                        setError(undefined);
                    }}
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value='pgn' label='Paste a PGN' />
                    <Tab value='study' label='Lichess study' />
                </Tabs>

                <Stack sx={{ gap: 2 }}>
                    {tab === 'pgn' && <PgnGuide onUse={setPgn} />}
                    {tab === 'pgn' ? (
                        <Stack sx={{ flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                            <TextField
                                label='Puzzle PGN'
                                value={pgn}
                                onChange={(e) => setPgn(e.target.value)}
                                error={pgn.trim() !== '' && !check.ok}
                                helperText={
                                    pgn.trim() !== '' && !check.ok
                                        ? check.error
                                        : 'Needs a [FEN] header with the starting position. The first main-line move is the answer. Optional: a comment before the first move like { tags: Fork, Sacrifice; rating: 1450 } sets the tags and rating.'
                                }
                                multiline
                                minRows={8}
                                maxRows={14}
                                slotProps={{ htmlInput: { sx: monoSx, spellCheck: false } }}
                                sx={{ flex: 1 }}
                            />
                            <Stack sx={{ width: { xs: '100%', md: 220 }, gap: 1 }}>
                                <Typography
                                    variant='overline'
                                    sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                                >
                                    Position
                                </Typography>
                                <Box sx={{ width: '100%', maxWidth: 220, aspectRatio: '1 / 1' }}>
                                    {check.ok ? (
                                        <Board
                                            key={check.fen}
                                            config={{
                                                fen: check.fen,
                                                viewOnly: true,
                                                orientation: blackToMove ? 'black' : 'white',
                                            }}
                                        />
                                    ) : (
                                        <Stack
                                            sx={{
                                                height: '100%',
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Typography variant='body2' color='text.secondary'>
                                                Paste a PGN
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>
                                {check.ok && check.players && (
                                    <Typography variant='body2' color='text.secondary'>
                                        {check.players}
                                    </Typography>
                                )}
                                {foundTags.length > 0 && (
                                    <Stack direction='row' sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                                        {foundTags.map((tag) => (
                                            <Chip
                                                key={tag}
                                                size='small'
                                                label={tag}
                                                variant='outlined'
                                                sx={{
                                                    ...tagChipSx,
                                                    borderColor: bucketColor(tag),
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                                {notes.map((note) => (
                                    <Alert key={note} severity='warning' sx={{ py: 0 }}>
                                        {note}
                                    </Alert>
                                ))}
                            </Stack>
                        </Stack>
                    ) : (
                        <TextField
                            label='Lichess study link'
                            placeholder='https://lichess.org/study/abcd1234'
                            value={study}
                            onChange={(e) => setStudy(e.target.value)}
                            helperText='The study must be public. Every chapter becomes its own puzzle, so each chapter needs a starting position. Chapters that are not puzzles are skipped and listed afterwards.'
                            fullWidth
                        />
                    )}

                    <TextField
                        label={tab === 'pgn' ? 'Rating' : 'Rating for every puzzle'}
                        type='number'
                        value={ratingText}
                        onChange={(e) => setRatingText(e.target.value)}
                        error={rating === undefined && !ratingFromPgn}
                        helperText={
                            ratingFromPgn
                                ? `The PGN sets this puzzle's rating to ${pgnRating}, so this is not used.`
                                : rating === undefined
                                  ? `A whole number from 0 to ${MAX_PUZZLE_RATING}.`
                                  : tab === 'study'
                                    ? 'Used for chapters that do not set their own rating.'
                                    : 'You can change it later.'
                        }
                        slotProps={{ htmlInput: { min: 0, max: MAX_PUZZLE_RATING, step: 50 } }}
                        sx={{ width: 220 }}
                    />

                    {error && <Alert severity='error'>{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button color='inherit' onClick={onClose} disabled={working}>
                    Cancel
                </Button>
                <Button variant='contained' disabled={!canAdd} onClick={add}>
                    {tab === 'pgn' ? 'Add puzzle' : 'Import study'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
