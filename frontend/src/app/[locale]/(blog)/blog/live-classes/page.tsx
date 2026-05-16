import davidImage from '@/components/landing/david.webp';
import jesseImage from '@/components/landing/jesse.webp';
import kostyaImage from '@/components/landing/kostya.webp';
import { Link } from '@/components/navigation/Link';
import { Button, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Header } from '../common/Header';
import graphImage from './graph.png';

export const metadata: Metadata = {
    title: 'ChessDojo Launches Live Group Classes | 25% Off',
    description:
        "ChessDojo's new live group classes are on sale now! Get master-level instruction from our senseis.",
    keywords: ['Chess', 'Dojo', 'group', 'classes', 'live', 'training'],
};

export default function Page() {
    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Header
                title='ChessDojo Launches Live Group Classes | 25% Off'
                subtitle='November 24, 2025'
            />

            <Stack mt={3}>
                <Typography variant='h6' textAlign='center'>
                    ChessDojo's interactive group classes start January 1st. Join before December
                    2nd and get <strong>25% off</strong> with the code <strong>BLACKFRIDAY</strong>!
                </Typography>

                <Button
                    color='dojoOrange'
                    variant='contained'
                    sx={{ alignSelf: 'center', my: 3, fontWeight: 'bold' }}
                    size='large'
                    href='/prices'
                >
                    Join Group Classes
                </Button>

                <Typography variant='h5' textAlign='center' mt={6}>
                    Get master-level instruction from our senseis
                </Typography>

                <Stack
                    direction='row'
                    mt={4}
                    alignItems='center'
                    justifyContent={{ xs: 'center', sm: 'start' }}
                    gap={3}
                    flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                >
                    <Image src={jesseImage} alt='Image of GM Jesse Kraai' width={160} />

                    <Stack>
                        <Typography variant='h6'>
                            Endgame Fundamentals with GM Jesse Kraai (0-1200)
                        </Typography>
                        <Typography color='text.secondary'>
                            The superpower of learning basic endgames as a beginner is that they
                            train you to <em>see</em> which squares are controlled. We call this
                            skill "grip" or "board vision." It's priority number one for anyone
                            trying to reach 1200. You will of course also learn how to mate, get an
                            introduction to the concept of Zugzwang, and learn how to calculate in
                            “simple” positions.
                        </Typography>
                        <Link href='/prices' sx={{ mt: 2 }}>
                            Join Now
                        </Link>
                    </Stack>
                </Stack>

                <Stack
                    direction='row'
                    mt={4}
                    alignItems='center'
                    justifyContent={{ xs: 'center', sm: 'start' }}
                    gap={3}
                    flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                >
                    <Image src={kostyaImage} alt='Image of IM Kostya Kavutskiy' width={160} />

                    <Stack>
                        <Typography variant='h6'>
                            Calculation with IM Kostya Kavutskiy (1000-1400)
                        </Typography>
                        <Typography color='text.secondary'>
                            A weekly class on calculation, focusing on various techniques and skills
                            within calculation. Students will be given weekly homework to work on
                            before the next class, and encouraged to form study groups to solve the
                            material together.
                        </Typography>
                        <Link href='/prices' sx={{ mt: 2 }}>
                            Join Now
                        </Link>
                    </Stack>
                </Stack>

                <Stack
                    direction='row'
                    mt={4}
                    alignItems='center'
                    justifyContent={{ xs: 'center', sm: 'start' }}
                    gap={3}
                    flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                >
                    <Image src={davidImage} alt='Image of IM David Pruess' width={160} />

                    <Stack>
                        <Typography variant='h6'>
                            The Najdorf with IM David Pruess (two sections 1400-1800, 1800+)
                        </Typography>
                        <Typography color='text.secondary'>
                            The Najdorf Sicilian is the most unbalanced but objectively good
                            response to 1.e4, and unsurprisingly, one of the most popular of all
                            time. Wielded by the likes of Mikhail Tal, Bobby Fischer, Garry
                            Kasparov, Viswanathan Anand, and Veselin Topalov, many amateurs wrongly
                            fear it is an opening only for World Champions and opening monkeys. Not
                            so! In this course, we will learn to play the Najdorf intuitively,
                            focusing on the main ideas, without needing to memorize any lines. Prior
                            to each class, students will be expected to spar key positions, assigned
                            ahead of time.
                        </Typography>
                        <Link href='/prices' sx={{ mt: 2 }}>
                            Join Now
                        </Link>
                    </Stack>
                </Stack>

                <Paper elevation={6} sx={{ mt: 10, borderRadius: '20px', p: '16px' }}>
                    <Grid container alignItems='center' flexWrap='wrap-reverse' rowGap={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack>
                                <Typography variant='h5' fontWeight='bold'>
                                    Game & Profile Reviews
                                </Typography>
                                <Typography variant='h6' mt={1}>
                                    Get personalized insights from a sensei based on your training
                                    habits and annotated games.
                                </Typography>
                                <Button
                                    color='dojoOrange'
                                    variant='contained'
                                    sx={{ alignSelf: 'start', my: 3, fontWeight: 'bold' }}
                                    size='large'
                                    href='/prices'
                                >
                                    Get Sensei Feedback
                                </Button>
                            </Stack>
                        </Grid>
                        <Grid
                            size={{ xs: 12, sm: 6 }}
                            sx={{ position: 'relative', minHeight: '200px' }}
                        >
                            <Image
                                src={graphImage}
                                alt=''
                                fill={true}
                                style={{
                                    borderRadius: '16px',
                                }}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                <Link target='_blank' href='/calendar' sx={{ alignSelf: 'center', mt: 4, mb: 10 }}>
                    View Full Class Calendar
                </Link>

                <Typography variant='h5' textAlign='center' sx={{ mb: 3 }}>
                    Not interested in group classes?
                </Typography>
                <Typography variant='h6' textAlign='center'>
                    ChessDojo Core provides a full training plan, a game database and annotation
                    tool, self-paced opening courses, unlimited puzzles, and more. Use code{' '}
                    <strong>BLACKFRIDAY</strong> for <strong>25% off</strong> through December 2nd.
                </Typography>

                <Button
                    color='dojoOrange'
                    variant='contained'
                    sx={{ alignSelf: 'center', my: 3, fontWeight: 'bold' }}
                    size='large'
                    href='/prices'
                >
                    Join Now with 25% Off
                </Button>

                <Typography variant='h4' mt={10} textAlign={'center'}>
                    A Brief and Personal History of ChessDojo's Group Classes
                </Typography>
                <Typography variant='h6' color='text.secondary' textAlign='center'>
                    GM Jesse Kraai describes the story behind ChessDojo's new classes.
                </Typography>

                <Typography mt={4}>
                    When we started the Dojo Training Program using a Google Doc on May 1st 2022 we
                    felt strongly about the three principles we built it around:
                    <br />
                    <br />
                    1) You have to play longer games and analyze those games.
                    <br />
                    2) You need a plus, minus, equal — that is, someone to learn from, someone to
                    teach, and a group of equals to spar and train with.
                    <br />
                    3) You need a structured plan to follow, and you have to commit to that plan.
                    <br />
                    <br />
                    <br />
                    <strong>The First Principle</strong>
                    <br />
                    <br /> I say we felt strongly about these principles, but we weren’t especially
                    confident that anyone would follow the first one. I was a glaring example of the
                    first principle’s problem: I had resisted seriously studying my own games. It
                    was such a hard and painful process that I couldn’t bring myself to do it with
                    any kind of religion for years. But since I knew that the process did payoff and
                    that I eventually did make GM with that process, I knew it had to be the first
                    principle of our training program. <br />
                    <br />
                    It was also true that I had for years been spectacularly unsuccessful as a coach
                    in getting my students to look seriously at their games. So I was completely
                    unsure if the most important part of the program would be followed at all.
                    <br />
                    <br />
                    The miracle of the Dojo came when we started getting many great annotations in
                    the summer of 2022. And I’ve been reflecting for three years on how this miracle
                    happened. After reviewing thousands of game annotations submitted by Dojo
                    students in our weekly graduation show, I have two thoughts:
                    <br />
                    <br />
                    1) Players under 1700 have less of their identity tied up in the game, and it’s
                    therefore easier for them to look at their mistakes.
                    <br />
                    2) My students knew I would look at their games in our lessons. And so I became
                    their unwitting crutch. I became their way out of not looking at their games.
                    <br />
                    <br />
                    We were able to showcase some of the best annotations we received from across
                    the Dojo in our book{' '}
                    <Link
                        target='_blank'
                        rel='noopener'
                        href='https://www.amazon.com/How-Analyze-Your-Games-ChessDojo-ebook/dp/B0F1DB396G?crid=6L7ON0ZPCO0Z&dib=eyJ2IjoiMSJ9.RCCH0eOd0w7icZoESeNmwg.sUjHC_06CmYbDBsJMSi2ZN8AFpiwq55uR5cVkiMTewU&dib_tag=se&keywords=how+to+analyze+your+games+chessdojo&qid=1763940105&sprefix=how+to+analyze+your+games%2Caps%2C169&sr=8-1'
                    >
                        How to Analyze Your Games
                    </Link>
                    . But despite this success, there are many Dojoers who have not found their way
                    to game analysis. The grad show can be deceiving because the people who graduate
                    are the same ones who are analyzing their games. So it can seem like everyone is
                    doing it when that is not actually true. I knew this was a problem, but for a
                    long time I didn’t know what to do about it.
                    <br />
                    <br />
                    <br />
                    <strong>Plus, Minus, Equal</strong>
                    <br />
                    <br /> We were by contrast much more confident that we could get people to work
                    together. We already had a very encouraging and helpful Discord server prior to
                    launch. But here our confidence was misplaced. We’ve struggled to match players
                    with teachers and training partners. At one point, we were convinced that all we
                    needed was a calendar where players could schedule their availability. That
                    would solve all our problems. And our lead developer started working with us by
                    building a beautiful calendar. But that calendar found very little use. It turns
                    out that putting people together is a difficult task of social engineering. Like
                    game analysis, it was a problem I didn’t know how to address.
                    <br />
                    <br />
                    <br /> <strong>A Structured Plan</strong>
                    <br />
                    <br />
                    Here we nailed the intentions of the principle. We've developed daily and weekly
                    plans, as well as a training heatmap that keeps you accountable. When I do the
                    grad shows now, I consistently see the disciplined work, displayed in gorgeous
                    and colorful heatmaps, of those who graduate.
                    <br />
                    <br />
                    <br />
                    <strong>Game and Profile Reviews</strong>
                    <br />
                    <br /> A primary motivation of the Dojo was to offer serious chess training for
                    an affordable price. Personal lessons are wildly more expensive than the Dojo’s
                    $15/month. Still, several Dojoers reached out to me for personal lessons. And I
                    knew that I had personally benefited from lessons myself. I’d annotate a game
                    deeply and then show it to my grumpy Soviet coach KGB. But my biggest problem
                    was simply money. It cost too much, even though KGB was giving me a good deal. I
                    frequently had to put my lessons on hold.
                    <br />
                    <br />
                    So I decided to try teaching group lessons inside the Dojo. It was the kind of
                    thing I was looking for myself – and something I could also afford. I started
                    with a group between 1000 and 1400. In each session, we’d look at a game of one
                    of the participants. Here I was unconsciously replicating my experience with
                    KGB, where I’d analyze a game and he’d yell at me. Think of it as gentle Soviet
                    yelling.
                    <br />
                    <br />
                    That first group was great, and I started working my way up the ladder:
                    1000-1400, 1100-1500 and so on. I’m now starting 500-900, and with usually 4-5
                    participants our workshop generally lasts about a month.
                    <br />
                    <br /> Along the way I discovered two important improvements compared to my
                    lessons with KGB:
                    <br />
                    <br /> 1) I started to look at the profile of the player who was up that week at
                    the start of every class. You can tell a lot about a player from their Dojo
                    training heatmap, rating graph and tactics score. This is how the class
                    gradually evolved into game AND profile reviews. Since participants know that
                    I’ll take a look when their turn comes around, the profile review becomes a
                    simple means of holding themselves accountable.
                    <br />
                    2) The group started meeting before I met with them. They’d review the profile
                    and game of the person who was up that week. And here I witnessed some real
                    magic happening: the group work dramatically improved the annotations, the other
                    players came to the class with their own questions about the game and training
                    in general, and most importantly they were making chess friendships and finding
                    sparring partners.
                    <br />
                    <br />
                    The first impetus then to start the Game and Profile Review as a permanent tier
                    was the regret I had in leaving someone behind as I climbed up the ladder. They
                    were part of a great group, and I felt I should facilitate that group’s
                    continuation. It was also clear that the above two improvements would fill in
                    the gaps for many Dojoers. Because in our original program, it was only the
                    power users who could consistently find the courage and discipline to power
                    through their annotations all by themselves. And it was the socially confident
                    few who had found a training partner.
                    <br />
                    <br />
                    The Game and Profile Review group from 0 all the way to 800 has become something
                    of a family. They watch over each other’s progress, know everyone’s strengths
                    and weaknesses, know what I am going to yell at them for, and have celebrations
                    when someone plays a great move. Many of these players have made the effort to
                    meet in real life.
                    <br />
                    <br />
                    <br />
                    <strong>Lecture Classes</strong>
                    <br />
                    <br /> Largely due to the intimacy of the Game and Review Classes, I was
                    determined to keep the class sizes small. At the moment, eight seems like the
                    limit. A small size will of course make it much more costly than if we allowed
                    say twenty players in. The intimacy of a seminar isn’t always necessary though.
                    With bigger classes, we could radically reduce the price. And while a small
                    group is wonderful to reflect on a player’s training and games, it’s not
                    necessary for a class on the Najdorf or a series on the Dojo’s Rook Endgame
                    Progression.
                    <br />
                    <br />
                    This has been the story of how we came to launch our new venture on January 1st.
                    The Game and Profile Review will cost $200/month and the lecture classes will
                    cost $75/month. The more players that subscribe, the easier it will be to add
                    time slots, tighter rating ranges and more classes – especially classes with
                    famous instructors. Our biggest hurdle is certainly finding times that work best
                    for as many players as possible. While participants will be able to watch videos
                    of sessions they miss, we of course want you to make as many sessions as
                    possible. So while our initial schedule is fixed, we will add more slots if the
                    demand is there.
                    <br />
                    <br />
                    Signing up early guarantees you a spot and if you do so for Black Friday (until
                    Dec 2) you can get 25% off your first month of any tier. So{' '}
                    <Link href='/prices'>join now</Link> and start training today!
                </Typography>
            </Stack>
        </Container>
    );
}
