'use client';

import { Link } from '@/components/navigation/Link';
import Avatar from '@/profile/Avatar';
import { WcLeaderboard } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { Alert, Box, Button, IconButton, Paper, Popover, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
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
    // Someone who has guessed once knows how it works, so a guess hides them too.
    const [hideHowTo, setHideHowTo] = useLocalStorage('wcLive.hideHowTo', false);
    const hasGuessed = (score?.guessed ?? 0) > 0 || (state.kind === 'open' && !!state.guessSan);
    useEffect(() => {
        if (hasGuessed) {
            setHideHowTo(true);
        }
    }, [hasGuessed, setHideHowTo]);
    return (
        <Paper
            elevation={8}
            data-testid='guess-panel'
            sx={{ p: 2, border: 2, borderColor: 'primary.main', borderRadius: 2 }}
        >
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
    /** About six players in view, the rest scroll, so what is under it stays in view. */
    compact?: boolean;
}

const TOP = 50;

/** Gold, silver and bronze for the first three places. */
const MEDALS = ['#f4c430', '#c0c6cc', '#cd8a4f'];

/** "WHO'S A GM TODAY": right guesses in one game, move 1 included. */
export function Leaderboard({ gameName, leaderboard, username, compact }: LeaderboardProps) {
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
        const medal = MEDALS[ranks[i] - 1];
        return (
            <Stack
                key={e.username}
                direction='row'
                spacing={1.25}
                data-testid='leaderboard-row'
                sx={{
                    alignItems: 'center',
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: me ? 'action.selected' : undefined,
                    '&:hover': { bgcolor: me ? 'action.selected' : 'action.hover' },
                }}
            >
                <Box
                    sx={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        bgcolor: medal ?? 'transparent',
                        color: medal ? '#1a1a1a' : 'text.secondary',
                    }}
                >
                    {ranks[i]}
                </Box>
                <Avatar username={e.username} displayName={e.displayName} size={26} />
                <Typography
                    noWrap
                    sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        fontWeight: me ? 800 : 600,
                        fontSize: '0.9rem',
                    }}
                >
                    <Link href={`/profile/${e.username}`} sx={{ color: 'text.primary' }}>
                        {e.username}
                    </Link>
                </Typography>
                <Box
                    sx={{
                        flexShrink: 0,
                        minWidth: 32,
                        px: 1,
                        py: 0.25,
                        borderRadius: 5,
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        fontVariantNumeric: 'tabular-nums',
                        bgcolor: 'action.hover',
                    }}
                    title={`${e.correct} of ${e.guessed} moves guessed right`}
                >
                    {e.correct}
                </Box>
            </Stack>
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
                <Stack
                    spacing={0.25}
                    sx={{
                        maxHeight: compact ? 248 : { xs: 420, lg: 260 },
                        overflowY: 'auto',
                        mt: 1.5,
                        mx: -1,
                    }}
                >
                    {shown.map((_, i) => row(i))}
                    {myIndex >= TOP && (
                        <>
                            <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ textAlign: 'center' }}
                            >
                                ⋯
                            </Typography>
                            {row(myIndex)}
                        </>
                    )}
                </Stack>
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
