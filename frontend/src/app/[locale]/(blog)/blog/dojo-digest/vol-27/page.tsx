import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';

export const metadata: Metadata = {
    title: '24 hours left for 25% Off ChessDojo',
    description: `Live class tiers and Black Friday sale end December 2nd!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol27() {
    return (
        <Container>
            <Header
                title='24 hours left for 25% Off ChessDojo'
                subtitle='Dojo Digest 27 • December 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={4}>
                    <strong> Live Class Tiers</strong> — You can now join one of two new live class
                    tiers: The Group Classes tier is $75/month and includes large, lecture-style
                    classes like Endgame Fundamentals and Calculation. The Game and Profile Review
                    tier is $200/month and includes the lecture classes plus smaller, seminar-style
                    sessions where a sensei reviews your games. Classes begin January 1st, but use
                    code <strong>BLACKFRIDAY</strong> before December 2nd to get 25% off your first
                    month. Join the new tiers{' '}
                    <Link href=' https://www.chessdojo.club/prices' target='_blank'>
                        here
                    </Link>{' '}
                    or check the full January calendar{' '}
                    <Link href='https://calendar.google.com/calendar/u/0/embed ' target='_blank'>
                        here
                    </Link>
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
                    <Link
                        href=' https://www.chessdojo.club/profile/google_109090545256129998922'
                        target='_blank'
                    >
                        jaimeby
                    </Link>{' '}
                    scored 5/7 points in their regional individual championship (7 rounds of 90+30,
                    in which first 10 promote to next category), getting promotion to First
                    Regionals!
                </Typography>
                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_113995833598420530152 '
                        target='_blank'
                    >
                        sicilian_kan
                    </Link>{' '}
                    won the U2000 section of the Witney Chess Congress OTB November 8-9!
                </Typography>
                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/a3f8db36-bd8b-4356-aa3f-b0442ec3d609 '
                        target='_blank'
                    >
                        bencdawkins
                    </Link>{' '}
                    acheived their first podium finish tied for second place and first prize money
                    at the Tunnelvision 38 in Columbia, SC!
                </Typography>
                <Typography mt={4}>
                    <Link
                        href=' https://www.chessdojo.club/profile/google_111932000290094578368'
                        target='_blank'
                    >
                        Cennydd
                    </Link>{' '}
                    went 3/5 in the Central London Congress vs opponents rated an average of 300
                    points higher! This should put their new rating close to 1600 ECF/1700 FIDE!
                </Typography>

                <DojoAchievements
                    rating='144,316'
                    hours='60,487 '
                    points='53,630'
                    graduations='3,769'
                />
                <Footer utmCampaign='digest27' />
            </Stack>
        </Container>
    );
}
