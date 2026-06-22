import { Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import activityHeatmapImage from './activity-heatmap.png';
import kostyaImage from './kostya-italy.jpg';
import stockfishImage from './stockfish.png';

export const metadata: Metadata = {
    title: 'Stockfish Now Available in Game Annotator | ChessDojo Blog',
    description: `Stockfish 17 (desktop version) and Stockfish 16 (mobile version) are now both available in our game annotator. Both engines run locally in your browser, although...`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Stockfish', 'Engine'],
};

export default function DojoDigestVol13() {
    return (
        <Container>
            <Header
                title='Stockfish Now Available in Game Annotator'
                subtitle='Dojo Digest Vol 13 • October 1, 2024'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Site Updates
                </Typography>

                <Typography mt={2}>
                    <strong>Engines</strong> - Stockfish 17 (desktop version) and Stockfish 16
                    (mobile version) are now both available in our game annotator. Both engines run
                    locally in your browser, although we plan to add stronger, cloud-based engines
                    soon. Of course, with great power comes great responsibility, and the Dojo has
                    always advocated thoughtful analysis rather than regurgitating engine lines. We
                    still encourage all our users to fully analyze their games on their own and come
                    to their own conclusions before checking the engine. To push you in the right
                    direction, clicking a new engine line will add a fish icon to your PGN, so that
                    everyone can see which moves were found with Stockfish:
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={stockfishImage}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        In this example, the user did not originally have the move 1. Nf3 in their
                        analysis and added it by consulting the engine.{' '}
                    </Typography>
                </Stack>

                <Typography mt={4}>
                    <strong>Activity Heatmap</strong> - We've added a new section to the profile
                    page. You can now see at a glance how active you've been over the past year. In
                    his recent graduation,{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/profile/google_102801260328015030188?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        Covbob
                    </Link>{' '}
                    said, "I discovered it this week and it's driving me to be more consistent about
                    my chess work instead of fits and starts." By looking at his heatmap, you can
                    see the exact date he discovered it:
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={activityHeatmapImage}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        Covbob's activity heatmap. He's started a great streak!
                    </Typography>
                </Stack>

                <Typography mt={4}>
                    <strong>New Rating Translator</strong> - We've finally updated our rating
                    translator to account for the FIDE boost in March, Lichess inflation, and
                    general inconsistencies between the different rating systems. We believe the
                    changes will make your new cohort more accurate and your peers closer to you in
                    strength. Huge thanks to{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/profile/google_114391023466287136398?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        NoseKnowsAll
                    </Link>{' '}
                    for crunching the data and coming up with the new numbers! You can find the new
                    conversion table{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/material/ratings?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        here
                    </Link>
                    , and read our blog posts{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/blog/new-ratings?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        here
                    </Link>{' '}
                    and{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/blog/new-ratings/noseknowsall?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        here
                    </Link>{' '}
                    for more information.
                </Typography>

                <Typography mt={4}>
                    <strong>Dojo Arenas</strong> - Way back at the beginning of the Dojo, the
                    senseis hosted a Twitch show called Friday Night Fights, where they commentated
                    live viewer games. IM David Pruess is now reinstating that tradition, along with
                    Saturday rapid arenas! Friday Night Fights begins at 11pm ET / 5am CET and the
                    Rapid arenas begin at 12 ET / 6pm CET every Saturday. Live commentary on the
                    events can be found on{' '}
                    <Link target='_blank' href='http://www.twitch.tv/ChessDojo'>
                        Twitch
                    </Link>{' '}
                    and{' '}
                    <Link
                        target='_blank'
                        href='https://www.youtube.com/channel/UC4liTXRJ-XknH6OtKz-tOuw'
                    >
                        YouTube
                    </Link>
                    .
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>

                <Typography mt={2}>
                    Sensei Kostya continued his tour around Europe, playing in the 28th GHA
                    International Chess Festival in Italy. He had his best tournament in a while and
                    tied for first (second on tiebreaks) with a score of 6.5/9 and a performance
                    rating of 2463.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kostyaImage}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        L-R: Kostya, GM Alsina Leal, FM Kalosha, Andrea Rebegianni
                    </Typography>
                </Stack>

                <Typography mt={2}>
                    From there, Kostya continued on to Budapest to watch the Olympiad. You can read
                    his takeaways from the Olympiad on{' '}
                    <Link
                        target='_blank'
                        href='https://hellokostya.substack.com/p/12-things-i-learned-from-the-budapest'
                    >
                        his blog
                    </Link>
                    , and make sure to check out his{' '}
                    <Link target='_blank' href='https://www.youtube.com/watch?v=ihXw3q8UMdM'>
                        interview with ChessBase India
                    </Link>
                    !
                </Typography>

                <Typography mt={2}>
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/blog/player-spotlight/lifecanbesonice?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        LifeCanBeSoNice
                    </Link>{' '}
                    and{' '}
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/blog/player-spotlight/dandeer?utm_source=newsletter&utm_medium=blog&utm_campaign=digest13'
                    >
                        Dandeer
                    </Link>{' '}
                    were both featured in the Dojo's new Player Spotlight blogs. If you'd like to be
                    featured, let us know{' '}
                    <Link
                        target='_blank'
                        href='https://docs.google.com/forms/d/e/1FAIpQLSenHkmnr88V9JEGf6_L0RDvnpZ6nTX7CUJTEvGao9Lk0qbd-w/viewform'
                    >
                        here
                    </Link>
                    .
                </Typography>

                <DojoAchievements
                    rating='159,038'
                    hours='73,164'
                    points='56,897'
                    graduations='1,927'
                />

                <Footer utmCampaign='digest13' />
            </Stack>
        </Container>
    );
}
