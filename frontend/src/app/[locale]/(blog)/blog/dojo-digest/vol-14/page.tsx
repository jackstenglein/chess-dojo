import { Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import image from './share-directory.png';

export const metadata: Metadata = {
    title: 'New Folder Sharing and Other Updates | ChessDojo Blog',
    description: `Two months ago, we announced our file system for organizing your games and repertoires. Today, we're releasing a major update, which allows you to share folders with other users.`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Games', 'Repertoire'],
};

export default function DojoDigestVol14() {
    return (
        <Container>
            <Header
                title='New Folder Sharing and Other Updates'
                subtitle='Dojo Digest Vol 14 • November 1, 2024'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Site Updates
                </Typography>

                <Typography mt={2}>
                    <strong>File Sharing</strong> - Two months ago, we announced our file system for
                    organizing your games and repertoires. Today, we're releasing a major update,
                    which allows you to share public or private folders with other users. You can
                    add users as viewers, editors or admins.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={image}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        In this example, we are giving the user Jalp editor access to the White
                        Repertoire folder.
                    </Typography>
                </Stack>

                <Typography mt={4}>
                    Viewers can see all games and nested folders but cannot make any changes.
                    Editors can add games and remove games that they added, but cannot create nested
                    folders or remove games added by other users. Admins can do everything except
                    delete the folder.
                </Typography>

                <Typography mt={2}>
                    We see this as a great way for coaches and students to collaborate, and we're
                    excited to see what people do with it!
                </Typography>

                <Typography mt={4}>
                    <strong>Engines</strong> - If you missed it last month, Stockfish 16 and 17 are
                    now available in the Dojo's game annotator. Since then, we've added some new
                    features:
                </Typography>

                <ul>
                    <li>
                        You can view the engine's expected Win/Draw/Loss percentages under the main
                        eval. In the engine settings, there is an option called Primary Eval Type.
                        You can use this to display WDL percentages next to each line instead of the
                        normal numeric eval.
                    </li>
                    <li>
                        Clicking on the eval box next to a line will add that full line to your PGN
                        and insert a comment with the engine name, eval, depth and WDL percentages.
                    </li>
                    <li>
                        There is now an option in the engine settings and the game viewer settings
                        to highlight the full engine line in the PGN text, in addition to the fish
                        icon that displays at the start of the line.
                    </li>
                </ul>
                <Typography>
                    Remember, don't check your games with the engine until you've finished your own
                    analysis.
                </Typography>

                <Typography mt={4}>
                    <strong>Teams</strong> - Are you part of a scholastic or European club team? Let
                    us know! We would like to bring your teammates to the Dojo and see you with them
                    on a customized scoreboard. We believe the Dojo is the place for teams to track
                    their progress, be competitive with one another and challenge other teams.
                </Typography>

                <Typography mt={4} variant='h5'>
                    Coming Soon
                </Typography>

                <Typography mt={2}>
                    <strong>THE WORLD CHAMPIONSHIP!</strong> The Dojo will do commentary for all
                    games. Tune in Nov 25 – Dec 15 on{' '}
                    <Link href='https://www.twitch.tv/chessdojo' target='_blank'>
                        Twitch
                    </Link>{' '}
                    and{' '}
                    <Link href='https://www.youtube.com/@ChessDojo' target='_blank'>
                        YouTube
                    </Link>
                    .
                </Typography>

                <Typography mt={3}>
                    <strong>Alex Sherzer Memorial</strong> - Alex was a good friend of Sensei Kraai
                    and loads of old champions are coming out to honor his memory Nov 1-3 in
                    Washington DC: GMs Patrick Wolff, Benjamin, Fishbein and IM Stuart Rachels. Will
                    Kraai continue his good form from this summer's senior and get the big 12 points
                    he needs to re-graduate back into the 2400+ cohort?
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_115587319098605190849?utm_source=newsletter&utm_medium=email&utm_campaign=digest14'
                        target='_blank'
                    >
                        Timpe
                    </Link>{' '}
                    (2000-2100 cohort) won a local tournament with 6.5/7, beating two 1900+ players
                    and two 2000+ players!
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/255d01b5-2f0c-48d8-9ecc-4033cecd17a1?utm_source=newsletter&utm_medium=email&utm_campaign=digest14'
                        target='_blank'
                    >
                        Dandeer
                    </Link>{' '}
                    (1300-1400 cohort) made the traveling team for his club's first national chess
                    championship (domestic division II in Hungary)!
                </Typography>

                <Typography mt={2}>
                    Our lead developer,{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_112538452360881134254?utm_source=newsletter&utm_medium=email&utm_campaign=digest14'
                        target='_blank'
                    >
                        JackStenglein
                    </Link>{' '}
                    (1600-1700 cohort), reached 2000 in Chess.com rapid. This was his original goal
                    when he first joined the Dojo two years ago. Next up: focusing on OTB!
                </Typography>

                <Typography mt={2}>
                    The Dojo has crossed 2000 total graduations! Great job, everyone!
                </Typography>

                <DojoAchievements
                    rating='162,609'
                    hours='79,080'
                    points='58,791'
                    graduations='2,054'
                />

                <Footer utmCampaign='digest14' />
            </Stack>
        </Container>
    );
}
