import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import brisbane from './brisbane-pub-chess.jpg';
import dinner from './dinner.webp';
import kraaichamp from './kraaichamp.jpg';

export const metadata: Metadata = {
    title: 'My Games Folder, Annotation Workshop, & Other News',
    description: `All Dojo users now have a default folder called My Games.`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol23() {
    return (
        <Container>
            <Header title='100,000 YouTube Subscribers!' subtitle='Dojo Digest 22 • July 1, 2025' />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong>My Games Folder</strong> — All Dojo users now have a default folder
                    called My Games. This folder will contain classical games that you have played
                    and analyzed. We will soon use it for tools like your performance stats and your
                    overall time management rating, so make sure to add your games here!
                </Typography>

                <Typography mt={4}>
                    <strong>Game Annotation Workshop</strong> — Sensei Jesse's game annotation
                    workshop continues to work its way up the ladder. We’ve had several great and
                    convivial groups so far. On August 4th, we’ll start a workshop for the 1500-1800
                    cohorts (1750-2050 Chess.com, 1970-2150 Lichess). Register{' '}
                    <a href='https://www.chessdojo.club/calendar/availability/fd951e6f-c13c-4b88-963f-85489c63455f?utm_source=newsletter&utm_medium=email&utm_campaign=digest23'>
                        here
                    </a>
                    .
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
                    Sensei Jesse won the US Senior Open Tournament! This also gets him a ticket into
                    the US Senior Closed Tournament next year!
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kraaichamp}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    Along with the Chump GM, Dojoers{' '}
                    <a href='https://www.chessdojo.club/profile/4b363fbf-dec2-4ead-a4be-39ab26d466fc?utm_source=newsletter&utm_medium=email&utm_campaign=digest23'>
                        saratonga
                    </a>{' '}
                    (Marco Wotschka) and{' '}
                    <a href='https://www.chessdojo.club/profile/google_116825554754597007446?utm_source=newsletter&utm_medium=email&utm_campaign=digest23'>
                        Chris-C
                    </a>{' '}
                    (Chris Coski) also played. Marco scored his first Fide rating (1800+) and Chris
                    has gained about 150 points in his last two tournaments. In addition to his
                    regular studies here at the Dojo, Marco is taking lessons with GM Josh Friedel
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={dinner}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography textAlign='center' color='text.secondary'>
                    {' '}
                    The food was so spicy that the pic came out blurry!{' '}
                </Typography>

                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_112456532732140373295?utm_source=newsletter&utm_medium=email&utm_campaign=digest23'>
                        bdudm92
                    </a>{' '}
                    and his girlfriend started a monthly Pub Chess social event in Brisbane,
                    Australia! They recently had a great event and even had a write-up in Crafty
                    Pints, an online craft beer magazine. Check out the{' '}
                    <a href='https://craftypint.com/news/3835/meet-new-check-mates-with-brisbane-pub-chess?fbclid=IwQ0xDSwL03lpjbGNrAvTeVmV4dG4DYWVtAjExAAEePhcDH-RwoNCI0VmmoR0_SQSMH3wRZTGyeKoa6VVkw0Dh4yCPlXSiUpod5cs_aem_KpLllfileIkr3nBtlbQB_w'>
                        article here
                    </a>
                    ! You can follow them on{' '}
                    <a href='https://www.instagram.com/brisbanepubchess/?igsh=cGc1anc2ajMzM2J4#'>
                        Instagram here
                    </a>
                    .
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={brisbane}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <DojoAchievements
                    rating='207,329'
                    hours='93,988'
                    points='63,132'
                    graduations='3,187'
                />
                <Footer utmCampaign='digest23' />
            </Stack>
        </Container>
    );
}
