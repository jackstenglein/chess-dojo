'use client';

import { Link } from '@/components/navigation/Link';
import Avatar from '@/profile/Avatar';
import { WcLeaderboard } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import {
    Alert,
    Box,
    Button,
    IconButton,
    Paper,
    Popover,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export type GuessState =
    | { kind: 'signed-out' }
    | { kind: 'game-over' }
    | { kind: 'not-live' }
    | {
          kind: 'open';
          moveLabel: string;
          guessSan?: string;
          saving: boolean;
          error?: string;
          /** Senseis move pieces for analysis, so they hold Alt to guess. */
          altToGuess?: boolean;
      };

interface GuessPanelProps {
    state: GuessState;
    onGoLive: () => void;
    /** Right guesses and moves guessed among the moves played. */
    score?: { correct: number; guessed: number };
}

export function GuessPanel({ state, onGoLive, score }: GuessPanelProps) {
    // Once hidden, the instructions stay hidden; the ⓘ by the leaderboard has them all.
    const [hideHowTo, setHideHowTo] = useLocalStorage('wcLive.hideHowTo', false);
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
                    {!hideHowTo && (
                        <Stack direction='row' sx={{ mt: 1, alignItems: 'flex-start' }}>
                            <Typography variant='body2' sx={{ flexGrow: 1 }}>
                                {state.altToGuess ? (
                                    <>
                                        Hold <b>Alt</b> and move a piece to guess
                                    </>
                                ) : (
                                    'Drag a piece to guess'
                                )}{' '}
                                <b>{state.moveLabel}</b>. You can change it until the move is
                                played.
                            </Typography>
                            <IconButton
                                size='small'
                                aria-label='Hide these instructions'
                                title='Hide these instructions'
                                onClick={() => setHideHowTo(true)}
                                sx={{ mt: -0.5, mr: -0.5 }}
                            >
                                <CloseIcon fontSize='small' />
                            </IconButton>
                        </Stack>
                    )}
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
            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='h6' sx={{ fontWeight: 900, letterSpacing: '0.02em' }}>
                    WHO&apos;S A GM TODAY
                </Typography>
                <HowItWorks />
            </Stack>
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

/** The ⓘ by the leaderboard: everything about guessing and the leaderboard. */
function HowItWorks() {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
        <>
            <IconButton
                size='small'
                aria-label='How guess the move works'
                title='How it works'
                onClick={(e) => setAnchor(e.currentTarget)}
            >
                <InfoIcon fontSize='small' />
            </IconButton>
            <Popover
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box sx={{ p: 2, maxWidth: 340 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
                        How guess the move works
                    </Typography>
                    <Typography variant='body2' component='div'>
                        <Box component='ul' sx={{ pl: 2.5, my: 0, '& li': { mb: 0.75 } }}>
                            <li>
                                Sign in, then drag a piece on the live board to guess the next move.
                                Senseis hold <b>Alt</b> while they move, since their moves go on the
                                analysis board.
                            </li>
                            <li>
                                Change your guess as often as you like until the move is played.
                                Move 1 is open until the game starts.
                            </li>
                            <li>Every move you guess right is a point, move 1 included.</li>
                            <li>
                                Each game has its own leaderboard. Ties share a place. You are
                                highlighted if you are on it.
                            </li>
                            <li>Moves you guessed right turn green in the notation.</li>
                        </Box>
                    </Typography>
                </Box>
            </Popover>
        </>
    );
}
