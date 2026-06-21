import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import heatmap from './heatmap.png';
import tibi from './tibi.jpg';
import weeklyplanner from './weekly-planner.png';

export const metadata: Metadata = {
    title: 'New Courses, Badges, & more! | ChessDojo Blog',
    description: `Mastering Time in Chess is finally out on Chessable!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol19() {
    return (
        <Container>
            <Header
                title='Tournament Prizes, New Course, Weekly Planner & more!'
                subtitle='Dojo Digest 19 • April 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong>ChessDojo Champions' Circuit</strong> — Dojo tournaments now have
                    prizes! The winners of both the{' '}
                    <Link href='https://www.chessdojo.club/tournaments/round-robin' target='_blank'>
                        <strong>Round Robins</strong>{' '}
                    </Link>
                    and{' '}
                    <Link
                        href='https://www.chessdojo.club/tournaments/open-classical'
                        target='_blank'
                    >
                        <strong>Open Classical</strong>{' '}
                    </Link>
                    will earn a free year membership to the Dojo, as well as entrance into our end
                    of year tournament of champions. A big thank you to our donor (who asked to
                    remain anonymous) for making this possible!
                </Typography>

                <Typography mt={4}>
                    A Professional Modern Repertoire Against the Caro-Kann — Part modern repertoire
                    against the Caro-Kann, part treatise on positional chess, this course by David
                    Pruess covers playing the d4 v. c6 pawn structure, and playing with the bishop
                    pair in 2 videos, 3 PGNs of opening analysis, 15 sparring positions, 15
                    annotated model games, and 47 exercises. Dojo members can access the course for
                    free, while non-members can purchase it for just $15. Get it here.
                </Typography>

                <Typography mt={4}>
                    Weekly Planner — We've streamlined our training plan to make it as simple as
                    possible for you to focus on your chess studies. Our new UI allows you to set
                    your weekly study goal, and then our algorithm suggests which tasks you should
                    work on each day. It's a huge advantage to not have to think about what you
                    should study. Fretting over the what and how costs not only energy but
                    encourages putting the work off. Below you can see what the new UI looks like:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={weeklyplanner}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={heatmap}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    Dojo 4.0 — Coming up May 1st! Every year, we carefully review all of the
                    material in our training plan, taking into account feedback, new courses/books,
                    and the availaibilty of material. There will also be some new functionality on
                    our website. Keep a look out for the announcement next month!
                </Typography>

                <Typography mt={4}>
                    How to Analyze Your Games – A ChessDojo Guide is out on{' '}
                    <Link
                        href='https://www.amazon.com/dp/B0F1DB396G?ref=cm_sw_r_ffobk_cp_ud_dp_28S42XTYCZ2PRHKFJN31&ref_=cm_sw_r_ffobk_cp_ud_dp_28S42XTYCZ2PRHKFJN31'
                        target='_blank'
                    >
                        <strong>Kindle</strong>{' '}
                    </Link>
                    and the{' '}
                    <Link
                        href='https://www.chessdojo.shop/product-page/how-to-analyze-your-games-a-chessdojo-guide'
                        target='_blank'
                    >
                        <strong>ChessDojo store</strong>
                    </Link>
                    ! Keep an eye out for it's release on ForwardChess soon.
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
                    <Link
                        href='https://www.chessdojo.club/profile/google_115165946308482592969'
                        target='_blank'
                    >
                        Tibi007
                    </Link>{' '}
                    and his team just won the championship for Teammatches! Tibi won a boardprize as
                    well. He managed to score 5/8 playing on boards 1, 2, 3, 4, 5 (twice), and 6
                    (twice) with a performance rating of ~2000 gaining 21 DWZ elo!
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={tibi}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_116077411244047661116'
                        target='_blank'
                    >
                        FIDE Instructor Vlad Ghita
                    </Link>{' '}
                    became national champion U2000 in Romania! Check out a detailed recap here. He
                    also hosted the first ever training camp for adult improvers in his country with
                    24 participants. They even had someone fly in from England to attend!
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_113473432129623975319'
                        target='_blank'
                    >
                        Solitude
                    </Link>{' '}
                    won the C section in the Lubowski Open 2025 in South Africa! They finished with
                    a score of 4.5/5, and with that came a huge rating increase!
                </Typography>

                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_100752533272043304112'
                        target='_blank'
                    >
                        supernoob619
                    </Link>{' '}
                    competed in their first classical OTB tournament, winning the 1st Unrated prize
                    with a score of 5.5/9! They also earned a standard FIDE rating of 1708 after
                    scoring 2.5/6 against rated opponents!
                </Typography>

                <DojoAchievements
                    rating='184,144'
                    hours='81,893'
                    points='71,985'
                    graduations='2,683'
                />
                <Footer utmCampaign='digest19' />
            </Stack>
        </Container>
    );
}
