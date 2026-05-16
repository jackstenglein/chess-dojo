import { Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import image from './Finochess.jpg';
import patterson from './Patterson+Clippers.png';
import roundrobin from './RoundRobin.jpg';
import sidmandoo from './sidmandoo.jpg';

export const metadata: Metadata = {
    title: 'The Heatmap has Evolved | ChessDojo Blog',
    description: `The heatmap has evolved! Many thanks to Jalp aka Noobmaster for making a vision into a reality.`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Games', 'Repertoire'],
};

export default function DojoDigestVol15() {
    return (
        <Container>
            <Header
                title='The Heatmap has evolved'
                subtitle='Dojo Digest Vol 15 • December 1, 2024'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>

                <Typography mt={2}>
                    <strong>THE WORLD CHAMPIONSHIP!</strong> - The Dojo is doing live commentary for
                    all games on{' '}
                    <Link href='https://www.twitch.tv/chessdojo' target='_blank'>
                        Twitch
                    </Link>{' '}
                    and{' '}
                    <Link href='https://www.youtube.com/@ChessDojo' target='_blank'>
                        YouTube
                    </Link>
                    . No engine commentary! Don’t follow a sad engine bar going up and down for
                    reasons unknown! For the duration of the championship, use code WC24 to get a
                    20% discount on a subscription to the{' '}
                    <Link
                        href='https://www.chessdojo.club/?utm_source=newsletter&utm_medium=email&utm_campaign=digest15'
                        target='_blank'
                    >
                        Dojo Training Program.
                    </Link>{' '}
                </Typography>

                <Typography mt={4}>
                    The heatmap has evolved! Many thanks to Jalp aka Noobmaster for making a vision
                    into a reality. Take a look at{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/a01c4934-cf7b-4327-b71d-bb3e0a364a4c?utm_source=newsletter&utm_medium=email&utm_campaign=digest15'
                        target='_blank'
                    >
                        FinoChess’s
                    </Link>{' '}
                    heatmap:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={image}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={2}>
                    Let’s do another one because they are so pretty. Here is{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_109298489842354097766?utm_source=newsletter&utm_medium=email&utm_campaign=digest15'
                        target='_blank'
                    >
                        Sidmandoo's
                    </Link>{' '}
                    heatmap:
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={sidmandoo}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    At a glance, we can now see how much a Dojoer has been playing and what kind of
                    work they’ve done. Sensei Kraai is seeing an immediate impact in the graduation
                    show (Twitch.tv/ChessDojo at 12 ET every Wednesday and Thursday!). Dojoers are
                    now thinking about the heatmap (I need to do some sweatwork today) and it’s
                    showing up in the maps. It comes as no surprise that the best maps are being
                    produced by those making progress and graduating. Senseis are feeling it too, I
                    gotta do some sweatwork today. It becomes a subconscious urge that leads to
                    better habits.
                </Typography>

                <Typography mt={4}>
                    <strong>Round Robin Tournaments</strong> - Jalp also gets credit for creating
                    the{' '}
                    <Link href='https://www.chessdojo.club/tournaments/round-robin' target='_blank'>
                        Dojo Round Robin.
                    </Link>{' '}
                    It’s a beautiful new tournament with a simple idea: the first 10 players to sign
                    up from a cohort form a round robin that lasts three months. We already have
                    several cohorts with more than one section! Below is a look at the 11-1200
                    cohort tournament already underway.{' '}
                    <Link href='https://www.chessdojo.club/tournaments/round-robin' target='_blank'>
                        Sign up here.
                    </Link>
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={roundrobin}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

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
                    Are you part of a team that wants to have their own scoreboard where you can all
                    follow a program? Then do as the{' '}
                    <Link
                        href='https://www.chessdojo.club/clubs/cb7af173-8eea-4e28-8cdb-da76a7e9e00d?view=scoreboard'
                        target='_blank'
                    >
                        Patterson Clippers
                    </Link>{' '}
                    – get that team on the Dojo and win some trophies:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={patterson}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/90957cf2-7e8c-43a7-a4f3-f063f24e3781'
                        target='_blank'
                    >
                        LifeCanBeSoNice
                    </Link>{' '}
                    defeated a GM in the Lichess Bundesliga with the Dojo Team! Check out his video
                    of the game here.
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/0fed9f5f-0130-4838-aa0e-022fe22ce09a'
                        target='_blank'
                    >
                        TristanBrown17
                    </Link>{' '}
                    won a 16 round blitz tournament for Class C and below players!
                </Typography>

                <Typography mt={2}>
                    {' '}
                    <Link
                        href='https://www.chessdojo.club/profile/d34225b1-7332-4cf2-b8e2-3c27d0fef8f8'
                        target='_blank'
                    >
                        Chris
                    </Link>{' '}
                    recently crosssed 1000 Chess.com Rapid rating! Chris has said he's seen a big
                    improvement since joining the Dojo.
                </Typography>

                <Typography mt={2}>
                    The Dojo has crossed 2000 total graduations! Great job, everyone!
                </Typography>

                <DojoAchievements
                    rating='164,156'
                    hours='82,284'
                    points='60,302'
                    graduations='2,169'
                />

                <Footer utmCampaign='digest15' />
            </Stack>
        </Container>
    );
}
