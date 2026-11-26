'use client';

import { useAuth } from '@/auth/Auth';
import Board from '@/board/Board';
import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    findDuplicates,
    splitPuzzleMoves,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/duplicates';
import { canManagePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/permissions';
import { ArrowBack } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DeletePuzzleButton } from './DeletePuzzleButton';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';
import { PuzzlebaseGate } from './PuzzlebaseGate';

/** How many moves of each answer to show, to compare them at a glance. */
const MOVES_SHOWN = 4;

/**
 * Puzzles that start from the same position, so contributors can spot and remove duplicates.
 * Groups whose answers also start the same come first: those are almost surely the same puzzle.
 */
export function DuplicatesPage() {
    return (
        <PuzzlebaseGate>
            {({ client, status }) => <Duplicates client={client} isAdmin={status.isAdmin} />}
        </PuzzlebaseGate>
    );
}

function Duplicates({ client, isAdmin }: { client: PuzzlebaseClient; isAdmin: boolean }) {
    const { user } = useAuth();
    const [puzzles, setPuzzles] = useState<PuzzlebasePuzzle[]>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        client
            .listPuzzles()
            .then((list) => !cancelled && setPuzzles(list))
            .catch((err: unknown) => !cancelled && setError(errorMessage(err)));
        return () => {
            cancelled = true;
        };
    }, [client]);

    const groups = useMemo(() => (puzzles ? findDuplicates(puzzles) : []), [puzzles]);
    const caller = { username: user?.username ?? '', isAdmin };

    const remove = async (id: string) => {
        await client.deletePuzzle(id);
        setPuzzles((list) => list?.filter((p) => p.id !== id));
    };

    return (
        <Container maxWidth='lg' sx={{ py: 3 }}>
            <Stack sx={{ gap: 2.5 }}>
                <Button
                    component={Link}
                    href='/puzzles/base'
                    color='inherit'
                    startIcon={<ArrowBack />}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    Dojo PuzzleBase
                </Button>
                <Box>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Duplicates
                    </Typography>
                    <Typography color='text.secondary' sx={{ mt: 0.5 }}>
                        Puzzles that start from the same position with the same side to move.
                    </Typography>
                </Box>

                {error && <Alert severity='error'>{error}</Alert>}
                {!puzzles && !error && (
                    <Stack sx={{ alignItems: 'center', py: 6 }} role='status' aria-label='Loading'>
                        <CircularProgress />
                    </Stack>
                )}
                {puzzles && groups.length === 0 && (
                    <Alert severity='success'>No duplicates among {puzzles.length} puzzles.</Alert>
                )}
                {groups.length > 0 && (
                    <Typography color='text.secondary'>
                        {groups.length} {groups.length === 1 ? 'position is' : 'positions are'} used
                        by more than one puzzle.
                    </Typography>
                )}

                {groups.map((group) => {
                    const blackToMove = group.position.endsWith(' b');
                    return (
                        <Paper key={group.position} variant='outlined' sx={{ p: 2 }}>
                            <Stack sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 2.5 }}>
                                <Box sx={{ width: 160, flexShrink: 0 }}>
                                    <Box sx={{ width: 160, aspectRatio: '1 / 1' }}>
                                        <Board
                                            config={{
                                                fen: group.puzzles[0].fen,
                                                viewOnly: true,
                                                orientation: blackToMove ? 'black' : 'white',
                                            }}
                                        />
                                    </Box>
                                    <Chip
                                        size='small'
                                        color={group.sameFirstMove ? 'warning' : 'default'}
                                        label={
                                            group.sameFirstMove
                                                ? 'Same answer'
                                                : 'Different answers'
                                        }
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                                    <Table size='small'>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Puzzle</TableCell>
                                                <TableCell>Answer</TableCell>
                                                <TableCell>Tags</TableCell>
                                                <TableCell>Added by</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {group.puzzles.map((puzzle) => (
                                                <TableRow key={puzzle.id}>
                                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                        <Link href={`/puzzles/base/${puzzle.id}`}>
                                                            #{puzzle.id}
                                                        </Link>
                                                        <Typography
                                                            variant='caption'
                                                            color='text.secondary'
                                                            sx={{ display: 'block' }}
                                                        >
                                                            {puzzle.rating}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {splitPuzzleMoves(puzzle.solutionPgn)
                                                            .slice(0, MOVES_SHOWN)
                                                            .join(' ')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {[...puzzle.buckets, ...puzzle.themes].join(
                                                            ', ',
                                                        ) || '—'}
                                                    </TableCell>
                                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                        {puzzle.annotatorDisplayName}
                                                        <Typography
                                                            variant='caption'
                                                            color='text.secondary'
                                                            sx={{ display: 'block' }}
                                                        >
                                                            {new Date(
                                                                puzzle.createdAt,
                                                            ).toLocaleDateString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align='right'>
                                                        {canManagePuzzle(puzzle, caller) && (
                                                            <DeletePuzzleButton
                                                                variant='icon'
                                                                puzzleId={puzzle.id}
                                                                onDelete={() => remove(puzzle.id)}
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>
        </Container>
    );
}
