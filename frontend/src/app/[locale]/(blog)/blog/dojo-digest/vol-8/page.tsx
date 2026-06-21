import { Container, Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import graphImage from '../../tactics-test/image.png';
import clockGraphImage from './clock-graph.png';
import mainImage from './dojo_3-0.webp';
import gameCommentsImage from './game-comments.png';
import tacticsTestImage from './tactics-test.png';

export const metadata: Metadata = {
    title: 'Introducing Dojo 3.0 | ChessDojo Blog',
    description: 'New tactics tests, 3.0 training program and revamped annotated games database',
    keywords: ['Chess', 'Dojo', 'Training'],
};

export default function DojoDigestVol8() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Stack sx={{ mb: 3 }}>
                <Typography variant='h4'>Welcome to Dojo 3.0!</Typography>
                <Typography variant='h6' color='text.secondary'>
                    Dojo Digest Vol 8 • May 1, 2024
                </Typography>
            </Stack>

            <Image
                src={mainImage}
                alt=''
                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                priority
            />

            <Stack mt={3}>
                <Typography component='div'>
                    We launched the training program 2 years ago with a Google doc and a couple of
                    paper clips. Since then, we&apos;ve made great technical improvements and
                    learned a lot about what chess improvement involves across the rating spectrum.
                    While we are constantly improving the site, the release of 3.0 gave us the
                    opportunity to revamp our program using the experience of the last 2 years. Here
                    are just some of the biggest changes we&apos;ve launched:
                    <ul>
                        <li>Tactics Tests</li>
                        <li>Tactics Rating & Player Dashboard</li>
                        <li>3.0 Training Program</li>
                        <li>Revamped Game Editor & Database</li>
                        <li>Sensei Profile Review</li>
                        <li>Clubs</li>
                    </ul>
                    Learn more below, or{' '}
                    <Link href='https://www.chessdojo.club/signup'>sign up</Link> now to check it
                    out for yourself! Use code DOJO30 at checkout for 30% off your first month.
                </Typography>

                <Typography mt={2} mb={1}>
                    <strong>Tactics Tests</strong> - We&apos;ve developed a new style of tactics
                    test! In normal tactics trainers, you make your move and the computer plays a
                    single line for your opponent. This can lead to bad habits, as you don&apos;t
                    always have to calculate all of your opponent&apos;s resources. In the Dojo
                    tests, you input moves for both you and your opponent, and you&apos;re graded
                    both on the mainline and on variations:
                </Typography>

                <Image
                    src={tacticsTestImage}
                    alt='Picture of scoring system in Dojo tactics test'
                    style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                />

                <Typography variant='body2' color='text.secondary' textAlign='center' mb={2}>
                    In this example, we found the mainline but missed the opponent&apos;s defense
                    18...Rac8 and its refutation, leading to a score of 7/11.
                </Typography>

                <Typography mb={2}>
                    All test problems are hand-picked by one of the Dojo senseis, and the solutions
                    are lightly annotated. After you&apos;ve completed a test, you can see how you
                    stack up against the rest of the Dojo or against just a few cohorts:
                </Typography>

                <Image
                    src={graphImage}
                    alt='Graph of Dojo tactics test results'
                    style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
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
                    The tests are available{' '}
                    <Link href='https://www.chessdojo.club/tactics'>here</Link> for 1500+, but we
                    plan to expand to all rating levels by the end of the month. Free users can
                    access the first test in their rating section as well.
                </Typography>

                <Typography mt={4}>
                    <strong>Tactics Rating & Player Dashboard</strong> - We&apos;re using our new
                    tests, along with some other key metrics, to give everyone a Dojo Tactics
                    Rating. This will allow players to see how strong they are – tactically –
                    relative to their cohort. Your tactics rating can be found on the{' '}
                    <Link href='https://www.chessdojo.club/profile?view=stats'>ratings tab</Link> of
                    your profile. Further down the line, we have plans to add similar Dojo Strategy
                    and Dojo Endgame Ratings. All of these ratings will live in a player&apos;s
                    dashboard, where you can see all key metrics at a glance.
                </Typography>

                <Typography mt={4}>
                    <strong>3.0 Training Program</strong> - We evaluated feedback from users,
                    performed statistical analysis (which tasks produce the strongest gains?),
                    argued amongst each other and used all this information to dial in the Training
                    Program requirements across the Dojo. As always, the Training Program can be
                    viewed under your <Link href='https://www.chessdojo.club/profile'>profile</Link>
                    .
                </Typography>

                <Typography mt={4} component='div'>
                    <strong>Revamped Game Editor & Database</strong> - Our{' '}
                    <Link href='https://www.chessdojo.club/games'>annotated games database</Link>{' '}
                    has improved tremendously since Dojo 2.0. Even old-timer Sensei Kraai prefers it
                    to Chessbase! Here are some of the features we&apos;ve added:
                    <ul>
                        <li>
                            Annotate your games in unlisted mode. When unlisted, you can share your
                            games via the URL, but otherwise it won&apos;t appear on the site. This
                            lets you work on your annotations and get feedback, then publish to the
                            rest of the Dojo when ready.
                        </li>
                        <li>
                            Games are now viewable by users who don&apos;t have a Dojo account, so
                            you can share your annotations with your friends or coach without having
                            to force them to sign up.
                        </li>
                        <li>
                            You can now comment on individual moves in other users&apos; games, and
                            other users can reply to your comments in a thread.
                        </li>

                        <Image
                            src={gameCommentsImage}
                            alt='Picture of game comments'
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '8px',
                                margin: '12px 0 8px',
                            }}
                        />

                        <li>
                            Completely customizable keyboard shortcuts! Want to click through
                            another user&apos;s game, comment on a move and return back to clicking
                            through the game? Set your keyboard shortcuts, and you can do that
                            without ever touching your mouse. Perfect for power users.
                        </li>
                        <li>
                            Search for annotated games in the database by position. You can also
                            subscribe to a position in order to get notified whenever a game is
                            published containing that position. You can even set a rating range on
                            your subscription!
                        </li>
                        <li>
                            Most people play too quickly! Get insights into your time usage with our
                            clock graphs.
                        </li>

                        <Image
                            src={clockGraphImage}
                            alt='Picture of clock usage graph'
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '8px',
                                margin: '12px 0 8px',
                            }}
                        />

                        <li>
                            An all-new set of board themes and piece styles, including a 3D mode.
                        </li>
                        <li>
                            Free-tier users can annotate with our site as well, with no limit on the
                            number of unlisted games you can create!
                        </li>
                    </ul>
                </Typography>

                <Typography mt={4}>
                    <strong>Sensei Profile Review</strong> - The assumption of the Training Program
                    from the beginning was that if someone does all the requirements, they will make
                    it to the next level. The senseis will therefore start reviewing the profile of
                    anyone who completes 80% of their cohort&apos;s training program without
                    graduating.
                </Typography>

                <Typography mt={4}>
                    <strong>Clubs</strong> - Clubs are a great way for Dojoers to meet others close
                    to them geographically or those with similar interests. The Dojo currently has
                    77 clubs and counting! Each club gets its own scoreboard, newsfeed and Discord
                    channel, which can be a great help in scheduling sparring sessions. Create or
                    join a club <Link href='https://www.chessdojo.club/clubs'>here</Link>.
                </Typography>

                <Typography mt={4}>
                    <strong>Coming Soon</strong> - As if all that wasn&apos;t enough, we have more
                    great projects planned, including an opening trainer, the How to Analyze Your
                    Games book and a new rating conversion table. Keep an eye out for our Dojo
                    Digest next month!
                </Typography>

                <Typography mt={4}>
                    Join the <Link href='https://www.chessdojo.club/signup'>Training Program</Link>{' '}
                    using the code DOJO30 and get 30% off your first month!
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>
                <Typography mt={2}>
                    <Link href='https://www.chessdojo.club/profile/google_105393645715208125191'>
                        Sensei David
                    </Link>{' '}
                    played the 2023-2024 season of the French National League for the team from St
                    Lo, finishing with 4.5/5. In the final round he played a higher-rated opponent,
                    producing his best game of the year. You can see that game, explained by David
                    in a <Link href='https://www.youtube.com/watch?v=DFnSAgiqPLY'>video</Link> or in
                    the{' '}
                    <Link href='https://www.chessdojo.club/games/2300-2400/2024.03.22_74ccb901-3023-4aef-8a2b-393f45bf3d54'>
                        game viewer
                    </Link>
                    .
                </Typography>
                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/google_114391023466287136398'>
                        NoseKnowsAll
                    </Link>{' '}
                    created two new Lichess studies, which both made it to the staffs&apos; picks
                    list. <Link href='https://lichess.org/study/kjBSgqoA'>Talk to Your Pieces</Link>{' '}
                    is best for players under 2000 Lichess, while{' '}
                    <Link href='https://lichess.org/study/dYFcDtRq'>Pawns Aren&apos;t People</Link>{' '}
                    is best for players 1900-2400 Lichess. He also recently played his best game
                    ever! Check out the annotations{' '}
                    <Link href='https://www.chessdojo.club/games/1900-2000/2024.04.19_cc037496-a565-4dd7-8f2b-970357c6fe8b'>
                        here
                    </Link>
                    .
                </Typography>
                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/google_103711828705525689238'>
                        Alex
                    </Link>{' '}
                    (1300-1400 cohort) won an OTB tournament for the first time in his life,{' '}
                    <Link href='https://www.chessdojo.club/profile/b707d308-3d19-499a-abf0-1b8d46112819'>
                        mrlam
                    </Link>{' '}
                    (1400-1500 cohort) defeated a 1930 OTB in the Najdorf in just 25 moves, and{' '}
                    <Link href='https://www.chessdojo.club/profile/google_116158795852704950831'>
                        Hubskrt
                    </Link>{' '}
                    (1900-2000 cohort) was the 20th seed in his club championship but ended up
                    winning it anyway with 9.5/13!
                </Typography>

                <Typography textAlign='center' mt={4}>
                    Over the past year of Dojo 2.0, we&apos;ve collectively achieved:
                    <br />
                    <br />
                    <strong>137,000</strong> rating points gained
                    <br />
                    <strong>66,000</strong> training hours logged
                    <br />
                    <strong>1,341</strong> graduations
                    <br />
                    <br />
                    Keep up the great work!
                </Typography>
            </Stack>
        </Container>
    );
}
