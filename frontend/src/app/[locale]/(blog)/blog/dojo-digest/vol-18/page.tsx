import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import badges from './badges.png';
import kasparov from './kasparov.png';
import masteringtime from './mastering-time.jpg';

export const metadata: Metadata = {
    title: 'New Courses, Badges, & more! | ChessDojo Blog',
    description: `Mastering Time in Chess is finally out on Chessable!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol18() {
    return (
        <Container>
            <Header
                title='New Courses, Badges, & more!'
                subtitle='Dojo Digest 18 • March 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessable.com/mastering-time-in-chess/course/277570/'
                        target='_blank'
                    >
                        <strong>Mastering Time in Chess </strong>
                    </Link>
                    is finally out on Chessable! It's a follow-up to Sensei Kraai's first course{' '}
                    <Link
                        href='https://www.chessable.com/its-about-time-a-beginners-guide-to-time-in-chess/course/194972/'
                        target='_blank'
                    >
                        <strong>It’s About Time</strong>
                    </Link>
                    . In both courses, Kraai uses his experience of reviewing thousands of Dojo
                    games in the weekly graduation shows. Dojoer games are featured in both courses!
                    This second course is aimed at players between 1000 and 1600 Dojo rating
                    (1250-1850 chess.com) and trains the most important skill for these cohorts to
                    master: how to use the free tempi your opponents give you.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={masteringtime}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    Also available on Chessable is{' '}
                    <Link
                        href='https://www.chessable.com/100-tactical-patterns-you-must-know/course/283143/'
                        target='_blank'
                    >
                        <strong>100 Tactical Patterns You Must Know</strong>
                    </Link>
                    , presented by IM Kostya. Based on the book from New in Chess, the course is
                    recommended for players rated 1400-2000 OTB.
                </Typography>

                <Typography mt={4}>
                    <strong> Badges!</strong> Getting your rating up is not the only achievement in
                    chess. You can also earn ChessDojo badges for completing Polgar mates,
                    annotating games, graduating and more.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={badges}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    <strong>How to Analyze Your Games – A ChessDojo Guide</strong> is finally coming
                    out on Kindle and the ChessDojo store! Keep an eye out for it's release in the
                    coming days.
                </Typography>

                <Typography mt={4}>
                    The Dojo had a few famous guests on stream recently. We were joined by{' '}
                    <strong>13th World Chess Champion Garry Kasparov</strong> while covering the 5th
                    annual KCF University Cup! We were also joined by
                    <strong>Fabiano Caruana</strong> in our SoCal Fire Relief stream!
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kasparov}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    Patreon and DojoTalks - The Dojo is trying to be more consistent with our
                    podcast, but we need your help! Head over to our{' '}
                    <Link href='https://www.patreon.com/c/ChessDojo' target='_blank'>
                        Patreon
                    </Link>{' '}
                    where you can get episodes early, vote on coming topics, suggest topics and
                    discuss the pod on our private Discord.
                </Typography>

                <Typography mt={4}>
                    <strong>Teams</strong> - Are you part of a scholastic or European club team? Let
                    us know! We would like to bring your teammates to the Dojo and see you with them
                    on a customized scoreboard. We believe the Dojo is the place for teams to track
                    their progress, be competitive with one another and challenge other teams.
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>
                <Typography mt={4}>
                    The{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_115015475367953308508'
                        target='_blank'
                    >
                        KlutchEZ
                    </Link>{' '}
                    played in the Music City Open (Feb. 21-23), their third tournament, competing in
                    the U1800 section as a 1297-rated player. As the lowest-rated participant, they
                    received a bye in Round 1. In the next four rounds, they scored 3/4, finishing
                    tied for 2nd with 4/5 points and winning $500. Their performance earned them 261
                    rating points, raising their rating from 1297 to 1558.
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_100232598840877422187'
                        target='_blank'
                    >
                        shatterednirvana
                    </Link>{' '}
                    beat their first titled player ever! Check out the game here.
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_114391023466287136398'
                        target='_blank'
                    >
                        NoseKnowsAll
                    </Link>{' '}
                    beat a 15 year old NM to cross 2000 USCF. And on top of that, he's the proud
                    father of a new baby girl!
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_112287737382436689707'
                        target='_blank'
                    >
                        DoesHoodRatStuff
                    </Link>{' '}
                    rebounded from a low classical rating in December by dedicating time to
                    improving their chess. This month, they tied for 1st in the Dojo U1900 Open
                    Classical Tournament and gained over 150 Lichess classical Elo. They scored
                    9.5/11 in classical tournament games over the past month.{' '}
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/fc3f82c5-4cef-47f9-a2f1-47cd47078a35'
                        target='_blank'
                    >
                        AmbushRakshasa
                    </Link>{' '}
                    won his 25th USCF rated classical game, and set a new Elo best of 1126, raising
                    his OTB rating 850 points over the course of those 25 wins!
                </Typography>

                <DojoAchievements
                    rating='177,568'
                    hours='81,771'
                    points='69,201'
                    graduations='2,561'
                />
                <Footer utmCampaign='digest18' />
            </Stack>
        </Container>
    );
}
