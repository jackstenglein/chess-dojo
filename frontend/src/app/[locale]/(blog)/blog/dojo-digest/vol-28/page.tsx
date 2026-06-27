import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';

export const metadata: Metadata = {
    title: 'Dojo Core and Live Classes',
    description: `Get a Free Month of Dojo Core and 10% off Live Classes`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol28() {
    return (
        <Container>
            <Header
                title='Dojo Core and Live Classes'
                subtitle='Dojo Digest 28 • January 1, 2026'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={4}>
                    <strong>Free Month at the Dojo</strong> — Make your New Year’s resolution and
                    join the Dojo for the month of January at no cost! Use the code{' '}
                    <strong>NY26</strong> when signing up. The code only lasts until the 7th, so
                    don't wait!
                </Typography>
                <Typography mt={4}>
                    <strong> Live Classes</strong> start next week! If you're interested in learning
                    directly from Jesse, David, and Kostya,{' '}
                    <Link href='https://www.chessdojo.club/prices ' target='_blank'>
                        sign up
                    </Link>{' '}
                    now. Use the code <strong>CLASSES</strong> for 10% off through January.
                </Typography>

                <Typography mt={4}>
                    <strong>2025 Postmortem</strong> — See a review of your 2025 with the Dojo{' '}
                    <Link href='https://www.chessdojo.club/postmortem ' target='_blank'>
                        here
                    </Link>
                    . Overall, it was a great year for the Dojo. Dojoers collectively gained 43,739
                    rating points and logged 10,468 training hours in 2025, resulting in 1,637
                    graduations.
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
                        href=' https://www.chessdojo.club/profile/google_116965833709584043772'
                        target='_blank'
                    >
                        Thorbiddles
                    </Link>{' '}
                    finally hit 2000 USCF! After winning their section and beating two CMs in the
                    latest tournament, their USCF rating has jumped to 2034.
                </Typography>

                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_105091150995567267006 '
                        target='_blank'
                    >
                        JerryMac
                    </Link>{' '}
                    made it into the January Chess Life magazine!
                </Typography>

                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/fc3f82c5-4cef-47f9-a2f1-47cd47078a35 '
                        target='_blank'
                    >
                        AmbushRakshasa
                    </Link>{' '}
                    finished T-3 u1600 in the year's final Tuesday Night Marathon at Mechanics'
                    Institute in SF, rising to 1423 USCF for a total gain of 472 points in 2025. He
                    also qualified by rating to play-up in the u2000 section of the next TNM!
                </Typography>
                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/46e8a4d0-0453-4875-b1a1-57d5e7bd81a8'
                        target='_blank'
                    >
                        KenpoGMBrian
                    </Link>{' '}
                    ended 2025 on a high note, hitting a personal record of 1342 USCF after finally
                    breaking through a 1300 plateau. He also secured 3rd place in the Chess.com
                    Improvers Tournament with a strong 4/5 score!
                </Typography>
                <Typography mt={4}>
                    Despite a break since October,{' '}
                    <Link
                        href=' https://www.chessdojo.club/profile/57fa9f7f-78c2-43fe-9345-81d77f4ea6f3'
                        target='_blank'
                    >
                        ac_secret
                    </Link>{' '}
                    returned to the Dojo program this December to end 2025 with a bang! On the final
                    day of the year, they hit new all-time personal records in both Chess.com Rapid
                    (1959) and Puzzles (2166).
                </Typography>
                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/6fee0de9-a652-4d7e-b7c6-9a6ae9d7ccda '
                        target='_blank'
                    >
                        AI Jason
                    </Link>{' '}
                    tied for second place going 4/5 in the{' '}
                    <Link href='https://www.lachessladder.com' target='_blank'>
                        lachessladder.com
                    </Link>{' '}
                    Daylight Savings Tournament at Granada Hills Park taking home the trophy for
                    best outside the top 30.
                </Typography>

                <DojoAchievements
                    rating='210,708'
                    hours='99,673 '
                    points='75,133'
                    graduations='3,909 '
                />
                <Footer utmCampaign='digest28' />
            </Stack>
        </Container>
    );
}
