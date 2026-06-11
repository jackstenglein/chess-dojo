'use client';

import NotFoundPage from '@/NotFoundPage';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth, useRequiredAuth } from '@/auth/Auth';
import { BoardApi, Chess } from '@/board/Board';
import PgnBoard, { BlockBoardKeyboardShortcuts, PgnBoardApi, useChess } from '@/board/pgn/PgnBoard';
import { useDebounce } from '@/board/pgn/boardTools/boardButtons/StatusIcon';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import { ButtonProps as MoveButtonProps } from '@/board/pgn/pgnText/MoveButton';
import { getCurrentRating, getNormalizedRating } from '@/database/user';
import Instructions from '@/exams/instructions/Instructions';
import CompletedExamPgnSelector from '@/exams/view/CompletedExamPgnSelector';
import ExamPgnSelector, { ProblemStatus } from '@/exams/view/ExamPgnSelector';
import ExamStatistics from '@/exams/view/ExamStatistics';
import {
    addExtraVariation,
    getEventHeader,
    getFen,
    getMoveDescription,
    getOrientation,
    useExam,
} from '@/exams/view/exam';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { EventType } from '@jackstenglein/chess';
import {
    Exam,
    ExamAnswer,
    ExamAttempt,
    ExamType,
} from '@jackstenglein/chess-dojo-common/src/database/exam';
import { getSolutionScore, scoreVariation } from '@jackstenglein/chess-dojo-common/src/exam/scores';
import {
    Assessment,
    Info,
    Quiz,
    RemoveCircle,
    SwapHorizontalCircle,
    Warning,
} from '@mui/icons-material';
import {
    Box,
    Button,
    CardContent,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCountdown } from 'react-countdown-circle-timer';

export interface Scores {
    total: {
        user: number;
        solution: number;
    };
    problems: {
        user: number;
        solution: number;
    }[];
}

function getColorsTime(limitSeconds?: number): { 0: number } & { 1: number } & number[] {
    if (!limitSeconds) {
        return [3600, 2700, 1800, 900, 0];
    }

    return [limitSeconds, limitSeconds * 0.75, limitSeconds * 0.5, limitSeconds * 0.25, 0];
}

export function ExamPage({ type, id }: { type: ExamType; id: string }) {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }
    return <AuthExamPage type={type} id={id} />;
}

