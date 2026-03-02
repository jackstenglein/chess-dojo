import { Link } from '@/components/navigation/Link';
import { dojoCohorts } from '@/database/user';
import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ChessDojo Guides',
    description:
        "Chess Dojo's recommendations for playing classical games, sparring against bots, and more",
};

export default function Page() {
    return (
        <Container sx={{ py: 3 }}>
            <Stack spacing={5} mb={5}>
                <Typography variant='h4'>ChessDojo Guides</Typography>
                <Stack>
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Guide to Playing Classical Games</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                It is essential to play longer games to build your intuition and
                                calculation skills. You will also need something substantive to
                                review afterwards. In general, blitz/rapid games are far less useful
                                for maximizing long-term improvement.{' '}
                                <strong>
                                    You must use at least 50% of your base time for the game to
                                    count.
                                </strong>{' '}
                                For example, under 800 must use at least 15 minutes and 1600+ must
                                use at least 30 minutes.
                            </Typography>
                            <Typography sx={{ mt: 3 }}>Minimum Time Controls:</Typography>
                            <ul>
                                <li>Under 800: 30+0</li>
                                <li>800-1200: 30+30</li>
                                <li>1200+: 45+30</li>
                                <li>1600+: 60+30</li>
                                <li>2000+: 90+30</li>
                            </ul>
                            <Typography>
                                These are our minimum suggested time controls. You can also play an
                                alternate time control as long as the base time + increment adds up
                                to the same or higher number that we've suggested. E.g. for 60+30
                                (which adds up to 90), 45+45 would also be acceptable, as well as
                                75+15, 85+5, etc. as long as you have a minimum starting time of 30
                                minutes (you cannot play 1+90).
                            </Typography>{' '}
                            <Typography sx={{ mt: 3 }}>Tips & Instructions:</Typography>
                            <ul>
                                <li>Use your time</li>
                                <li>
                                    Don’t get distracted (no phone, multitasking, tweeting,
                                    chatting)
                                </li>
                                <li>
                                    Do not use assistance of any kind (books, friends, courses,
                                    databases, etc.)
                                </li>
                                <li>Focus on the game. Full effort.</li>
                                <li>
                                    After the game, offer to do a post-mortem to your opponent which
                                    can be done via Discord, Zoom, Skype, etc. A solid post-mortem
                                    will serve as a basis and start for your game analysis.
                                </li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Guide to Analyzing Games</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Analyzing your games is an art form that takes time to master. Your
                                goal should be to find the critical moments of the game, to find
                                mistakes that you and your opponent have made, and to make
                                evaluations on the key positions of the game. Game analysis is
                                essential for figuring out one's personal strengths and weaknesses.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                Submit each game to the{' '}
                                <Link href='/games/import'>Dojo Database</Link> to share your
                                analysis with your cohort and the rest of the Dojo.
                            </Typography>
                            <Typography sx={{ mt: 3 }}>
                                Tips & Instructions for Game Analysis:
                            </Typography>
                            <ul>
                                <li>Identify the critical moments of the game.</li>
                                <li>Pinpoint mistakes from both sides and offer improvements.</li>
                                <li>
                                    Annotate mistakes/strong moves with informant symbols (!!, !,
                                    !?, ?, ??, etc.).
                                </li>
                                <li>Add a comment explaining why you gave the move that symbol.</li>
                                <li>
                                    Make evaluations of key positions (White is better, Black is
                                    better, unclear, etc.).
                                </li>
                                <li>
                                    Use words to explain your understanding of the dynamics of the
                                    position.
                                </li>
                                <li>
                                    Try to note the clock times/time spent on each move, especially
                                    key moves.
                                </li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Guide to Postmortems</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                A post-mortem is an analysis/discussion of a game conducted by the
                                two players right after the game has ended. The goal is to analyze
                                the game as objectively as possible, and to gain a sense of how your
                                opponent saw the game. What did they think the critical moments were
                                and how did their evaluation of key positions differ from yours?
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                In general both players should be respectful of one another and seek
                                their opponent’s perspective. A post-mortem is also a great
                                opportunity to find possible ideas/resources that were missed during
                                the game. The process can take anywhere from 20 minutes to several
                                hours, depending on the length of the game, if there is another
                                tournament round coming up, etc.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                There’s no such thing as a “perfect post-mortem.” The idea is just
                                to hear what your opponent was thinking (as this can point out
                                deficiencies in your own understanding), and to get a jump-start on
                                your eventual game analysis.
                            </Typography>
                            <Typography sx={{ mt: 3 }}>How Postmortems Work:</Typography>
                            <ul>
                                <li>
                                    Both players should analyze on the same board, using either a
                                    physical board or shared online analysis board on
                                    Chesscom/Lichess.
                                </li>
                                <li>
                                    If conducted online, the players should also initiate a
                                    voice/video call using Discord/Zoom/Skype etc.
                                </li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>Key Questions to Ask:</Typography>
                            <ul>
                                <li>
                                    Who won the opening battle—did White get an advantage or did
                                    Black manage to equalize?
                                </li>
                                <li>What were the key mistakes of the game?</li>
                                <li>Which moves would be better?</li>
                                <li>
                                    Were there any key alternatives that either player considered
                                    during the game?
                                </li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>Postmortem Etiquette</Typography>
                            <ul>
                                <li>
                                    In general, either player is "allowed" to ask for/decline a
                                    post-mortem. However, some players may get upset after losing a
                                    game or drawing from a winning position, and might not be
                                    interested in discussing the game at that point.
                                </li>
                                <li>
                                    In tournaments, there is often limited time between rounds and
                                    some players would rather just rest up for the next game, which
                                    is perfectly reasonable as well.
                                </li>
                                <li>
                                    Between strong players, a post-mortem is often done without a
                                    board but rather via blindfold discussion, especially when there
                                    is limited time.
                                </li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Guide to Tactics</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                IN SHORT, GETTING BETTER AT TACTICS IS ALL ABOUT: Learning new
                                tactical themes (pattern recognition) and practice
                                (tactics/calculation training).
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                There are many websites/apps to find good tactical problems. Our
                                suggestions include:
                            </Typography>
                            <ul>
                                <li>Chess.com</li>
                                <li>Lichess</li>
                                <li>ChessTempo</li>
                                <li>ChessKing Apps (Apple/Android)</li>
                                <li>Elementary Chess Tactics I (0-1200)</li>
                                <li>Elementary Chess Tactics II (0-1200)</li>
                                <li>Chess Tactics For Beginners (0-1200)</li>
                                <li>CT-ART 1400-1600</li> (1200-1400)
                                <li>Manual of Chess Combinations (1400-1600)</li>
                                <li>CT-ART 4.0 (1600-2400)</li>
                            </ul>

                            <Typography sx={{ mt: 3 }}>Tips for solving tactics:</Typography>
                            <ol>
                                <li>
                                    Don’t guess! You should be reasonably confident of your solution
                                    before inputting a move/checking the solution. If it feels like
                                    you’re missing something, you probably are! Stop and look for
                                    more alternatives for both sides.
                                </li>
                                <li>
                                    Spend ample time on each problem. For easier problems, use
                                    between 30 seconds – 3 minutes before checking the solution. For
                                    more challenging problems, spend 3-5 minutes before reviewing
                                    the answer. As you get more advanced, you should be able to
                                    spend more and more time (up to 20-30 minutes) working on an
                                    individual problem.
                                </li>
                                <li>
                                    Always review the solution. Even if you got the problem right,
                                    there may be relevant details/variations that you missed, which
                                    would be worth playing through.
                                </li>
                                <li>
                                    Try to learn from every problem. The goal is not to solve
                                    everything 100% correctly, but rather to takeaway as much as you
                                    can from the process. If you miss a problem, try to understand
                                    what caused you to get it wrong: is it a theme you’ve never seen
                                    before, or did you miscalculate a key variation?
                                </li>
                            </ol>

                            <Typography sx={{ mt: 3 }}>
                                All of the previous tips apply for regular puzzle books, online
                                tactics trainers, and Puzzle Rush Survival Mode. For timed Puzzle
                                Rush (3-min/5-min), here are some additional tips to maximize
                                long-term improvement:
                            </Typography>
                            <ul>
                                <li>Don’t rush! Focus on accuracy rather than speed.</li>
                                <li>
                                    Don’t input a move unless you are sure it’s correct. This means
                                    no “half-guesses.”
                                </li>
                                <li>Try to go the full 5 minutes without making 3 mistakes.</li>
                                <li>
                                    If you see two possible solutions, make sure to check both
                                    carefully. Online trainers are designed to have one correct
                                    solution.
                                </li>
                                <li>
                                    After each run, make sure to review the problems you got wrong.
                                    Don’t just quickly start the next run like some kind of puzzle
                                    addict.
                                </li>
                                <li>
                                    Don’t aim to set your high score each time. Rather aim for
                                    consistent runs with as few mistakes as possible.
                                </li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>FAQs/Definitions</Typography>
                            <ul>
                                <li>
                                    Tactics - chess puzzles with a clear theme and one main
                                    solution. The objective is usually to find either a gain of
                                    material or a direct checkmate.
                                </li>
                                <li>
                                    Combination - Advanced chess puzzle that combines multiple
                                    tactical themes.
                                </li>
                                <li>
                                    Calculation - The technique/skill of identifying good moves in a
                                    position for both sides -- the difference between tactics and
                                    calculation is that most tactics puzzles are going to have a
                                    clear solution, while calculation is more about being able to
                                    analyze a position objectively but without the guarantee of
                                    there being a clear best move.
                                </li>
                                <li>
                                    Visualization - The skill of being able to hold and remember
                                    chess positions in your head
                                </li>
                                <li>
                                    Should I solve puzzles based on custom theme, or random? Both:
                                    It can be very helpful to solve puzzles based on theme to help
                                    boost pattern recognition. It is also useful to incorporate
                                    “random” puzzles so that you don’t know what you’re looking for
                                    ahead of time.
                                </li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Guide to Improving Visualization</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Visualization refers to the ability to hold a chess position clearly
                                in mind, almost as if one were looking at the position right in
                                front of them. Some players “see” a 2D board that’s clearly visible
                                in their mind’s eye, while others don’t really “see” anything but
                                rather remember the positioning of all the pieces.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                Over-the-board (OTB) calculation can feel very different to
                                calculating online. Many players need time to adjust when they are
                                used to one and switch to the other. For instance, it is very common
                                for online players to struggle the first few times they play OTB. So
                                if you are preparing for an upcoming tournament, make sure to
                                practice playing and visualizing with a physical board well ahead of
                                time!
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                <strong>DO YOU NEED TO WORK ON YOUR VISUALIZATION?</strong>
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                In general, visualization is a skill that naturally improves as one
                                plays a lot and analyzes games, solves puzzles, etc. The more time
                                you spend around chess the stronger your overall visualization will
                                become. However visualization can become a weakness for some
                                players, especially if they are lazy in their calculation,overly
                                used to online puzzles (where solutions are inserted one move at a
                                time), or too reliant on arrows to aid with calculation mid-game.
                                For players who don’t feel like they can visualize as well as others
                                around their rating, it can be very useful to specifically work on
                                their visualization skill.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                <strong>HOW TO IMPROVE YOUR VISUALIZATION</strong>
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                In short, improving visualization is about pushing oneself to see
                                further/clearer. The most important thing to remember is that
                                visualization skill will improve with consistent practice, and
                                atrophy if left unused. Improving your ability to visualize
                                essentially means being able to hold a position clearly and then
                                visualizing possible moves/variations without losing track of the
                                pieces or the original position. The stronger a player’s
                                visualization, the more moves they can “see ahead” and be able to
                                switch between different variations without losing track of the
                                position.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                So in order to improve your visualization skill, you must try to see
                                further ahead than before. If your limit is visualizing 2 moves
                                ahead, at some point you will need to push yourself to visualize
                                three moves ahead. It is similar to lifting weights at the gym—in
                                order to progres, you must try to lift more weight.
                            </Typography>
                            <Typography sx={{ mt: 3 }}>
                                The best times to "practice" visualization are:
                            </Typography>
                            <ul>
                                <li>During games (trying to calculate further)</li>
                                <li>When solving puzzles (trying to calculate further)</li>
                                <li>When analyzing a position (trying to calculate further)</li>
                            </ul>
                            <Typography sx={{ mt: 2 }}>
                                Of course, there can be practical barriers in the way. During
                                classical games for instance, one can’t just spend all their time
                                trying to calculate as deeply as possible. You need to manage your
                                time accordingly, and then be willing to calculate deep when you
                                sense a critical moment.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                <strong>VISUALIZATION DRILLS</strong>
                            </Typography>
                            <ol>
                                <li>
                                    Visualize an empty board. Place any piece on any square and then
                                    list every single legal square that piece can move to. Then
                                    check on a board to verify your answer. (Example: Ne4 – f2, g3,
                                    g5, f6, d6, c5, c3, d2)
                                </li>
                                <li>
                                    Calculate as far as you can from the starting position,
                                    essentially playing blindfold chess against yourself. Go as far
                                    as you can before the position gets fuzzy, then replay the moves
                                    and see if you can get to the same position but try to see it a
                                    little clearer. See if you can go further. Then try again a
                                    third time or until your brain starts to hurt a bit.
                                </li>
                                <li>
                                    Calculate as far as you can in a given position. It can be a
                                    puzzle, analysis of a game, etc. Once you have reached the limit
                                    of your calculation (position starts to get fuzzy), try to
                                    visualize the final position as clearly as you can and identify
                                    all of the legal captures for both sides. If you’re able to
                                    quickly spot all of the legal captures (almost as quickly as if
                                    you had the position right in front of you), that means you’re
                                    visualizing the position well. If you struggle to identify every
                                    capture, it means you need to replay the moves and try to see
                                    the position clearer. Example: 1.e4 e5 2.Nf3 Nc6 3.d4 – how many
                                    legal captures (for both sides, ignoring turn) are there in this
                                    position?
                                </li>
                            </ol>
                            <Typography sx={{ mt: 2 }}>
                                Knowing when you have lost sight of the position is an incredibly
                                useful skill on its own. If you make a mistake in your visualization
                                mid-game, it could cost you the full point, so being able to
                                identify when you are hallucinating can be extremely valuable.
                            </Typography>

                            <Typography sx={{ mt: 2 }}>
                                A great way to check if your visualization is correct is to do an
                                abridged version of Drill #3 – ask yourself to quickly spot all of
                                the legal captures in a position. If you’re not properly visualizing
                                the position, you will likely feel some uncertainty as to where the
                                pieces are—and this should act as a trigger to recalculate and try
                                to see the position more clearly. Identifying possible captures is
                                also a great way to reduce blundering!
                            </Typography>

                            <Typography sx={{ mt: 2 }}>
                                As with most chess skills, improving your visualization takes time.
                                But with consistent effort comes great reward. Once a player can
                                play blindfold chess, that is another great way to work on improving
                                visualization. Most players seem to learn to play blindfold around
                                1800-2000 FIDE, but it can definitely be learned earlier as well.
                            </Typography>

                            <Typography sx={{ mt: 2 }}>
                                <strong>USEFUL VIDEOS</strong>
                            </Typography>
                            <ul>
                                <li>
                                    <Link
                                        href='https://youtu.be/UdyrXUKd30M'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        A Simple Way to Practice Visualization
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/PwIOcK-P-Do'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        Kostya’s Blueprint – Visualization
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/pzhiqSyv8v4'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        How To Calculate Lines & Knowing When to Stop
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/aFsELcwDBB0'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        How to Avoid Stopping Short in Calculation
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/5TQR91Mwqq0'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        Deep Calculation Lesson (1500+)
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/gK9eXu7RmdI'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        David’s Guide to Blindfold Training
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='https://youtu.be/IodUwpOEHfk'
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        David’s Guide to Blindfold Training - Part 2
                                    </Link>
                                </li>
                            </ul>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>How to Study Games</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Included in each band are a list of classic games that have been
                                chosen for their instructive value. These are some of the greatest
                                games played by some of the greatest players throughout history.
                                Each individual band has been given a specific player/era to study.
                            </Typography>
                            <Typography sx={{ mt: 2 }}>
                                In order to get the most out of going through these games, our main
                                recommendation would be to analyze the game with a partner or group
                                (using Discord voice chat + a shared Chess.com Classroom or Lichess
                                study, for example). Having multiple perspectives will allow you to
                                notice more details and understand the intricacies of the game.
                            </Typography>
                            <Typography sx={{ mt: 3 }}>
                                <strong>GOALS</strong>
                            </Typography>
                            <ul>
                                <li>
                                    Learn at least three ideas from each game — this could include
                                    tactical/strategic patterns that you haven’t seen before,
                                    opening principles, endgame concepts, how to approach certain
                                    positions, etc.! Advanced players (above 1600) are encouraged to
                                    look for as many interesting ideas as possible.
                                </li>
                                <li>
                                    Try to understand what would have happened in case of
                                    alternative moves/defenses. Look at the position with your own
                                    eyes and ask questions. Was there a hanging piece that wasn’t
                                    captured? Did someone neglect to make an obvious sacrifice? As
                                    soon as you notice an interesting/obvious move that wasn’t
                                    played, that’s exactly the right moment to pause and analyze
                                    (without the engine) what could have happened. Depending on your
                                    level, you can take 3-10 minutes to analyze an alternative.
                                </li>
                                <li>
                                    At the end of each game, you should be able to describe the
                                    narrative of the game — who was better and why? Did the winning
                                    player convert their advantage with sacrifices/tactics, or slow
                                    positional technique? See if you can agree with your training
                                    partner/group about a general story of the game.
                                </li>
                            </ul>
                            <Typography sx={{ mt: 3 }}>
                                <strong>HOW TO</strong>
                            </Typography>
                            <ul>
                                <li>Spend at least 30 minutes going through each game.</li>
                                <li>
                                    If you’re working alone, using a physical board is ideal,
                                    especially if you’re practicing for OTB tournaments. You are
                                    also far less likely to rush through the game and get more out
                                    of it. If working with a partner or group, a shared Chess.com
                                    Classroom/Lichess study is probably the most convenient, but you
                                    could also play through the game OTB while someone else handles
                                    the shared board.
                                </li>
                                <li>
                                    Make sure to evaluate key positions with your own eyes. If an
                                    obvious move/plan wasn’t played, take a few minutes to
                                    understand why.
                                </li>
                                <li>
                                    If a moment is particularly confusing – for instance Player A
                                    hung a piece and the opponent didn’t capture it, first (if
                                    studying OTB) make sure you have the right position, you may
                                    have missed/played a wrong move earlier. If you’re sure you have
                                    the right position and still can’t figure it out, you can either
                                    post a question in the Training Discord to see what others
                                    think, or you can consult with the engine to see if there’s
                                    something tactical that you’re missing.
                                </li>
                                <li>
                                    Do not: run through the whole game with the engine on. You will
                                    be distracted by random engine evals and not engage your own
                                    mind, which is what this is all about! The only time you should
                                    turn on the engine is after you’ve already spent some time
                                    trying to figure something out for yourself. If you want to
                                    check your analysis after you’ve spent 30+ minutes going through
                                    the game, that’s fine. (David still says never ;-) )
                                </li>
                            </ul>
                            <Typography sx={{ mt: 2 }}>
                                As a final note, there are so many different things you can learn
                                from a classic game. The key is to put yourself in the shoes of the
                                player and try to understand what it was like to play the game. You
                                will learn things about calculation, strategy, attack, defense,
                                openings, middlegames, endgames, converting advantages, pacing (is
                                it time to strike, or build up), and so much more! It is tempting to
                                just blast through the games and check them off, but you’d be doing
                                yourself a disservice. These are the greatest players of all time,
                                try to learn from their moves! To see how IM Kostya goes through
                                annotated game books, check out this video:
                            </Typography>

                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://www.youtube.com/embed/rGHf_qMR3uo'
                                    title={`Dojo Guide To Bots`}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Middlegame Sparring Guide</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://player.vimeo.com/video/705555806'
                                    title={`Dojo Guide To Bots`}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Endgame Sparring Guide</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://player.vimeo.com/video/694563363'
                                    title={`Dojo Guide To Bots`}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Opening Sparring Guide</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Opening sparring is not about winning or losing a blitz game. It’s
                                about getting in reps for your openings, working through growing
                                pains, and developing a deeper understanding of typical structures
                                that you play.
                            </Typography>
                            <Typography sx={{ mt: 3 }}>
                                <strong>Key Tips:</strong>
                            </Typography>
                            <ul>
                                <li>
                                    Choose a few key positions from your openings for sparring.
                                    Usually somewhere move 5-15. If you’re using a Dojo Repertoire,
                                    these are provided for you
                                </li>
                                <li>
                                    Play a time control between 5+3 and 15+5 (specific suggestions
                                    are given for each cohort)
                                </li>
                                <li>
                                    Play someone within 200 points of you. You can find opponents in
                                    Discord, or reach out to someone you know in real life
                                </li>
                                <li>
                                    Play until the position no longer resembles the opening, e.g.
                                    past move 25-30
                                </li>
                                <li>Analyze with your opponent after every game</li>
                                <li>
                                    Evaluate the final position of each game and try to find
                                    improvements for both sides, starting from the beginning
                                </li>
                                <li>
                                    After finishing all the games and analyzing with your opponent,
                                    you can check your conclusions against an opening book/engine
                                </li>
                                <li>
                                    Add relevant new lines to your opening file. Write down some
                                    takeaways from your sessions
                                </li>
                            </ul>
                            <Typography sx={{ mt: 2 }}>
                                A typical sparring session can last 1-2 hours. Spar frequently to
                                collect reps for all your openings. And if you’re an OTB tournament
                                player, make sure to get some OTB sparring in as well!
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant='h6'>Guide to Sparring with Bots</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                It's always best to complete the Dojo sparring requirements by
                                playing against a fellow Dojo member from your cohort. They will be
                                at your level, make very human mistakes, and will often review the
                                session with you afterward. But sometimes finding an opponent who is
                                available isn't easy. Fortunately, bot technology has advanced, and
                                we now have very human-like bots who serve as good substitutes for
                                human opponents. They are especially good for playing out the
                                endgame algorithms and Rook Endgame Progression. For these can be
                                dreary for our human friends! Below is a list of bots who are
                                appropriate for your cohort. The Chess.com bots are at the moment
                                better than the Lichess ones as they are far more dialed in terms of
                                playing strength. The downside of them however is that you have to
                                be a Chess.com diamond member. GM Jesse Kraai explains the guide in
                                the video below.
                            </Typography>

                            <Box sx={{ mt: 3, mb: 3, width: 1, aspectRatio: '1.77' }}>
                                <iframe
                                    src='https://www.youtube.com/embed/WsZknsdk504'
                                    title={`Dojo Guide To Bots`}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>

                            <TableContainer component={Paper}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                Dojo Cohort
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                Chess.com Bot
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                Lichess Bot
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {botData.map((b, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{dojoCohorts[i]}</TableCell>
                                                <TableCell>{b.chesscom}</TableCell>
                                                <TableCell>{b.lichess}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>
                </Stack>
            </Stack>
        </Container>
    );
}

const botData = [
    { chesscom: 'Martin', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Noel', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Aron', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Zara', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Karim', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Maria', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Azeez', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Elena', lichess: 'Maia1, 5 and 9' },
    { chesscom: 'Vinh', lichess: 'RadianceEngine' },
    { chesscom: 'Wendy', lichess: 'RadianceEngine' },
    { chesscom: 'Antonio', lichess: 'RadianceEngine' },
    { chesscom: 'Pablo', lichess: 'RadianceEngine' },
    { chesscom: 'Isla', lichess: 'RadianceEngine' },
    { chesscom: 'Lorenzo', lichess: 'Boris-Trapsky' },
    { chesscom: 'Miguel', lichess: 'Boris-Trapsky' },
    { chesscom: 'Li', lichess: 'Boris-Trapsky' },
    { chesscom: 'Manuel', lichess: 'HalcyonBot' },
    { chesscom: 'Nora', lichess: 'HalcyonBot' },
    { chesscom: 'Arjun', lichess: 'Eubos' },
    { chesscom: 'Sofia', lichess: 'Eubos' },
    { chesscom: 'Luke', lichess: 'Cheng-4' },
    { chesscom: 'Wei', lichess: 'Cheng-4' },
    { chesscom: 'Paul Morphy', lichess: 'Chessatronbot' },
];
