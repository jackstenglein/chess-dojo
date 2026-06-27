import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import yearStats from './2024+stats.png';
import customTasks from './custom+tasks.png';
import heatmap from './heatmap.png';

export const metadata: Metadata = {
    title: 'Round Robin Tournaments, Custom Tasks, & More | ChessDojo Blog',
    description: `Round robin tournaments are open for non-members, and you can now create custom tasks in your training plan!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol17() {
    return (
        <Container>
            <Header
                title='Round Robin Tournaments, Custom Tasks, & More!'
                subtitle='Dojo Digest 17 • February 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong>2024 was a great year for the Dojo</strong> - We introduced the Tactics
                    Trainer, the Heatmap, the Dojo Database and many other new features. But more
                    important than all that, we saw 81,000+ rating points gained and 1,900
                    graduations!
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={yearStats}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <strong>Round Robin Tournaments</strong> – Our new tournaments have been a huge
                    success — most cohorts have more than one ongoing tournament. And now we're
                    opening them up to non-members! For just $2, you get a 9-round classical
                    tournament against players who are at your level and usually willing to do
                    post-mortems to jumpstart the game annotation process. Sign up{' '}
                    <Link
                        href='/tournaments/round-robin?utm_source=newsletter&utm_medium=blog&utm_campaign=digest17'
                        target='_blank'
                    >
                        here
                    </Link>
                    .
                </Typography>

                <Typography mt={4}>
                    <strong>Custom Tasks</strong> – You can now create custom tasks in any category
                    of the training plan, and it will show in that category on your activity
                    heatmap. Custom tasks also support arbitrary goals now and allow you to track
                    your progress just like the default tasks in the training plan.
                </Typography>

                <Stack mt={2} alignItems='center' spacing={1}>
                    <Image
                        src={customTasks}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography>
                        <em>Creating a custom task for a book with 240 pages.</em>
                    </Typography>
                </Stack>

                <Stack mt={3} alignItems='center' spacing={1}>
                    <Image
                        src={heatmap}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography>
                        <em>Custom tasks are striped on your activity heatmap.</em>
                    </Typography>
                </Stack>

                <Typography mt={4}>
                    <strong>How to Analyze Your Games</strong> – Our book is out! You can get a copy{' '}
                    <Link
                        href='https://www.amazon.com/How-Analyze-Your-Games-ChessDojo/dp/B0DP2X1T9D'
                        target='_blank'
                    >
                        here
                    </Link>
                    . If you prefer eBooks, we will have one available soon. Keep an eye out to get
                    your copy!
                </Typography>

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
                        href='/profile/fe9cec0a-adf7-4a5e-9d3a-f631137966be?utm_source=newsletter&utm_medium=blog&utm_campaign=digest17'
                        target='_blank'
                    >
                        DMStewart1981
                    </Link>{' '}
                    passed his USCF Local TD test and is now certified as a Local Tournament
                    Director!
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='/profile/google_116100455602249006987?utm_source=newsletter&utm_medium=blog&utm_campaign=digest17'
                        target='_blank'
                    >
                        nmp123
                    </Link>{' '}
                    got a score of 4.5/5 on January 15th for a casual tournament and won a king
                    trophy for second place! He also scored 3/4 for his first CFC tournament of the
                    year!
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='/profile/9ad63b1e-cd90-4cf4-91df-8dd8b96106ed?utm_source=newsletter&utm_medium=blog&utm_campaign=digest17'
                        target='_blank'
                    >
                        Adam Greener
                    </Link>{' '}
                    just hit 2000 Chess.com rapid after joining the Dojo in 2023 with a rating of
                    1884! Keep an eye out for one of his games in a graduation show soon!
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='/profile/36ccb6c6-9562-4b01-aa53-d342aeaac08c?utm_source=newsletter&utm_medium=blog&utm_campaign=digest17'
                        target='_blank'
                    >
                        Stephen K
                    </Link>{' '}
                    got his first official FIDE standard rating of 1836!
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='/profile/google_105412173001395693513?utm_source=newsletter&utm_medium=blog&utm_campaign=digest17'
                        target='_blank'
                    >
                        corporeal
                    </Link>{' '}
                    started following the Dojo in March of 2021 as a 1400 on Chess.com. They had a
                    secret goal of breaking 2000, which they just did!
                </Typography>

                <DojoAchievements
                    rating='180,714'
                    hours='93,180'
                    points='67,680'
                    graduations='2,454'
                />
                <Footer utmCampaign='digest17' />
            </Stack>
        </Container>
    );
}