function AuthExamPage({ type, id }: { type: ExamType; id: string }) {
    const router = useRouter();
    const { request, exam, answer } = useExam({ type, id });
    const inProgress = !answer || answer.attempts.slice(-1)[0].inProgress;

    const [isRetaking, setIsRetaking] = useState(false);
    const [showRetakeDialog, setShowRetakeDialog] = useState(false);
    const [showLatestAttempt, setShowLatestAttempt] = useState(isRetaking);

    useEffect(() => {
        if (inProgress && (answer?.attempts.length ?? 0) > 1) {
            setIsRetaking(true);
            setShowLatestAttempt(true);
        }
    }, [inProgress, answer]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }
    if (request.isFailure()) {
        return (
            <Container sx={{ py: 5 }}>
                <RequestSnackbar request={request} />
            </Container>
        );
    }

    if (!exam) {
        router.push('/tests');
        return null;
    }

    if (inProgress || isRetaking) {
        const setAnswer = (a: ExamAnswer) => {
            request.onSuccess({ exam, answer: a });
        };
        const updateData = (e: Exam, a: ExamAnswer) => {
            request.onSuccess({ exam: e, answer: a });
        };

        return (
            <InProgressExam
                exam={exam}
                answer={answer}
                setAnswer={setAnswer}
                setExamAndAnswer={updateData}
                setIsRetaking={setIsRetaking}
            />
        );
    }

    const onRetake = () => {
        setShowRetakeDialog(false);
        setIsRetaking(true);
        setShowLatestAttempt(true);
    };

    return (
        <>
            <CompletedExam
                exam={exam}
                answer={answer}
                onReset={() => setShowRetakeDialog(true)}
                resetLabel='Retake Test'
                showLatestAttempt={showLatestAttempt}
            />
            <Dialog open={showRetakeDialog} onClose={() => setShowRetakeDialog(false)}>
                <DialogTitle>Retake this test?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You can retake this test for practice, but your original score will still be
                        used for your stats on this test and your Dojo Tactics rating.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowRetakeDialog(false)}>Cancel</Button>
                    <Button onClick={onRetake}>Retake</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

interface InProgressExamProps {
    exam: Exam;
    answer?: ExamAnswer;
    setAnswer: (a: ExamAnswer) => void;
    setExamAndAnswer: (e: Exam, a: ExamAnswer) => void;
    setIsRetaking: (v: boolean) => void;
    disableClock?: boolean;
    disableSave?: boolean;
}

export const InProgressExam: React.FC<InProgressExamProps> = ({
    exam,
    answer,
    setAnswer,
    setExamAndAnswer,
    setIsRetaking,
    disableClock,
    disableSave,
}) => {
    const { user } = useRequiredAuth();
    const api = useApi();
    const pgnApi = useRef<PgnBoardApi>(null);
    const [selectedProblem, setSelectedProblem] = useState(0);
    const [isTimeOver, setIsTimeOver] = useState(false);
    const [problemStatus, setProblemStatus] = useState<Record<number, ProblemStatus>>({});
    const answerRequest = useRequest();
    const router = useRouter();

    const currentAttempt = answer?.attempts.slice(-1)[0]?.inProgress
        ? answer.attempts.slice(-1)[0]
        : undefined;
    const answerPgns = useRef<string[]>(
        exam.pgns.map((_, i) => currentAttempt?.answers[i]?.pgn || ''),
    );

    const onCountdownComplete = useCallback(() => {
        setIsTimeOver(true);
    }, [setIsTimeOver]);

    const countdown = useCountdown({
        isPlaying: !disableClock,
        size: 80,
        strokeWidth: 6,
        duration: exam?.timeLimitSeconds || 3600,
        initialRemainingTime:
            (exam?.timeLimitSeconds || 3600) - (currentAttempt?.timeUsedSeconds || 0),
        colors: ['#66bb6a', '#29b6f6', '#ce93d8', '#ffa726', '#f44336'],
        colorsTime: getColorsTime(exam?.timeLimitSeconds),
        trailColor: 'rgba(0,0,0,0)',
        onComplete: onCountdownComplete,
    });

    const saveProgress = (inProgress: boolean, totalScore?: number) => {
        answerRequest.onStart();
        const attempt: ExamAttempt = {
            answers: answerPgns.current.map((pgn, i) => ({
                pgn: selectedProblem === i ? pgnApi.current?.getPgn() || '' : pgn,
            })),
            cohort: user.dojoCohort,
            rating: getNormalizedRating(getCurrentRating(user), user.ratingSystem) || 0,
            timeUsedSeconds: Math.round(countdown.elapsedTime),
            createdAt: '',
            inProgress,
        };

        const attemptIndex = currentAttempt ? (answer?.attempts.length ?? 1) - 1 : undefined;
        return api.putExamAttempt(exam.type, exam.id, attempt, attemptIndex, totalScore);
    };

    const autoSave = () => {
        saveProgress(true)
            .then((resp) => {
                setAnswer(resp.data.answer);
                answerRequest.onSuccess();
            })
            .catch((err) => {
                answerRequest.onFailure(err);
            });
    };

    const debouncedOnSave = useDebounce(autoSave);

    useEffect(() => {
        if (!disableSave) {
            const observer = {
                types: [
                    EventType.NewVariation,
                    EventType.UpdateComment,
                    EventType.UpdateNags,
                    EventType.Initialized,
                    EventType.UpdateDrawables,
                    EventType.DeleteMove,
                    EventType.DeleteBeforeMove,
                    EventType.PromoteVariation,
                ],
                handler: () => {
                    debouncedOnSave();
                },
            };
            const currentPgnApi = pgnApi.current;
            currentPgnApi?.addObserver(observer);
            return () => {
                debouncedOnSave.cancel();
                currentPgnApi?.removeObserver(observer);
            };
        }
    }, [disableSave, pgnApi, debouncedOnSave]);

    const onChangeProblem = (index: number) => {
        answerPgns.current[selectedProblem] = pgnApi.current?.getPgn() || '';
        setSelectedProblem(index);
    };

    const onPause = () => {
        debouncedOnSave.cancel();
        answerPgns.current[selectedProblem] = pgnApi.current?.getPgn() || '';
        saveProgress(true)
            .then(() => {
                router.push(`/tests/${exam.type}/${exam.id}`);
            })
            .catch((err) => {
                answerRequest.onFailure(err);
            });
    };

    const onComplete = () => {
        debouncedOnSave.cancel();
        answerPgns.current[selectedProblem] = pgnApi.current?.getPgn() || '';
        const scores = getScores(exam, answerPgns.current);

        if (!disableSave) {
            saveProgress(false, scores.total.user)
                .then((resp) => {
                    if (resp.data.exam) {
                        setExamAndAnswer(resp.data.exam, resp.data.answer);
                    } else {
                        setAnswer(resp.data.answer);
                    }
                    setIsRetaking(false);
                })
                .catch((err) => {
                    answerRequest.onFailure(err);
                });

            return;
        }

        const attempt: ExamAttempt = {
            answers: answerPgns.current.map((pgn) => ({
                pgn,
            })),
            cohort: user.dojoCohort,
            rating: getNormalizedRating(getCurrentRating(user), user.ratingSystem) || 0,
            timeUsedSeconds: Math.round(countdown.elapsedTime),
            createdAt: new Date().toISOString(),
        };

        const newAnswer: ExamAnswer = {
            type: user.username,
            id: exam.id,
            examType: exam.type,
            attempts: [...(answer?.attempts || []), attempt],
        };

        setExamAndAnswer(
            {
                ...exam,
                answers: {
                    [user.username]: {
                        cohort: user.dojoCohort,
                        rating: attempt.rating,
                        score: scores.total.user,
                        createdAt: attempt.createdAt,
                    },
                    ...exam.answers,
                },
            },
            newAnswer,
        );
        setIsRetaking(false);
    };

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <RequestSnackbar request={answerRequest} />

            <PgnBoard
                ref={pgnApi}
                fen={getFen(exam.pgns[selectedProblem])}
                pgn={answerPgns.current[selectedProblem]}
                startOrientation={getOrientation(exam.pgns[selectedProblem])}
                showPlayerHeaders={false}
                disableEngine
                underboardTabs={[
                    {
                        name: 'instructions',
                        tooltip: 'Instructions',
                        icon: <Info />,
                        element: (
                            <CardContent>
                                <Instructions
                                    type={exam.type}
                                    timeLimitSeconds={exam.timeLimitSeconds}
                                    length={exam.pgns.length}
                                />
                            </CardContent>
                        ),
                    },
                    {
                        name: 'examInfo',
                        tooltip: 'Test Info',
                        icon: <Quiz />,
                        element: (
                            <ExamPgnSelector
                                name={exam.name}
                                cohortRange={exam.cohortRange}
                                count={exam.pgns.length}
                                selected={selectedProblem}
                                onSelect={onChangeProblem}
                                countdown={countdown}
                                onComplete={onComplete}
                                orientations={exam.pgns.map((pgn) => getOrientation(pgn))}
                                pgnNames={exam.pgns.map((pgn) => getEventHeader(pgn))}
                                problemStatus={problemStatus}
                                setProblemStatus={setProblemStatus}
                                onPause={disableSave ? undefined : onPause}
                                pauseLoading={answerRequest.isLoading()}
                            />
                        ),
                    },
                    DefaultUnderboardTab.Editor,
                    DefaultUnderboardTab.Settings,
                ]}
                initialUnderboardTab='examInfo'
                allowMoveDeletion={!exam.takebacksDisabled}
                disableTakebacks={
                    exam.takebacksDisabled ? getOrientation(exam.pgns[selectedProblem]) : undefined
                }
                slots={{
                    moveButtonExtras: ExamMoveButtonExtras,
                }}
            />

            <Dialog
                open={isTimeOver}
                classes={{
                    container: BlockBoardKeyboardShortcuts,
                }}
                fullWidth
            >
                <DialogTitle>Test Complete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Your time has run out, and the test is over. Let's see how you did!
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onComplete}>Continue</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export function getScores(exam: Exam, answerPgns: string[]): Scores {
    const scores: Scores = {
        total: { user: 0, solution: 0 },
        problems: [],
    };

    for (let i = 0; i < exam.pgns.length; i++) {
        const solutionChess = new Chess({ pgn: exam.pgns[i] });
        const userChess = new Chess({ pgn: answerPgns[i] });
        const solutionScore = getSolutionScore(
            getOrientation(exam.pgns[i]),
            solutionChess.history(),
            solutionChess,
            false,
        );
        const [userScore] = scoreVariation(
            getOrientation(exam.pgns[i]),
            solutionChess.history(),
            null,
            userChess,
            false,
        );

        scores.total.solution += solutionScore;
        scores.total.user += userScore;
        scores.problems.push({
            user: userScore,
            solution: solutionScore,
        });
    }

    return scores;
}

export const ExamMoveButtonExtras: React.FC<MoveButtonProps> = ({ move }) => {
    const { chess, config } = useChess();

    if (!chess) {
        return null;
    }

    if (move.color !== chess.turn(null)) {
        return null;
    }

    if (chess.isMainline(move.san, move.previous)) {
        return null;
    }

    if (config?.disableTakebacks?.[0] === move.color) {
        return (
            <Tooltip title='Only your first move for the solving side is counted in this test. This move and any following moves will not be counted.'>
                <Warning fontSize='small' sx={{ ml: 0.5 }} color='error' />
            </Tooltip>
        );
    }

    return (
        <Tooltip title='This move will not be counted as part of your solution. If you want this move to be counted, promote it by using the editor or right-clicking.'>
            <Warning fontSize='small' sx={{ ml: 0.5 }} color='error' />
        </Tooltip>
    );
};

interface CompletedExamProps {
    exam: Exam;
    answer: ExamAnswer;
    onReset: () => void;
    resetLabel?: string;
    showLatestAttempt?: boolean;
}

export const CompletedExam: React.FC<CompletedExamProps> = ({
    exam,
    answer,
    onReset,
    resetLabel,
    showLatestAttempt,
}) => {
    const [selectedAttempt, setAttempt] = useState(
        showLatestAttempt ? answer.attempts.length - 1 : 0,
    );
    const [selectedProblem, setSelectedProblem] = useState(0);

    const attempt = answer.attempts[selectedAttempt];
    const solutionPgn = exam.pgns[selectedProblem];
    const userPgn = attempt?.answers[selectedProblem].pgn || '';

    const orientation = getOrientation(solutionPgn);

    const onInitialize = useCallback(
        (_board: BoardApi, chess: Chess) => {
            getSolutionScore(orientation || 'white', chess.history(), chess, false);
            const answerChess = new Chess({ pgn: userPgn });
            answerChess.seek(null);
            scoreVariation(orientation || 'white', chess.history(), null, answerChess, false);
            addExtraVariation(answerChess.history(), null, chess);
        },
        [userPgn, orientation],
    );

    if (!attempt) {
        return null;
    }

    const scores = getScores(
        exam,
        attempt.answers.map((a) => a.pgn),
    );

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <PgnBoard
                initKey={`${selectedProblem}-${selectedAttempt}`}
                onInitialize={onInitialize}
                pgn={solutionPgn}
                showPlayerHeaders={false}
                startOrientation={orientation}
                underboardTabs={[
                    {
                        name: 'examInfo',
                        tooltip: 'Test Info',
                        icon: <Quiz />,
                        element: (
                            <CompletedExamPgnSelector
                                name={exam.name}
                                cohortRange={exam.cohortRange}
                                count={exam.pgns.length}
                                selected={selectedProblem}
                                onSelect={setSelectedProblem}
                                scores={scores}
                                elapsedTime={answer.attempts[selectedAttempt]?.timeUsedSeconds || 0}
                                onReset={onReset}
                                resetLabel={resetLabel}
                                attempt={selectedAttempt}
                                selectAttempt={setAttempt}
                                maxAttempts={answer.attempts.length || 1}
                                pgnNames={exam.pgns.map((pgn) => getEventHeader(pgn))}
                            />
                        ),
                    },
                    {
                        name: 'examStats',
                        tooltip: 'Test Statistics',
                        icon: <Assessment />,
                        element: <ExamStatistics exam={exam} />,
                    },
                    DefaultUnderboardTab.Settings,
                ]}
                initialUnderboardTab='examInfo'
                slots={{
                    moveButtonExtras: CompletedMoveButtonExtras,
                }}
            />
        </Container>
    );
};

