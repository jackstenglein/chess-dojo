'use client';

import { Link } from '@/components/navigation/Link';
import Avatar from '@/profile/Avatar';
import { WcLeaderboard } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

export type GuessState =
    | { kind: 'signed-out' }
    | { kind: 'game-over' }
    | { kind: 'not-live' }
    | { kind: 'open'; moveLabel: string; guessSan?: string; saving: boolean; error?: string };

interface GuessPanelProps {
    state: GuessState;
    onGoLive: () => void;
    /** Right guesses and moves guessed among the moves played. */
    score?: { correct: number; guessed: number };
}

export function GuessPanel({ state, onGoLive, score }: GuessPanelProps) {
    return (
        <Paper variant='outlined' sx={{ p: 2 }} data-testid='guess-panel'>
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                Guess the move
            </Typography>
            {state.kind === 'signed-out' && (
                <Typography variant='body2' sx={{ mt: 1 }}>
                    <Link
                        href={`/signin?redirectUri=${encodeURIComponent('/world-championship/live')}`}
                    >
                        Sign in
                    </Link>{' '}
                    to guess each move before it is played and get on the leaderboard.
                </Typography>
            )}
            {state.kind === 'game-over' && (
                <Typography variant='body2' sx={{ mt: 1 }}>
                    This game is over. Guessing opens again for the next game.
                </Typography>
            )}
            {state.kind === 'not-live' && (
                <Stack direction='row' spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                    <Typography variant='body2'>You can guess from the live position.</Typography>
                    <Button size='small' variant='contained' onClick={onGoLive}>
                        Go live
                    </Button>
                </Stack>
            )}
            {state.kind === 'open' && (
                <>
                    <Typography variant='body2' sx={{ mt: 1 }}>
                        Drag a piece to guess <b>{state.moveLabel}</b>. You can change it until the
                        move is played.
                    </Typography>
                    <Typography sx={{ mt: 1, fontSize: '1.25rem', fontWeight: 800 }}>
                        {state.saving
                            ? 'Saving…'
                            : state.guessSan
                              ? `Your guess: ${state.guessSan}`
                              : 'No guess yet'}
                    </Typography>
                    {state.error && (
                        <Alert severity='warning' sx={{ mt: 1 }}>
                            {state.error}
                        </Alert>
                    )}
                </>
            )}
            {score && score.guessed > 0 && (
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                    This game: {score.correct} of {score.guessed} guessed right
                </Typography>
            )}
        </Paper>
    );
}

interface LeaderboardProps {
    gameName: string;
    leaderboard?: WcLeaderboard;
    username?: string;
}

const TOP = 50;

/** "WHO'S A GM TODAY": right guesses in one game, move 1 included. */
export function Leaderboard({ gameName, leaderboard, username }: LeaderboardProps) {
    const entries = leaderboard?.entries ?? [];
    const myIndex = entries.findIndex((e) => e.username === username);
    const shown = entries.slice(0, TOP);

    // Ties share a rank.
    const ranks: number[] = [];
    entries.forEach((e, i) => {
        ranks.push(i > 0 && entries[i - 1].correct === e.correct ? ranks[i - 1] : i + 1);
    });

    const row = (i: number) => {
        const e = entries[i];
        const me = e.username === username;
        return (
            <TableRow key={e.username} selected={me}>
                <TableCell sx={{ width: 40 }}>{ranks[i]}</TableCell>
                <TableCell>
                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                        <Avatar username={e.username} displayName={e.displayName} size={24} />
                        <Link href={`/profile/${e.username}`}>{e.username}</Link>
                    </Stack>
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>
                    {e.correct}
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Paper variant='outlined' sx={{ p: 2 }} data-testid='wc-leaderboard'>
            <Typography variant='h6' sx={{ fontWeight: 900, letterSpacing: '0.02em' }}>
                WHO&apos;S A GM TODAY
            </Typography>
            <Typography variant='caption' color='text.secondary'>
                {gameName} · moves guessed right
                {leaderboard ? ` · after ${Math.ceil(leaderboard.plies / 2)} moves` : ''}
            </Typography>
            {entries.length === 0 ? (
                <Typography variant='body2' sx={{ mt: 1.5 }}>
                    No right guesses yet. Guess the next move to get on the board.
                </Typography>
            ) : (
                <Box sx={{ maxHeight: 420, overflowY: 'auto', mt: 1 }}>
                    <Table size='small' stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell align='right'>Right</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shown.map((_, i) => row(i))}
                            {myIndex >= TOP && row(myIndex)}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Paper>
    );
}
