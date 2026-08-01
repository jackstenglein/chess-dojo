'use client';

import NotFoundPage from '@/NotFoundPage';
import { RequestSnackbar, useRequest } from '@/api/Request';
import {
    CompletedExam,
    InProgressExam,
} from '@/app/[locale]/(scoreboard)/tests/[type]/[id]/exam/ExamPage';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { displayExamType } from '@/database/exam';
import { User } from '@/database/user';
import Instructions from '@/exams/instructions/Instructions';
import { useExam } from '@/exams/view/exam';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { Exam, ExamAnswer, ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import { Button, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

export function ExamInstructionsPage({ type, id }: { type: ExamType; id: string }) {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }
    return <AuthExamInstructionPage user={user} type={type} id={id} />;
}

function AuthExamInstructionPage({ user, type, id }: { user: User; type: ExamType; id: string }) {
    const t = useTranslations('exams.instructionsPage');
    const tExams = useTranslations('exams');
    const { request, exam } = useExam({ type, id });
    const answerRequest = useRequest<ExamAnswer>();
    const router = useRouter();

    if (request.isLoading() || !request.isSent()) {
        return <LoadingPage />;
    }

    if (request.isFailure()) {
        return (
            <Container sx={{ py: 4 }}>
                <RequestSnackbar request={request} />
            </Container>
        );
    }

    if (!exam) {
        router.push('/tests');
        return null;
    }

    const sample = getSampleExam(exam);

    return (
        <Container sx={{ py: 4 }} maxWidth={false}>
            <Container>
                <Stack
                    sx={{
                        alignItems: 'start',
                    }}
                >
                    <Typography variant='h4'>{displayExamType(exam.type, tExams)}</Typography>
                    <Typography variant='h5'>
                        {exam.cohortRange} {exam.name}
                    </Typography>

                    <Instructions
                        length={exam.pgns.length}
                        timeLimitSeconds={exam.timeLimitSeconds}
                        type={exam.type}
                    />

                    <Typography
                        variant='h4'
                        sx={{
                            mt: 4,
                        }}
                    >
                        {t('exampleHeading')}
                    </Typography>
                    <Typography sx={{ mb: 3 }}>{t('sampleDescription')}</Typography>
                </Stack>
            </Container>

            {answerRequest.data ? (
                <CompletedExam
                    exam={sample}
                    answer={answerRequest.data}
                    onReset={answerRequest.reset}
                />
            ) : (
                <InProgressExam
                    exam={sample}
                    setAnswer={answerRequest.onSuccess}
                    setExamAndAnswer={(_e, a) => answerRequest.onSuccess(a)}
                    setIsRetaking={() => null}
                    disableClock
                    disableSave
                />
            )}

            <Container>
                <Stack
                    sx={{
                        alignItems: 'start',
                    }}
                >
                    <Typography
                        variant='h6'
                        sx={{
                            mt: 6,
                        }}
                    >
                        {t('startTestHeading')}
                    </Typography>
                    <Typography>{t('startTestBody')}</Typography>

                    <Stack
                        direction='row'
                        spacing={2}
                        sx={{
                            mt: 3,
                        }}
                    >
                        <Button
                            variant='contained'
                            component={Link}
                            href={`/tests/${type}/${id}/exam`}
                        >
                            {t('beginTest')}
                        </Button>

                        {user?.isAdmin && (
                            <Button
                                variant='outlined'
                                component={Link}
                                href={`/tests/${type}/${id}/stats`}
                            >
                                {t('viewStats')}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Container>
        </Container>
    );
}

const tacticsSampleProblems = [
    `[FEN "r5k1/pp2bppp/2p1pn2/3rN2q/5QP1/2BP4/PP2PP1P/R4RK1 b - - 0 1"]
[SetUp "1"]

1... Nxg4! { [1] } 2. Nxg4 (2. Qxg4 Rxe5 { [1] }) 2... Bd6! 3. Qf3 Rg5 { [1] } 4. h3 f5 $19 { black is winning } *`,

    `[FEN "6k1/p4ppp/P1n5/8/8/8/r3rPPP/1R1R2K1 w - - 0 1"]
[SetUp "1"]

1. Rb8+! Nxb8 (1... Re8 { [0][EOL] doesn't help } 2. Rxe8#) (1... Nd8 { [0][EOL] doesn't help } 2. Rbxd8+) 2. Rd8+ { [EOL] } 2... Re8 3. Rxe8# *`,

    `[FEN "1r2r2k/1q1bNppp/2n5/p7/1p6/4R3/P1Q2PPP/1R3NK1 w - - 0 1"]
[SetUp "1"]

1. Nf5! { [3] Any move saving the knight on e7 that is under attack would be appropriate here. This is the best of them by a small margin because it's the best square for the knight, and it does not let the black queen into the game via trade or Nd4.
NOTE: this is your final warning that not every position in the tactics test has a tactical solution! You can not just input whatever move looks violent like in some tactics trainers, as you will often come up against positions like this one, where you simply need to retreat a piece or develop a piece, and the “tactical moves” are mistakes. } (1. Nd5 { [ALT] } 1... Nd4 { This is a nice move for black, bringing the queen further into the action. }) (1. Nxc6 { [ALT] } 1... Qxc6 { Again this improves black’s queen. Also, the endgames are very tough to hold because of Be6 and the strength of that queenside majority. }) (1. Rbe1!? { [ALT] My second favorite option, bringing the b1 rook into the game. }) (1. Qxh7+? { This mating combination does not work here: } 1... Kxh7 2. Rh3+ Bxh3) (1. Qc5 { [ALT] This move also saves the N, albeit in a scary-looking way. }) *`,

    `[FEN "r1bq1rk1/pp2bppp/2n1p3/3pP3/3p2QP/2NB1N2/PPP2PP1/R3K2R w KQ - 0 1"]
[SetUp "1"]

1. Bxh7+ Kxh7 { [0] } (1... Kh8 { [0] } 2. Qh5) 2. Qh5+ (2. Ng5+? Kh6! { And it's not clear how white should continue the attack. Often in such positions there is a Bishop on c1, and then Knight can go to e6 followed by Qg7 checkmate. That pattern is not available here though! }) 2... Kg8 { [0] } 3. Ng5 Bxg5 (3... Re8 4. Qh7+ { [0] } 4... Kf8 { [0] } 5. Qh8#) 4. hxg5 { [0] } 4... f5 (4... Re8 { [0] } 5. Qh8#) (4... f6 5. g6 { [EOL] } 5... Re8 6. Qh8#) 5. g6 { [2] [EOL] The g-pawn is the nail in the coffin: black is mated. The final thrashings could be: } (5. Qh7+? { White does have a continuing attack, but this move essentially drives the black king to relative safety, rather than shutting him in and mating him. } 5... Kf7 6. g6+ Ke8 7. Qxg7 { And the game goes on. }) (5. Qh8+? { White does have a continuing attack, but this move essentially drives the black king to relative safety, rather than shutting him in and mating him. } 5... Kf7 6. g6+ Ke8 7. Qxg7 { And the games goes on. }) 5... Qh4 6. Qxh4 Rd8 7. Qh8# *`,
];

const polgarSampleProblems = [
    `[FEN "8/8/5p2/5B2/8/1K1R4/8/2k5 w - - 0 1"]
[SetUp "1"]

1. Bg4 { You need to now consider all of black's legal moves. } 1... f5 (1... Kb1 2. Rd1#) 2. Rd1# *`,
];

/**
 * Returns a sample exam for the given exam.
 * @param exam The Exam to get a sample for.
 * @returns A sample exam.
 */
function getSampleExam(exam: Exam): Exam {
    let pgns = [];

    switch (exam.type) {
        case ExamType.Tactics:
        case ExamType.Endgame:
            pgns = tacticsSampleProblems;
            break;
        case ExamType.Polgar:
            pgns = polgarSampleProblems;
            break;
    }

    return {
        type: exam.type,
        id: 'sample',
        name: 'Sample',
        cohortRange: 'Instructions',
        pgns,
        timeLimitSeconds: exam.timeLimitSeconds,
        answers: {},
        takebacksDisabled: exam.takebacksDisabled,
        totalScore: 0,
    };
}
