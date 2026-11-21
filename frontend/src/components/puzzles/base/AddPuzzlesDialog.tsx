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
import { splitPgnFile } from '@jackstenglein/chess-dojo-common/src/puzzlebase/splitPgnFile';
import { UploadFile } from '@mui/icons-material';
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
import { useMemo, useRef, useState } from 'react';
import { bucketColor, tagChipSx } from './bucketStyle';
import { checkPuzzlePgn } from './editPuzzle';
import { PgnGuide } from './PgnGuide';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage, errorStatus } from './puzzlebaseErrors';
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

type Source = 'pgn' | 'file' | 'study';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

/**
 * The biggest PGN file that can be uploaded, in bytes, and the most games it can hold. Each game
 * is sent on its own, one after another, so a few hundred take a minute or two. The cap stops a
 * whole database of games being sent by mistake.
 */
const MAX_FILE_BYTES = 2_000_000;
const MAX_FILE_GAMES = 500;

/** Returns a game's title from its [Event] header, for reporting games that were skipped. */
const gameTitle = (pgn: string) => /\[Event "([^"]*)"\]/.exec(pgn)?.[1];

const monoSx = { fontFamily: 'monospace', fontSize: '0.85rem' } as const;

/**
 * Adds puzzles: one from a pasted PGN, one per game of an uploaded PGN file, or one per chapter
 * of a public Lichess study.
 * Tags can be added on the list afterwards.
 */
