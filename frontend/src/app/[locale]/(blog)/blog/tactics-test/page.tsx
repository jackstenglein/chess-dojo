import { Container, Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { ReactNode } from 'react';
import tacticsTestImage from './image.png';
import sampleProblemImage from './sample-problem.png';

export const metadata: Metadata = {
    title: 'Dojo Tactics Tests - A New Way to Assess Your Skills | ChessDojo Blog',
    description:
        'ChessDojo introduces a new form of tactics test designed to improve on existing trainers',
};

export default function TacticsTest() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Stack sx={{ mb: 3 }}>
                <Typography variant='h4'>
                    Dojo Tactics Tests – A New Way to Assess Your Skills
                </Typography>
                <Typography variant='h6' color='text.secondary'>
                    Kostya Kavutskiy • May 15, 2024
                </Typography>
            </Stack>

            <Stack mt={3}>
                <Typography mb={2}>
                    With our 3.0 launch, the Dojo has released a new training tool designed to test
                    tactical skill. Introducing the <a href='/tactics'>Dojo Tactics Tests</a>, an
                    attempt to improve on the most popular existing "tactics trainers" (Chess.com,
                    Lichess, ChessTempo, etc.) <em>and</em> provide players a much more realistic
                    “tactics rating.”
                </Typography>

                <iframe
                    width='100%'
                    style={{ aspectRatio: '16 / 9' }}
                    src='https://www.youtube.com/embed/Qy225I9volM?si=V2Mq13FrK9wS3mEB'
                    title='YouTube video player'
                    frameBorder='0'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
                    referrerPolicy='strict-origin-when-cross-origin'
                    allowFullScreen
                ></iframe>

                <Typography mt={2}>
                    This is an exciting feature as we aim to 1) help players improve with a new and
                    useful way to work on tactics/calculation, and 2) allow players to assess their
                    skills in a reliable way (no more 2300+ puzzle ratings!). We’re starting with
                    our version of "tactics tests" and ratings, but in the coming months we plan to
                    expand to positional, endgame, and even opening tests too, with a separate
                    rating for each category.
                </Typography>

                <Typography mt={2} component='div'>
                    More on that later! First here are the{' '}
                    <EmphasizeText>main issues</EmphasizeText> with typical online trainers that the
                    Dojo hopes to improve upon with our new Tactics Tests:
                    <ol>
                        <li>
                            <EmphasizeText>There’s always a solution.</EmphasizeText> This seems
                            logical, but as most players have probably experienced, tactics are MUCH
                            easier when you know there’s an answer. But in an actual game, it’s up
                            to the player to figure out if there’s a working tactic or not, and
                            learn how to analyze and come to an objective conclusion. Some lines
                            work, some don’t. With the Dojo Tactics Tests, there won’t always be a
                            flashy puzzle answer. Problems which don't have a "puzzle answer" will
                            accept any decent move in the position, which means no more random
                            guessing at the solution.
                        </li>
                        <li style={{ marginTop: '8px' }}>
                            <EmphasizeText>You’re given the opponent’s response.</EmphasizeText>{' '}
                            Learning to figure out <em>how the opponent is going to respond</em> to
                            your ideas is a key component of chess. In typical tactics trainers,
                            you’re incentivized to just play the “correct looking move” without
                            actually having to calculate (or visualize) all of the possible
                            consequences. This can lead to bad habits (playing too quickly, missing
                            the opponent’s resources), poor visualization, and can even stagnate
                            one’s chess. In Dojo’s Tactics Tests, you’ll need to input the moves for
                            yourself and for the opponent – full credit requires noticing and
                            including all important resources for the other side.
                        </li>
                        <li style={{ marginTop: '8px' }}>
                            <EmphasizeText>You’re not tested on critical defenses.</EmphasizeText>{' '}
                            For most puzzle trainers, there has to be “one” solution, and this
                            prevents the machine from showing the most principled defenses, as there
                            might be more than one move that wins against them. With the Dojo
                            Tactics Tests, alternates are scored, and the student is asked to find
                            all the key defenses themselves.
                        </li>
                    </ol>
                </Typography>

                <Typography mt={2}>
                    The Dojo hopes to improve on the above issues with the new Tactics Tests, where
                    users are asked to input their own analysis of each problem, which is then
                    graded against the full solution. All of the test puzzles have been hand-picked
                    by a Sensei and have lightly-annotated solutions.
                </Typography>

                <Typography mt={3} variant='h5'>
                    How the Tests Work
                </Typography>
                <Typography mt={1} mb={1} component='div'>
                    The tests are fairly straightforward:
                    <ul>
                        <li>
                            Depending on the level, students are typically given 30-60 minutes to
                            solve 6-12 exercises.
                        </li>
                        <li>Every problem has been hand-picked by a human coach.</li>
                        <li>
                            For each problem, it is up to the user to input their solution on the
                            board, along with any key defenses and their response to each defense.
                        </li>
                        <li>
                            The problems are scored based on how many correct moves the student
                            finds.
                        </li>
                        <li>
                            All of the problems have annotated solutions, indicating which moves are
                            scored and which aren’t.
                        </li>
                        <li>
                            Only the first moves you input for the solving side count, so players
                            can’t just guess multiple answers and hope one of them is right.
                        </li>
                        <li>
                            Puzzles also give full credit for alternates (sometimes two or more
                            moves win, that’s common in chess!) and partial credit for partial
                            solutions.
                        </li>
                        <li>
                            Not every puzzle will have a “tactical” answer. This is intentional, to
                            discourage guessing. If you don’t see a clear solution, just input the
                            best move that you can find!
                        </li>
                    </ul>
                    Let’s now demonstrate with an example:
                </Typography>

                <Image
                    src={sampleProblemImage}
                    alt='Image of sample problem'
                    style={{ width: '100%', height: 'auto' }}
                />

                <Typography mt={1.5}>
                    This is a sample puzzle you might be presented with for the 1500-2000 level.
                    It’s Black to play. You can either spend a few minutes and write down your
                    solution to see how you’d be graded, or if you’d like to try the sample for
                    yourself on the board, you can do so <Link href='/tactics'>here</Link>.
                    Remember: if there are multiple defenses, you must include all key variations!
                </Typography>

                <Typography mt={2} variant='h6'>
                    Solution
                </Typography>
                <Typography mt={1}>
                    <strong>1...Nxg4! 2.Nxg4</strong> (
                    <em>2.Qxg4 Rxe5-+ Black has won a healthy pawn.</em>){' '}
                    <strong>2…Bd6! 3.Qf3 Rg5 4.h3 f5-+</strong> Winning the piece back with
                    interest.
                </Typography>
                <Typography mt={2}>
                    If you only put down “1…Nxg4”, you would get 1 point for that move. If you put
                    “1…Nxg4 2.Qxg4 Rxe5”, you’d earn 3 points for the puzzle. To get full credit,
                    you’d need to input all of the moves bolded above, as well as the variation
                    2.Qxg4 Rxe5, which would be worth a total of 9 points. Since players are scored
                    based on what lines they see, we hope this new tool will push players to improve
                    their analytical skills. But there’s a second benefit to the tests as well...
                </Typography>

                <Typography mt={3} variant='h5'>
                    Scoring & Rating
                </Typography>
                <Typography mt={1}>
                    Players will be scored based on how many points they earn on their completed
                    test. The results of each test will also provide players with a “skill rating,”
                    where they are rated based on how well they do compared to others. Our theory is
                    that as more players take the tests, it will give everyone who’s taken the test
                    a more accurate representation of their skill level compared to others.
                </Typography>
                <Typography mt={2} mb={2}>
                    So for example, a player rated 2000 and higher should aim to score close to
                    90-100% on a 1500-2000 test. An 1800 should aim for 50-75%, and a 1600 should
                    aim for 25-50%.
                </Typography>

                <Image
                    src={tacticsTestImage}
                    alt=''
                    style={{ width: '100%', height: '100%', borderRadius: '8px' }}
                    priority
                />
                <Typography
                    variant='body2'
                    color='text.secondary'
                    textAlign='center'
                    mt={0.5}
                    mb={2}
                >
                    Data for the first 1500-2000 test. In this chart, the x-axis is the score on the
                    test and the y-axis is the calculated rating for the test. Different colors
                    represent different cohorts.
                </Typography>

                <Typography mt={2}>
                    We’ve launched a series of tests aimed at the 1500-2000 level and the 2000+
                    level. As we get feedback on the tests overall, we’ll roll out tests for players
                    rated between 1000-1500 and under 1000 as well.
                </Typography>
                <Typography mt={2}>
                    As mentioned, we will eventually be making positional tests, endgame tests, and
                    even some opening tests! Ultimately these will fit into one’s chess "profile,"
                    where you’ll be able to see all of your ELOs and "skill ratings" at a glance.
                </Typography>
                <Typography mt={2}>
                    We often talk about our students or fellow players in terms of their strengths
                    and weaknesses, but we rarely have a way to actually quantify or measure them.
                    Moreover, it’s very hard to tell if one is improving – yes if you gain 50 points
                    in a tournament you can conclude that you’ve improved, but these events are
                    often few and far between. With these tests, we will hopefully give players a
                    clearer sense of what they need to work on and whether they are improving!
                </Typography>
                <Typography mt={2}>
                    Currently free users can access the first of several tests that are available
                    for their rating range. Training Program members get access to all tests.
                </Typography>
                <Typography mt={2}>
                    Time to <Link href='/tactics'>get solving</Link>!
                </Typography>
            </Stack>
        </Container>
    );
}

function EmphasizeText({ children }: { children: ReactNode }) {
    return (
        <Typography component='span' color='error' fontWeight='bold'>
            {children}
        </Typography>
    );
}
