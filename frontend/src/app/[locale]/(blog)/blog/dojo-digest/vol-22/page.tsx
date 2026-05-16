import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import kostya from './kostya.webp';
import wayofkings from './wayofkings.webp';
import youtubeaward from './youtube.webp';

export const metadata: Metadata = {
    title: 'Annotation Workshop, Dojo Opening Scout & more!',
    description: `Annotation Workshop, Dojo Opening Scout & more!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol22() {
    return (
        <Container>
            <Header title='100,000 YouTube Subscribers!' subtitle='Dojo Digest 22 • July 1, 2025' />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong>100,000!</strong> — The big news this month is that we crossed 100,000{' '}
                    <a href='https://www.youtube.com/@ChessDojo'>YouTube</a> subscribers. It’s been
                    a long journey! Long before we even began the Training Program we started the
                    Dojo as a YouTube and Twitch chess education platform – way back in 2020.
                    Getting to 1000 subs was an early goal that we truly had to grind to get. Many
                    think we make money on <a href='https://www.youtube.com/@ChessDojo'>YouTube</a>{' '}
                    but we actually lose money, as we have to pay for editing. So if you enjoy our
                    content, please consider joining our{' '}
                    <a href='https://www.patreon.com/ChessDojo'>Patreon</a>. YouTube is the main way
                    chess players find out about us and that keeps us doing what we do.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={youtubeaward}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    <strong>Dojo Game Annotation Workshop</strong> — Want to review your game with
                    Sensei Kraai? The next Game Annotation Workshop will start on July 7th and is
                    for players between 1300-1600 (1550-1850 Chess.com). Register{' '}
                    <a href='https://www.chessdojo.club/calendar/availability/b96857c1-a0a8-4e4a-b8da-13f0aabe8132?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        here
                    </a>
                    .
                </Typography>
                <Typography mt={4}>
                    <strong>Patterson Clippers Win Again!</strong> — The Patterson Clippers won the
                    Baltimore City High School Championship for a second time in a row, beating out
                    the fancy kids from the fancy school! How did they do it? Their coach Chris
                    Baron used the Dojo! Do you know a school that could make use of the Dojo? If
                    so, let us know. All you need is a teacher who is willing to give a room to the
                    team and set their kids up on the Dojo site.
                </Typography>
                <Typography mt={4}>
                    <strong>Unified Games/Files</strong> — Analyzing our games is one of the pillars
                    of the Dojo. Our site previously had a Games and Files tab on your profile page,
                    but we've simplified this into one single Games tab. You will now see a folder
                    called All My Uploads when go to your Games tab. While most Dojoers will have
                    only this one folder, you can of course create as many folders as you like –
                    classic games you’ve studied, opening files etc. In the near future, we will
                    also add a folder called My Games, which you can use to store your serious
                    classical games. Our ambition with this folder is that we will soon be able to
                    use it for tools like your performance stats and your time management rating.
                </Typography>

                <Typography mt={4}>
                    {' '}
                    <p>
                        <strong>Get Your Dojo Tag!</strong> The Dojo Discord tag is now available
                        and you should see it as an option next time you sign into Discord. Get it
                        for the Dojo!
                    </p>
                </Typography>

                <Typography mt={4}>
                    {' '}
                    <strong>The Way of Kings</strong> — The great stormfather of the Dojo, Jack
                    Stenglein, is a huge fan of this book, and so is Sensei Pruess. It’s become the
                    summer read for Sensei Kraai. So if you hear talk of shardblades or rotspren,
                    this book is where it’s from.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={wayofkings}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

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
                    {' '}
                    Sensei Kostya capped off his Eurotrip by winning the 1st Vigevano International!
                    Finishing in clear first with 6.5/7, he played alongside Dojoer Matthew Perchard
                    (<a href='https://twitch.tv/houseline'>twitch.tv/houseline</a>).
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kostya}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    Former Dojo dev{' '}
                    <a href='https://www.chessdojo.club/profile/google_116283565832457781013?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        Jalp
                    </a>{' '}
                    came in 2nd in a CFC tournament, beating an IM rated 2550 CFC!
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/03ba3dc3-6f34-41d3-b238-39b04e47e274?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        Mcbrownie220
                    </a>{' '}
                    recently played in their first rated chess tournament ever!
                </Typography>
                <Typography mt={4}>
                    {' '}
                    <a href='https://www.chessdojo.club/profile/google_116371905453053128333?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        Master_Toaster
                    </a>{' '}
                    played in the Flemish Championship in northern Belgium and won the open section
                    on tiebreaks after scoring 5 wins (including a victory over the top seed rated
                    2103) and 2 draws. With a performance rating over 2200, they've qualified to
                    play in the closed section next year.
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_106950264843652082297?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        LargoLaGrande
                    </a>{' '}
                    beat an FM for the first time in an OTB classical game! They played black
                    against the Catalan.
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/8744b593-dd41-4bce-8d9f-3abcabd5f1e3?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        John The Real McCoy
                    </a>{' '}
                    returned to chess two months ago and, in his first tournament back, tied for 4th
                    place with 2 out of 4 points, narrowly losing to two higher-placed opponents.
                    He's earned a provisional USCF rating over 1500!
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/8fdf7587-3c59-4446-96a4-0fdca2a4d948?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        biker-linz
                    </a>{' '}
                    played in his first competitive OTB game and won, earning his first ECF rating!
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/52965a1d-993a-421c-a98b-bd4cce2ef00e?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        Norzius
                    </a>{' '}
                    and{' '}
                    <a href='https://www.chessdojo.club/profile/google_104186277850925094929?utm_source=newsletter&utm_medium=email&utm_campaign=digest22'>
                        Alvin_Cruz
                    </a>{' '}
                    both just hit 2000 rapid on Chess.com for the first time!
                </Typography>

                <DojoAchievements
                    rating='204,477'
                    hours='90,215'
                    points='61,650'
                    graduations='3,074'
                />
                <Footer utmCampaign='digest22' />
            </Stack>
        </Container>
    );
}
