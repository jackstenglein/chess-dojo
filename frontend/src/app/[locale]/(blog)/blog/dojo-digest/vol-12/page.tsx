import { Box, Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import filesImage from './dojo-files.png';

export const metadata: Metadata = {
    title: 'Introducing the Dojo File System | ChessDojo Blog',
    description: `The Dojo has a new file system to help you organize and manage your games! A new files tab has been added to your profile. You'll start out with an empty Home folder, where you can add games or nested folders...`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Games', 'Repertoire', 'File System'],
};

export default function DojoDigestVol12() {
    return (
        <Container>
            <Header
                title='Introducing the Dojo File System'
                subtitle='Dojo Digest Vol 12 • September 1, 2024'
                hideDivider
                image={filesImage}
                imageCaption='In this example, the user has created a White folder, which contains an e4 folder and two games.'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Site Updates
                </Typography>

                <Typography mt={2}>
                    <strong>Dojo File System</strong> - The Dojo has a new file system to help you
                    organize and manage your games! A new{' '}
                    <Link href='https://www.chessdojo.club/profile?view=games&utm_source=newsletter&utm_medium=email&utm_campaign=digest12'>
                        files
                    </Link>{' '}
                    tab has been added to your profile. You'll start out with an empty Home folder,
                    where you can add games or nested folders.
                </Typography>

                <Typography mt={2}>
                    Here are some of the important features of our file system:
                </Typography>
                <ul>
                    <li>
                        <strong>Nested Folders</strong> - Creating folders within folders allows you
                        to organize your games in whatever level of granularity you prefer.
                    </li>

                    <li>
                        <strong>Public/Private Folders</strong> - You can choose to make some
                        folders public for everyone in the Dojo to see and keep others private to
                        avoid leaking prep.
                    </li>

                    <li>
                        <strong>One Game, Multiple Folders</strong> - Add the same game to multiple
                        folders, and the Dojo will keep any changes or comments in sync across all
                        the folders.
                    </li>

                    <li>
                        <strong>Add Others' Games</strong> - Find an instructive game from another
                        Dojoer or from our Masters Database? You can add those games to your folders
                        as well.
                    </li>

                    <li>
                        <strong>No Limits</strong> - Unlike Lichess studies, there's no limit on the
                        number of games you can add to a Dojo folder. Likewise, there's no limit on
                        the number of nested folders you can create.
                    </li>

                    <li>
                        <strong>Free Tier</strong> - Folders are available on the free tier,
                        although cannot be set to private.
                    </li>
                </ul>

                <Typography mt={4}>
                    <strong>Dojo Arenas</strong> - Way back at the beginning of the Dojo, the
                    senseis hosted a Twitch show called Friday Night Fights, where they commentated
                    live viewer games. IM David Pruess is now reinstating that tradition, along with
                    Saturday rapid arenas! Friday Night Fights begins at 11pm ET / 5am CET and the
                    Rapid arenas begin at 12 ET / 6pm CET every Saturday. Live commentary on the
                    events can be found on
                    <Link href='http://www.twitch.tv/ChessDojo'>Twitch</Link> and{' '}
                    <Link href='https://www.youtube.com/channel/UC4liTXRJ-XknH6OtKz-tOuw'>
                        YouTube
                    </Link>
                    .
                </Typography>

                <Typography mt={4}>
                    <strong>Time to Do What</strong> - Sensei Kraai is almost done with a new
                    Chessable course featuring forty training positions from Dojo games in the
                    1000-1500 range, covering the most common opportunity at this level: your
                    opponent has given you time, and you have to figure out what to do. "Das Tempo
                    ist die Seele des Schaches (Time is the Soul of Chess)" – Siegbert Tarrasch
                </Typography>

                <Typography mt={4}>
                    <strong>Teams</strong> - Are you part of a scholastic or competitive club team?
                    Let us know! We’d like to bring your teammates to the Dojo and give you a
                    customized scoreboard. We believe the Dojo is the place for teams to track their
                    progress, be competitive with one another and challenge other teams.
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>

                <Typography mt={2}>
                    <Link href='https://www.chessdojo.club/profile/90957cf2-7e8c-43a7-a4f3-f063f24e3781?utm_source=newsletter&utm_medium=email&utm_campaign=digest12'>
                        LifeCanBeSoNice
                    </Link>{' '}
                    (1300-1400 cohort) was featured on the Chess Journeys podcast! Check it out in
                    the
                    <Link href='https://podcasts.apple.com/ro/podcast/ep-162-jan-1750-lichess/id1577673957?i=1000666999123'>
                        Podcasts App
                    </Link>{' '}
                    or on <Link href='https://www.youtube.com/watch?v=zuwepG2s5bM'>YouTube</Link>.
                </Typography>

                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/google_116965833709584043772?utm_source=newsletter&utm_medium=email&utm_campaign=digest12'>
                        Thorbiddles
                    </Link>{' '}
                    (1900-2000 cohort) just reached an all new high rating on Lichess rapid with
                    2400! Next goal is 2000 USCF!
                </Typography>

                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/ed6d3ae0-2f6a-45d5-b986-94af72abe537?utm_source=newsletter&utm_medium=email&utm_campaign=digest12'>
                        Minh (Dial)
                    </Link>{' '}
                    (1200-1300 cohort) recently defeated their first 2400+ rated player on Lichess!
                    Dial is white in the game.
                </Typography>

                <Box
                    sx={{
                        width: 1,
                        aspectRatio: '1/1',
                        position: 'relative',
                        mb: 2,
                        mt: 1,
                    }}
                >
                    <Image
                        src='https://chess-dojo-images.s3.amazonaws.com/emails/minh-game.gif'
                        alt=''
                        style={{ borderRadius: '8px' }}
                        fill
                    />
                </Box>

                <DojoAchievements
                    rating='155,364'
                    hours='76,497'
                    points='56,813'
                    graduations='1,802'
                />

                <Footer utmCampaign='digest12' />
            </Stack>
        </Container>
    );
}