const CompletedMoveButtonExtras: React.FC<MoveButtonProps> = ({ move, inline }) => {
    const { score, found, extra, isAlt, altFound } = (move.userData || {}) as {
        score?: number;
        found?: boolean;
        extra?: boolean;
        isAlt?: boolean;
        altFound?: boolean;
    };

    if (extra) {
        return (
            <Tooltip title='This move was not present in the solution. You neither gained nor lost points for it.'>
                <RemoveCircle fontSize='inherit' sx={{ ml: 0.5 }} color='disabled' />
            </Tooltip>
        );
    }

    if (isAlt) {
        if (found) {
            return (
                <Tooltip title='This move is an alternate solution. You got full credit for the mainline variation for finding this.'>
                    <SwapHorizontalCircle fontSize='small' sx={{ ml: 0.5 }} color='success' />
                </Tooltip>
            );
        }
        return (
            <Tooltip title='This move is an alternate solution. You would have received full credit for the mainline variation for finding this.'>
                <SwapHorizontalCircle fontSize='small' sx={{ ml: 0.5 }} color='disabled' />
            </Tooltip>
        );
    }

    if (score && score > 0) {
        return (
            <Tooltip title={getMoveDescription({ found, score, altFound })}>
                <Box
                    sx={{
                        backgroundColor: found || altFound ? 'success.main' : 'error.main',
                        width: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: '2px',
                        ...(inline
                            ? {
                                  ml: 0.5,
                              }
                            : undefined),
                    }}
                >
                    <Typography
                        variant={inline ? 'body2' : 'caption'}
                        fontWeight='600'
                        sx={{
                            pt: '2px',
                            color: found || altFound ? 'success.contrastText' : 'background.paper',
                        }}
                    >
                        {found || altFound ? '+' : '-'}
                        {score}
                    </Typography>
                </Box>
            </Tooltip>
        );
    }

    return null;
};