export function AddPuzzlesDialog({ client, taxonomy, onClose, onAdded }: AddPuzzlesDialogProps) {
    const [tab, setTab] = useState<Source>('pgn');
    const [file, setFile] = useState<{ name: string; text: string }>();
    const [dragging, setDragging] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const [pgn, setPgn] = useState('');
    const [study, setStudy] = useState('');
    const [ratingText, setRatingText] = useState('1000');
    const [working, setWorking] = useState(false);
    /** How many games of an uploaded file have been sent so far. */
    const [progress, setProgress] = useState<number>();
    const [error, setError] = useState<string>();
    const [imported, setImported] = useState<ImportLichessStudyResponse>();

    const rating = parseRating(ratingText);
    const fileGameTexts = useMemo(() => (file ? splitPgnFile(file.text) : []), [file]);
    const fileGames = fileGameTexts.length;
    const tooManyGames = fileGames > MAX_FILE_GAMES;

    const readFile = (picked: File | undefined) => {
        if (!picked) return;
        setError(undefined);
        if (picked.size > MAX_FILE_BYTES) {
            setFile(undefined);
            setError('That file is too big. Split it into files of under 2 MB.');
            return;
        }
        picked
            .text()
            .then((text) => setFile({ name: picked.name, text }))
            .catch(() => setError('Could not read that file.'));
    };
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
        (tab === 'pgn'
            ? check.ok
            : tab === 'file'
              ? fileGames > 0 && !tooManyGames
              : study.trim().length > 0) &&
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
            } else if (tab === 'file') {
                const result = await addFileGames(ratingToUse);
                onAdded(result.puzzles, []);
                setImported(result);
            } else {
                const result = await client.importStudy({ study, rating: ratingToUse });
                onAdded(result.puzzles, []);
                setImported(result);
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorking(false);
            setProgress(undefined);
        }
    };

    /**
     * Adds each game of the uploaded file as its own puzzle, in order. A game the server turns down
     * as not a puzzle is skipped and reported. Any other failure (signed out, server down) stops
     * the upload, and the games not yet sent are reported as not added.
     */
    const addFileGames = async (fallbackRating: number): Promise<ImportLichessStudyResponse> => {
        const result: ImportLichessStudyResponse = { puzzles: [], skipped: [], warnings: [] };
        for (const [index, game] of fileGameTexts.entries()) {
            const chapter = index + 1;
            const title = gameTitle(game);
            setProgress(index);
            try {
                const { puzzle, warnings } = await client.createPuzzle({
                    pgn: game,
                    rating: fallbackRating,
                    themes: [],
                    buckets: [],
                });
                result.puzzles.push(puzzle);
                for (const message of warnings) {
                    result.warnings.push({ chapter, title, message });
                }
            } catch (err) {
                result.skipped.push({ chapter, title, reason: errorMessage(err) });
                if (errorStatus(err) !== 400) {
                    fileGameTexts.slice(index + 1).forEach((rest, i) =>
                        result.skipped.push({
                            chapter: chapter + 1 + i,
                            title: gameTitle(rest),
                            reason: 'Not added: the upload stopped at an earlier error.',
                        }),
                    );
                    break;
                }
            }
        }
        return result;
    };

    if (imported) {
        const unit = tab === 'file' ? 'Game' : 'Chapter';
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
                                            {unit} {note.chapter}
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
                                    Skipped {unit.toLowerCase()}s · {imported.skipped.length}
                                </Typography>
                                {imported.skipped.map((chapter) => (
                                    <Alert key={chapter.chapter} severity='warning' icon={false}>
                                        <strong>
                                            {unit} {chapter.chapter}
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
                    onChange={(_, value: Source) => {
                        setTab(value);
                        setError(undefined);
                    }}
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value='pgn' label='Paste a PGN' />
                    <Tab value='file' label='Upload a file' />
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
                                        <Box sx={{ height: '100%', opacity: 0.35 }}>
                                            <Board
                                                config={{
                                                    fen: EMPTY_BOARD_FEN,
                                                    viewOnly: true,
                                                    coordinates: false,
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                                {!check.ok && (
                                    <Typography variant='body2' color='text.secondary'>
                                        The puzzle's position shows here once the PGN is valid.
                                    </Typography>
                                )}
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
                    ) : tab === 'file' ? (
                        <Stack
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragging(false);
                                readFile(e.dataTransfer.files[0]);
                            }}
                            sx={{
                                alignItems: 'center',
                                gap: 1.5,
                                py: 4,
                                px: 2,
                                border: 2,
                                borderStyle: 'dashed',
                                borderRadius: 2,
                                borderColor: dragging ? 'primary.main' : 'divider',
                                bgcolor: dragging ? 'action.hover' : undefined,
                                textAlign: 'center',
                            }}
                        >
                            <UploadFile sx={{ fontSize: 40, color: 'text.secondary' }} />
                            {file ? (
                                <>
                                    <Typography sx={{ fontWeight: 'bold' }}>{file.name}</Typography>
                                    <Typography
                                        color={
                                            fileGames > 0 && !tooManyGames
                                                ? 'text.secondary'
                                                : 'error'
                                        }
                                    >
                                        {fileGames === 0
                                            ? 'No games found in this file.'
                                            : tooManyGames
                                              ? `${fileGames} games found. You can upload at most ${MAX_FILE_GAMES} at a time.`
                                              : `${fileGames} ${fileGames === 1 ? 'game' : 'games'} found`}
                                    </Typography>
                                </>
                            ) : (
                                <Typography color='text.secondary'>
                                    Drop a .pgn file here
                                </Typography>
                            )}
                            <Button variant='outlined' onClick={() => fileInput.current?.click()}>
                                {file ? 'Choose another file' : 'Choose a file'}
                            </Button>
                            <input
                                ref={fileInput}
                                type='file'
                                accept='.pgn,.txt,application/x-chess-pgn,text/plain'
                                hidden
                                data-testid='pgn-file-input'
                                onChange={(e) => {
                                    readFile(e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                            />
                            <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ maxWidth: 520 }}
                            >
                                Every game in the file becomes its own puzzle, so each needs a [FEN]
                                header. Games that are not puzzles are skipped and listed
                                afterwards.
                            </Typography>
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
                                    : tab === 'file'
                                      ? 'Used for games that do not set their own rating.'
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
                    {tab === 'pgn'
                        ? 'Add puzzle'
                        : tab === 'file'
                          ? progress !== undefined
                              ? `Adding ${progress + 1} of ${fileGames}…`
                              : fileGames > 0
                                ? `Import ${fileGames} ${fileGames === 1 ? 'puzzle' : 'puzzles'}`
                                : 'Import file'
                          : 'Import study'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
