import { Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import newTestsImage from './newTests.png';

export const metadata: Metadata = {
    title: 'Rolling out Additional Tactics Tests | ChessDojo Blog',
    description: 'Adding tactics tests for all cohorts, and other site updates',
    keywords: ['Chess', 'Dojo', 'Training', 'Tactics'],
};

export default function DojoDigestVol9() {
    return (
        <Container>
            <Header
                title='Rolling out additional tactics tests'
                subtitle='Dojo Digest Vol 9 • June 1, 2024'
                image={newTestsImage}
                hideDivider
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Site Updates
                </Typography>

                <Typography mt={2} mb={1}>
                    <strong>Tactics Rating</strong> - May has been all about the development of our{' '}
                    <Link href='https://www.chessdojo.club/tests?utm_source=newsletter&utm_medium=email&utm_campaign=digest9'>
                        three trainers
                    </Link>
                    : tactics, endgame, and positional. On May 1st we posted our tests for 1500-2000
                    and 2000+. June 1st will see the rollout of tests for all cohorts. As expected
                    we had a lot to learn about the user interface, how to grade the tests, and how
                    to make the tests. I’d like to think we’ve gotten much better at it in just a
                    few short weeks. Feedback from the Dojo community was a big part of all the
                    small improvements we made. The endgame tests will go out sometime soon and then
                    the positional tests after that.
                </Typography>

                <Typography mt={4}>
                    <strong>User Interface</strong> - You’ve probably noticed that the site looks
                    nicer and is easier to use. This is due to the hard work of Jack’s two new
                    helpers, NMP and Bestieboots. Every day brings a host of small improvements to
                    the site.
                </Typography>

                <Typography mt={4}>
                    <strong>June 1st</strong> - Is the last day to use the Dojo 3.0 promo code and
                    price! Use promo code DOJO30 for{' '}
                    <Link href='https://www.chessdojo.club/signup?utm_source=newsletter&utm_medium=email&utm_campaign=digest9'>
                        30% off your first month!
                    </Link>
                </Typography>

                <Typography mt={4}>
                    <strong>New Rating Conversion Table</strong> - We need a month on this doozy.
                    Now that the Candidates is over, Chessnumbers is going to do a deep dive for us.
                    We are hoping to get it done by July 1st, but still consider this task part of
                    Dojo 3.0.
                </Typography>

                <Typography mt={4}>
                    <strong>How to Analyze Your Games</strong> - It’s taken us far longer than
                    originally planned. Books are hard. But we are hoping to publish it soon, this
                    book we also think of as part of the Dojo 3.0 project.
                </Typography>

                <Typography mt={4}>
                    Join the{' '}
                    <Link href='https://www.chessdojo.club/signup?utm_source=newsletter&utm_medium=email&utm_campaign=digest9'>
                        Training Program
                    </Link>{' '}
                    using the code DOJO30 and get 30% off your first month!
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>

                <Typography mt={2}>
                    <Link href='https://www.chessdojo.club/profile/google_111679691028507818183?utm_source=newsletter&utm_medium=email&utm_campaign=digest9'>
                        IM Kostya
                    </Link>{' '}
                    had a decent result at the 2024 Chicago Open, scoring 5.5/9 (+3, -1, =5) to tie
                    for 2nd place U2400!
                </Typography>

                <Typography mt={3}>
                    Dojo regular{' '}
                    <Link href='https://www.chessdojo.club/profile/6f567fef-10c4-4d70-bee9-a407da5a1d13?utm_source=newsletter&utm_medium=email&utm_campaign=digest9'>
                        daprowl
                    </Link>{' '}
                    gained 100 elo at their last tournament in the u2100 section with a 3.5/6 score!
                </Typography>

                <DojoAchievements
                    rating='146,381'
                    hours='67,566'
                    points='53,641'
                    graduations='1,498'
                />

                <Footer utmCampaign='digest9' />
            </Stack>
        </Container>
    );
}
