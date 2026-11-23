'use client';

import { useAuth } from '@/auth/Auth';
import PgnBoard from '@/board/pgn/PgnBoard';
import {
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { canManagePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/permissions';
import { ArrowBack, Edit } from '@mui/icons-material';
import {
    Alert,
    Button,
    CircularProgress,
    Container,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PUZZLE_COORDINATE_SIZE } from '../settings/puzzleSettingsKeys';
import { DeletePuzzleButton } from './DeletePuzzleButton';
import { splitPuzzlePgn, validatePuzzleEdit } from './editPuzzle';
import { EditSolutionDialog } from './EditSolutionDialog';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage, errorStatus } from './puzzlebaseErrors';
import { PuzzlebaseGate } from './PuzzlebaseGate';
import { diffToUpdate } from './puzzleDiff';
import { PuzzleInfoPanel } from './PuzzleInfoPanel';

/**
 * A single puzzle: the details and the solution, stepped through on a board. No solving. Like the
 * rest of the puzzlebase, it is only for Puzzle Contributors and admins.
 */
export function PuzzleDetailPage({ id }: { id: string }) {
    return (
        <PuzzlebaseGate>
            {({ client, status }) => (
                <PuzzleDetail client={client} id={id} isAdmin={status.isAdmin} />
            )}
        </PuzzlebaseGate>
    );
}

function PuzzleDetail({
    client,
    id,
    isAdmin,
}: {
    client: PuzzlebaseClient;
    id: string;
    isAdmin: boolean;
}) {
    const { user } = useAuth();
    const router = useRouter();
    const [loaded, setLoaded] = useState<{
        puzzle: PuzzlebasePuzzle;
        taxonomy: PuzzlebaseTaxonomy;
    }>();
    const [error, setError] = useState<{ notFound: boolean; message: string }>();
    const [editing, setEditing] = useState(false);
    const [saveError, setSaveError] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        Promise.all([client.getPuzzle(id), client.getTaxonomy()])
            .then(([puzzle, taxonomy]) => {
                if (!cancelled) setLoaded({ puzzle, taxonomy });
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError({ notFound: errorStatus(err) === 404, message: errorMessage(err) });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [client, id]);

    if (error) {
        return (
            <Container sx={{ py: 6 }}>
                <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
                    {error.notFound ? (
                        <Typography variant='h5'>Puzzle not found</Typography>
                    ) : (
                        <Alert severity='error'>{error.message}</Alert>
                    )}
                    <Button component={Link} href='/puzzles/base' startIcon={<ArrowBack />}>
                        Back to the PuzzleBase
                    </Button>
                </Stack>
            </Container>
        );
    }

    if (!loaded) {
        return (
            <Stack sx={{ alignItems: 'center', py: 12 }} role='status' aria-label='Loading puzzle'>
                <CircularProgress />
            </Stack>
        );
    }

    const { puzzle, taxonomy } = loaded;

    const orientation = puzzle.fen.split(' ')[1] === 'b' ? 'black' : 'white';

    return (
        <Container maxWidth='xl' sx={{ py: 3 }}>
            <Stack sx={{ gap: 2.5 }}>
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <Button
                        component={Link}
                        href='/puzzles/base'
                        color='inherit'
                        startIcon={<ArrowBack />}
                    >
                        Dojo PuzzleBase
                    </Button>
                    {canManagePuzzle(puzzle, { username: user?.username ?? '', isAdmin }) && (
                        <Stack direction='row'>
                            <Tooltip title='Edit solution on a board'>
                                <IconButton
                                    aria-label={`Edit puzzle ${puzzle.id}`}
                                    onClick={() => setEditing(true)}
                                >
                                    <Edit />
                                </IconButton>
                            </Tooltip>
                            <DeletePuzzleButton
                                variant='icon'
                                puzzleId={puzzle.id}
                                onDelete={async () => {
                                    await client.deletePuzzle(puzzle.id);
                                    router.push('/puzzles/base');
                                }}
                            />
                        </Stack>
                    )}
                </Stack>

                {saveError && (
                    <Alert severity='error' onClose={() => setSaveError(undefined)}>
                        {saveError}
                    </Alert>
                )}

                <PgnBoard
                    key={puzzle.id}
                    pgn={puzzle.solutionPgn}
                    largeBoard
                    slotProps={{
                        pgnText: { hideResultDivider: true },
                        board: { defaultCoordinateSize: PUZZLE_COORDINATE_SIZE },
                    }}
                    showPlayerHeaders={false}
                    startOrientation={orientation}
                    underboardTabs={[]}
                    disableEngine
                    slots={{
                        beforePgnText: <PuzzleInfoPanel puzzle={puzzle} taxonomy={taxonomy} />,
                    }}
                />
            </Stack>

            {editing && (
                <EditSolutionDialog
                    puzzleId={puzzle.id}
                    fen={puzzle.fen}
                    movetext={splitPuzzlePgn(puzzle.solutionPgn).movetext}
                    headers={splitPuzzlePgn(puzzle.solutionPgn).headers}
                    onClose={() => setEditing(false)}
                    onApply={(movetext) => {
                        const result = validatePuzzleEdit(puzzle.fen, movetext, puzzle.solutionPgn);
                        if (!result.ok) {
                            setSaveError(result.error);
                            return;
                        }
                        const request = diffToUpdate(puzzle, {
                            ...puzzle,
                            solutionPgn: result.solutionPgn,
                        });
                        if (!request) return;
                        client
                            .updatePuzzle(request)
                            .then((saved) => setLoaded({ puzzle: saved, taxonomy }))
                            .catch((err: unknown) => setSaveError(errorMessage(err)));
                    }}
                />
            )}
        </Container>
    );
}
