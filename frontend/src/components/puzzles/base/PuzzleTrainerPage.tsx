'use client';

import { useAuth } from '@/auth/Auth';
import { getCurrentRating } from '@/database/user';
import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    AttemptSubmission,
    TrainingTagSet,
    TrainQuery,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { AttemptScoring } from '@jackstenglein/chess-dojo-common/src/puzzlebase/scoring';
import { Alert, Box, Container, Snackbar, Stack } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TacticsTrainerPage } from '../tactics/TacticsTrainerPage';
import { TacticsPuzzle } from '../tactics/tacticsPuzzles';
import { PuzzleInfoPanel, PuzzleTagChips } from './PuzzleInfoPanel';
import { PuzzleVote } from './PuzzleVote';
import { ScoreSummary } from './ScoreSummary';
import { SuggestTagsButton } from './SuggestTagsButton';
import { TrainSetup } from './TrainSetup';
import { getPuzzlebaseClient, PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';
import { SessionLength, toTacticsPuzzles } from './trainingPuzzles';

/** How many recently played puzzles are kept out of the next session. */
const REMEMBERED_PUZZLES = 100;

/** More puzzles are fetched when this few are left. */
const TOP_UP_AT = 4;

/** How long to wait before trying to save an attempt a second time, in ms. */
const RETRY_DELAY_MS = 1500;

interface PuzzleTrainerPageProps {
    /** Where puzzles come from and attempts go. Defaults to the real API. */
    client?: PuzzlebaseClient;
}

/**
 * Trains a member on puzzles from the PuzzleBase. They choose how hard, and optionally one bucket
 * or theme, then play through the trainer. Every puzzle is saved as it ends, with each move they
 * tried and how long it took, to build their Puzzle Stats. Any signed-in member can train.
 */
export function PuzzleTrainerPage({ client = getPuzzlebaseClient() }: PuzzleTrainerPageProps) {
    const { user } = useAuth();
    const [stage, setStage] = useState<'setup' | 'loading' | 'training'>('setup');
    const [taxonomy, setTaxonomy] = useState<PuzzlebaseTaxonomy>({ buckets: {} });
    const [available, setAvailable] = useState<TrainingTagSet[]>();
    const [puzzles, setPuzzles] = useState<TacticsPuzzle[]>([]);
    const [session, setSession] = useState(0);
    const [message, setMessage] = useState<string>();
    const [notice, setNotice] = useState<{ severity: 'error' | 'info'; text: string }>();
    // Whether training is open to this member. Assumed so until the server says otherwise, which it
    // also enforces.
    const [canTrain, setCanTrain] = useState(true);

    const [length, setLength] = useState<SessionLength>('unlimited');
    // How each puzzle played this session was scored. Missing while the server is still working it
    // out, `failed` if it could not be saved.
    const [scores, setScores] = useState<
        Record<string, { scoring?: AttemptScoring; failed?: boolean }>
    >({});

    // Puzzles already played, so the next session offers new ones.
    const played = useRef<string[]>([]);

    // What the current session is made of, so more puzzles can be fetched as they get through them.
    const query = useRef<TrainQuery>({});
    const queued = useRef(0);
    const finished = useRef(0);
    const fetchingMore = useRef(false);
    const noMore = useRef(false);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve()
            .then(() => client.getStatus())
            .then((status) => {
                if (!cancelled && !status.canTrain) setCanTrain(false);
            })
            .catch(() => {
                // The server decides when training starts.
            });
        return () => {
            cancelled = true;
        };
    }, [client]);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve()
            .then(() => client.trainingTags())
            .then((tags) => {
                if (!cancelled) setAvailable(tags);
            })
            .catch(() => {
                // Without it every theme is offered, and asking for one with no puzzles says so.
            });
        return () => {
            cancelled = true;
        };
    }, [client]);

    useEffect(() => {
        let cancelled = false;
        client
            .getTaxonomy()
            .then((result) => {
                if (!cancelled) setTaxonomy(result);
            })
            .catch(() => {
                // Without the themes the member can still train, just not focus on one.
            });
        return () => {
            cancelled = true;
        };
    }, [client]);

    const start = async (request: TrainQuery, sessionLength: SessionLength) => {
        setStage('loading');
        setMessage(undefined);
        setNotice(undefined);
        try {
            let fetched = await client.train({ ...request, exclude: played.current });
            let repeating = false;
            if (fetched.length === 0 && played.current.length > 0) {
                // They have played everything that matches, so let puzzles repeat.
                fetched = await client.train(request);
                repeating = fetched.length > 0;
            }

            const playable = toTacticsPuzzles(fetched);
            if (playable.length === 0) {
                setMessage(
                    'No puzzles match. Try a wider rating range, or a different bucket or theme.',
                );
                setStage('setup');
                return;
            }

            played.current = [...played.current, ...playable.map((p) => p.id)].slice(
                -REMEMBERED_PUZZLES,
            );
            if (repeating) {
                setNotice({
                    severity: 'info',
                    text: 'You have played every puzzle that matches, so some will repeat.',
                });
            }
            setScores({});
            query.current = request;
            queued.current = playable.length;
            finished.current = 0;
            noMore.current = false;
            setLength(sessionLength);
            setPuzzles(playable);
            setSession((n) => n + 1);
            setStage('training');
        } catch (err) {
            setMessage(errorMessage(err));
            setStage('setup');
        }
    };

    /** Saves an attempt, trying once more if it fails. Saving twice is safe: the server dedupes. */
    const save = useCallback(
        async (attempt: AttemptSubmission) => {
            const record = (saved: { scoring?: AttemptScoring }) =>
                setScores((all) => ({ ...all, [attempt.puzzleId]: { scoring: saved.scoring } }));
            setScores((all) => ({ ...all, [attempt.puzzleId]: {} }));
            try {
                record(await client.submitAttempt(attempt));
            } catch {
                try {
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
                    record(await client.submitAttempt(attempt));
                } catch (err) {
                    setScores((all) => ({ ...all, [attempt.puzzleId]: { failed: true } }));
                    setNotice({
                        severity: 'error',
                        text: `Your last puzzle could not be saved to your stats: ${errorMessage(err)}`,
                    });
                }
            }
        },
        [client],
    );

    /** Adds more puzzles to the session once the member is nearly through the ones they have. */
    const topUp = useCallback(async () => {
        if (fetchingMore.current || noMore.current) return;
        fetchingMore.current = true;
        try {
            let more = await client.train({ ...query.current, exclude: played.current });
            if (more.length === 0) {
                // Everything that matches has been played, so let puzzles repeat.
                more = await client.train(query.current);
                if (more.length > 0) {
                    setNotice({
                        severity: 'info',
                        text: 'You have played every puzzle that matches, so some will repeat.',
                    });
                }
            }
            const playable = toTacticsPuzzles(more);
            if (playable.length === 0) {
                noMore.current = true;
                return;
            }
            played.current = [...played.current, ...playable.map((p) => p.id)].slice(
                -REMEMBERED_PUZZLES,
            );
            queued.current += playable.length;
            setPuzzles((current) => [...current, ...playable]);
        } catch {
            // The session carries on with what it has. It tries again after the next puzzle.
        } finally {
            fetchingMore.current = false;
        }
    }, [client]);

    const onPuzzleFinished = useCallback(
        (attempt: AttemptSubmission) => {
            void save(attempt);
            if (!attempt.abandoned) finished.current += 1;
            if (queued.current - finished.current <= TOP_UP_AT) void topUp();
        },
        [save, topUp],
    );

    if (!canTrain) {
        return (
            <Container maxWidth='sm' sx={{ py: 8 }}>
                <Alert severity='info'>
                    The PuzzleBase is not open for training yet. Puzzle Contributors are testing it
                    first.
                </Alert>
            </Container>
        );
    }

    return (
        <>
            {stage === 'training' ? (
                <TacticsTrainerPage
                    key={session}
                    puzzles={puzzles}
                    autoStart
                    showRating={false}
                    timeLimitSeconds={length === 'unlimited' ? undefined : length * 60}
                    endless
                    onPuzzleFinished={onPuzzleFinished}
                    renderPuzzleInfo={(puzzle) =>
                        puzzle.info ? (
                            <PuzzleInfoPanel
                                puzzle={puzzle.info}
                                taxonomy={taxonomy}
                                numberOnly
                                plain
                            />
                        ) : undefined
                    }
                    renderPuzzleFooter={(puzzle) => (
                        <Stack
                            sx={{
                                // The details above it already leave a little room.
                                pt: 2,
                                // Room at the sides, so the tags do not run into the edge or the scrollbar.
                                pr: 2.5,
                                pl: 2,
                                pb: 3,
                                gap: 2.5,
                                flexShrink: 0,
                            }}
                        >
                            {puzzle.info && (
                                <PuzzleTagChips puzzle={puzzle.info} taxonomy={taxonomy} roomy />
                            )}
                            {/* The suggestion, then under it the vote. */}
                            <SuggestTagsButton
                                key={puzzle.id}
                                outlined
                                roomy
                                client={client}
                                taxonomy={taxonomy}
                                puzzle={puzzle}
                                onApplied={(updated) =>
                                    setPuzzles((all) =>
                                        all.map((p) =>
                                            p.id === updated.id
                                                ? {
                                                      ...p,
                                                      buckets: updated.buckets,
                                                      themes: updated.themes,
                                                      info: updated,
                                                  }
                                                : p,
                                        ),
                                    )
                                }
                            />
                            <Box sx={{ alignSelf: 'flex-start' }}>
                                <PuzzleVote
                                    key={puzzle.id}
                                    client={client}
                                    puzzleId={puzzle.id}
                                    initialVote={puzzle.info?.myVote}
                                    large
                                />
                            </Box>
                        </Stack>
                    )}
                    renderPuzzleDone={(puzzle) =>
                        puzzle.id in scores ? (
                            <ScoreSummary
                                scoring={scores[puzzle.id].scoring}
                                failed={scores[puzzle.id].failed}
                            />
                        ) : undefined
                    }
                    onTrainAgain={() => setStage('setup')}
                />
            ) : (
                <TrainSetup
                    taxonomy={taxonomy}
                    available={available}
                    userRating={getCurrentRating(user)}
                    loading={stage === 'loading'}
                    message={message}
                    onStart={(request, sessionLength) => void start(request, sessionLength)}
                />
            )}

            <Snackbar
                open={!!notice}
                autoHideDuration={10000}
                onClose={(_, reason) => {
                    if (reason !== 'clickaway') setNotice(undefined);
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={notice?.severity ?? 'info'} onClose={() => setNotice(undefined)}>
                    {notice?.text}
                </Alert>
            </Snackbar>
        </>
    );
}
