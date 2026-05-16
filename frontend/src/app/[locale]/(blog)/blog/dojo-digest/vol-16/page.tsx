import { Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import book from './Dojo+Book.jpg';
import jessemerch from './Jesse+merch.jpg';
import kostyamerch from './Kostya+merch.jpg';
import pattersonclippers from './Patterson+Clippers.jpg';
import roundrobin from './Round+Robins.png';
import tasks from './Tasks.jpg';
import timespent from './Time+Spent.jpg';
import mattgraph from './mattchess.png';

export const metadata: Metadata = {
    title: 'Free Month at the Dojo | ChessDojo Blog',
    description: `Make your New Year’s resolution and join the Dojo for the month of January at no cost!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Games', 'Repertoire'],
};

export default function DojoDigestVol16() {
    return (
        <Container>
            <Header
                title='Free Month at the Dojo'
                subtitle='Dojo Digest Vol 16 • January 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong>Free Month at the Dojo</strong> - Make your New Year’s resolution and
                    join the Dojo for the month of January at no cost! Use the code{' '}
                    <strong>NY25</strong> when signing up. The code only lasts until the 7th, so
                    don't wait!
                </Typography>

                <Typography mt={2}>
                    <strong>Merch Sale</strong> - Get 20% off anything in our{' '}
                    <Link href='https://www.chessdojo.shop/shop' target='_blank'>
                        shop
                    </Link>{' '}
                    with the code
                    <strong> WINTERDOJO</strong>. It’s time to gear up for the 2025 tournament
                    season.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kostyamerch}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={jessemerch}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    How to Analyze Your Games – Our book has finally been released! You can order it{' '}
                    <Link href='https://amzn.to/40iwtHf' target='_blank'>
                        here.
                    </Link>{' '}
                    The entire Dojo helped made this book happen. As Sensei Kraai likes to say: the
                    miracle of the Dojo is that players of all levels took up and enjoyed the task
                    of annotating their games. It was not at all clear that we could get players to
                    do it, but we knew they would have to if they wanted to progress. Watch Jesse's
                    video about the book{' '}
                    <Link href='https://www.youtube.com/watch?v=yqg4yRWECqk' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={book}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography textAlign='center' color='text.secondary'>
                    It’s a fattie that measures up to Silman’s Reassess Your Chess!
                </Typography>

                <Typography mt={2}>
                    <strong>ChessDojo Postmortem</strong> - See a review of your 2024 with the Dojo{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_111981832898340390525/postmortem/2024'
                        target='_blank'
                    >
                        here!
                    </Link>{' '}
                    Here are Sensei Kraai’s top ten tasks:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={tasks}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    And here his time spent by category. Is he skipping leg day?
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={timespent}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <strong>Best Social Media Prize</strong> - Sebastian Bastoun (SBastoun) won our
                    first social media contest, winning a free year at the Dojo. Congratulations,
                    Sebastian! Check out his video{' '}
                    <Link href='https://www.youtube.com/watch?v=K__kPy9xn84' target='_blank'>
                        here.
                    </Link>{' '}
                    We will be running more contests like this in the near future, so get those vids
                    ready.
                </Typography>
                <Typography mt={4}>
                    <strong>Round Robins</strong> - Our tournaments are now accepting registrations
                    again! We've migrated registration from Discord onto the site, so sign up{' '}
                    <Link href='https://www.chessdojo.club/tournaments/round-robin' target='_blank'>
                        here.
                    </Link>{' '}
                    It’s the best way to get a regular classical game when you can’t make it to a
                    tournament – no cheaters or players moving ultra fast, and you’ll often get a
                    post-mortem. We now have at least one tournament in most cohorts. The
                    tournaments are currently limited to Dojo subscribers, but we’re hoping to open
                    the tournaments up to non-Dojo players in the near future. Below is the
                    crosstable for the 16-1700 cohort.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={roundrobin}
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

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>
                <Typography mt={4}>
                    The{' '}
                    <Link
                        href='https://www.chessdojo.club/clubs/cb7af173-8eea-4e28-8cdb-da76a7e9e00d'
                        target='_blank'
                    >
                        Patterson Clippers
                    </Link>{' '}
                    continue to dominate their scholastic league, training with the Dojo. Below is
                    their victory pic from Mid-Atlantic Regionals. Kanniya Gardner didn’t lose a
                    single game and tied for first in the advanced division while Brandon Lopez tied
                    for second in the u/800. Are you part of a team that wants to have their own
                    scoreboard where you can all follow a program? Get that team on the Dojo and win
                    some trophies.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={pattersonclippers}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/fe9cec0a-adf7-4a5e-9d3a-f631137966be'
                        target='_blank'
                    >
                        DMStewart1981
                    </Link>{' '}
                    was the Chief Tournament Director for the Tulsa Holiday Open, which was the last
                    credit he needed to test for the USCF Local TD certification!
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_107238115453425042124'
                        target='_blank'
                    >
                        Mattchess
                    </Link>{' '}
                    recently got his 2nd ICCF Correspondence IM norm so he's officially qualified
                    for his ICCF IM title! Check out the "Dojo Effect" in his chess journey:{' '}
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={mattgraph}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <DojoAchievements
                    rating='166,969 '
                    hours='89,205 '
                    points='64,653 '
                    graduations='2,272 '
                />
                <Footer utmCampaign='digest16' />
            </Stack>
        </Container>
    );
}
