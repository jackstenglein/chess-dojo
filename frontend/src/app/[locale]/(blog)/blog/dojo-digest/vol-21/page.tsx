import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import dojo4 from './Dojo4.png';
import repertoirespy from './repertoirespy.png';
import timegraph from './timegraph.jpg';
import timemanagement from './timemanagement.jpg';

export const metadata: Metadata = {
    title: 'Annotation Workshop, Dojo Opening Scout & more!',
    description: `Annotation Workshop, Dojo Opening Scout & more!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol21() {
    return (
        <Container>
            <Header
                title='40% Off ChessDojo, New Features, & More!'
                subtitle='Dojo Digest 21 • June 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong>We launched Dojo 4.0!</strong> - In addition to dialing in the tasks in
                    our training plan, we have also released several new features that greatly
                    improve the Dojo experience. To celebrate, we're offering a 40% discount until
                    June 15th!
                </Typography>
                <Typography mt={2} variant='h6'>
                    Use code DOJO at{' '}
                    <Link href='https://www.chessdojo.club/profile' target='_blank'>
                        checkout
                    </Link>{' '}
                    for 40% off
                </Typography>

                <Typography mt={4}>
                    This one took a lot of work and was a true team effort. Below you’ll find more
                    info on each of Dojo’s new features but here’s a quick overview of the big ones:
                </Typography>
                <Typography mt={4}>
                    -The Dojo Taskmaster Algorithm now breaks down your training plan into daily and
                    weekly tasks.<br></br>
                    -The Dojo Repertoire Spy helps you prep for future opponents.<br></br>
                    -New Dojo Time Management Rating<br></br>
                    -Updated Reqs for all cohorts<br></br>
                    -Dojo AI now answers your most pressing questions
                </Typography>
                <Typography mt={4}>
                    <strong>Dojo Taskmaster</strong> — At the beginning, the training plan was built
                    around a list of tasks that a player would need to complete to make it to the
                    next level. However, this list could often feel overwhelming and create
                    indecision when choosing what to work on next. The Dojo Taskmaster is our new
                    algorithm which breaks the training plan down into daily and weekly tasks based
                    on how much time you want to train per week. You also get a beautiful heatmap so
                    that you can visualize your study patterns. Jesse did a video on the Taskmaster{' '}
                    <Link href='https://www.youtube.com/watch?v=PznFV_3EMdE' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={dojo4}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography textAlign='center' color='text.secondary'>
                    The Dojo gives you daily and weekly training tasks, as well as a heatmap to
                    track your study time.
                </Typography>

                <Typography mt={4}>
                    <strong> Repertoire Spy</strong> — Prepping for a game? Use our new tool to
                    lookup any opponent on Chess.com and Lichess. You can find the tool by opening
                    an{' '}
                    <Link href='https://www.chessdojo.club/games/analysis' target='_blank'>
                        analysis board
                    </Link>{' '}
                    and then selecting the Player tab. You can watch Jesse’s video on the tool{' '}
                    <Link href='https://www.youtube.com/watch?v=3qoZ_oCjar8' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={repertoirespy}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography textAlign='center' color='text.secondary'>
                    {' '}
                    The Repertoire Spy shows you a list of the moves played across both platforms,
                    the results, and the games themselves.
                </Typography>
                <Typography mt={4}>
                    <strong> Time Management Rating</strong> — We are now able to give your time
                    management a mathematical rating and say whether you play too fast or too slow.
                    The Dojo is very proud of this innovation and believe it will be a game-changer.
                    Below is an image of a typical GM graph, showing Shabalov-Kraai 2024:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={timemanagement}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography textAlign='center' color='text.secondary'>
                    {' '}
                    Both players stayed close to the ideal time usage (green line) and therefore
                    earned high time management ratings.
                </Typography>
                <Typography mt={4}>
                    Below is a graph of Dojo member{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_107715036750001975729'
                        target='_blank'
                    >
                        Fowgre
                    </Link>{' '}
                    (800-900 cohort) vs a random internet opponent. Fowgre used to move way too
                    fast, but here we see him thinking and his opponent using no time at all!
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={timegraph}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography textAlign='center' color='text.secondary'>
                    {' '}
                    White was closer to the ideal time usage than black and earned a higher rating,
                    but played too slowly and got the tortoise icon. Black played way too quickly
                    and got the hare icon.
                </Typography>
                <Typography mt={4}>
                    Check out Kraai’s video explaining the tool{' '}
                    <Link href='https://www.youtube.com/watch?v=3FObHhe-b9k' target='_blank'>
                        here
                    </Link>{' '}
                    as well as his video diagnosing Gukesh's time management woes{' '}
                    <Link href='https://www.youtube.com/watch?v=yMuOve76WKk' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>
                <Typography mt={4}>
                    <strong>Revamped Training Plan</strong> — Every year the Senseis think deeply
                    about the program and how to make it better. We read and interact with all of
                    the materials, listen to feedback from Dojoers and then consult on each
                    question. We made some big changes to how we count classical games played and
                    adjusted the rating ranges for our{' '}
                    <Link href='https://www.chessdojo.club/material/books' target='_blank'>
                        recommended books.
                    </Link>{' '}
                </Typography>
                <Typography mt={4}>
                    <strong>DojoAI</strong> — Got a question about the program? Ask our new DojoAI!
                    It really can answer most of your questions and gets better every day. Big
                    credit here to Jalp. Check it out{' '}
                    <Link href='https://www.chessdojo.club/help/chat' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>
                <Typography mt={4}>
                    <strong>How to Analyze Your Games — A ChessDojo Guide</strong> is out on{' '}
                    <Link
                        href='https://www.amazon.com/dp/B0F1DB396G?ref=cm_sw_r_ffobk_cp_ud_dp_28S42XTYCZ2PRHKFJN31&social_share=cm_sw_r_ffobk_cp_ud_dp_28S42XTYCZ2PRHKFJN31&bestFormat=true'
                        target='_blank'
                    >
                        Kindle
                    </Link>
                    ,{' '}
                    <Link
                        href='https://www.chessdojo.shop/product-page/how-to-analyze-your-games-a-chessdojo-guide'
                        target='_blank'
                    >
                        the ChessDojo store
                    </Link>
                    , and now{' '}
                    <Link
                        href='https://forwardchess.com/product/how-to-analyze-your-games-a-chess-dojo-guide'
                        target='_blank'
                    >
                        ForwardChess
                    </Link>
                    !
                </Typography>
                <Typography mt={4}>
                    <strong>Patreon and DojoTalks</strong> — The Dojo is trying to be more
                    consistent with our podcast, but we need your help! Head over to our{' '}
                    <Link href='https://www.patreon.com/ChessDojo' target='_blank'>
                        Patreon
                    </Link>{' '}
                    where you can get episodes early, vote on coming topics, suggest topics and
                    discuss the pod on our private Discord.
                </Typography>
                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>
                <Typography mt={4}>
                    After 30 years of casual on-and-off chess,{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/de6e55ea-9f31-4ea0-8f50-b8c043c1b386'
                        target='_blank'
                    >
                        iisha
                    </Link>{' '}
                    achieved a FIDE rating of 1579!
                </Typography>
                <Typography mt={4}>
                    Longtime Dojoer{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_103583738135510167101'
                        target='_blank'
                    >
                        cabbage9
                    </Link>{' '}
                    got an IM Norm at the Chicago Open! Cabbage found a training partner through the
                    Dojo who was instrumental in their preparation.
                </Typography>

                <DojoAchievements
                    rating='196,386'
                    hours='84,569'
                    points='56,497'
                    graduations='2,911'
                />
                <Footer utmCampaign='digest21' />
            </Stack>
        </Container>
    );
}
