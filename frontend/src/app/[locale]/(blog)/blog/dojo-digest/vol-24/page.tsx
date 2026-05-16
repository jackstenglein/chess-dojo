import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import books from './books.jpg';
import chesslatte from './chesslatte.jpg';
import dandeer from './dandeer.jpg';
import forky from './forkygame.gif';
import kraaiperformance from './kraaiperformance.jpg';
import kraaistats from './Kraaistats.jpg';
import somgod from './somgod.jpg';
import sparring from './sparring.jpg';
import sparring2 from './sparring2.jpg';
import UICalendar from './UI+Calendar.jpg';
import UIUpgrade from './UI+Upgrade.jpg';

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
                <Typography mt={4}>
                    {' '}
                    <strong> Training Program UI upgrade</strong> - The Dojo is always looking to
                    make the program easier and more fun to use. We’ve come a long way from an excel
                    spreadsheet! You will now see a daily and weekly view. You can also now choose
                    to skip tasks (maybe you don’t have the book yet, or maybe you are waiting on
                    your sparring partner). Below is the weekly and monthly view of sensei Kraai’s
                    tasks:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={UIUpgrade}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={UICalendar}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <strong>Stats!</strong> - We now have a stats button in your games folder. This
                    will allow you to see your performance rating and your WDL breakbdown by
                    opponent cohort for the games in that folder. Soon we will have a time usage
                    rating for each dojoer. Below are sensei Kraai’s stats:
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kraaistats}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kraaiperformance}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <strong>Dojo at the Washington International</strong> - The Dojo had a great
                    event. In the first year of the Dojo, we launched a challenge called Ultimate
                    Sensei. Each sensei has a cadre of students and the quest was to raise their
                    skill level as fast as possible. There we met ChessGainz, aka Max Farberov. He
                    had a wicked pair of sunglasses and was maybe around 1800. He’s now a national
                    master and crushed the u/2300 field with 8/9 and won THOUSANDS of dollars. In
                    his last round he faced off with another longtime dojoer, the famous ChessLatte.
                    We met ChessLatte when we was very young in 2020. He’s since made great
                    progress, and is now over 2000. Below is a pic of ChessLatte and sensei Kraai
                    right before his battle with Max.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={chesslatte}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <strong>Game Annotation Workshop</strong> - The game annotation workshop has
                    worked its way around the ladder, we are doing the 0-600 cohort now and will
                    start 400-700 on Sept 8th. Register{' '}
                    <a href='https://www.chessdojo.club/calendar/availability/b6575840-0f97-4a0c-ab99-72047e5bca72'>
                        here
                    </a>
                    . Analyzing your games is the best way to improve your chess. The process of the
                    workshop is simple: Each participant will show one annotation. To prepare that
                    annotation it is strongly encouraged to review the game and annotations with
                    other members of the class *before* the actual Monday workshop. On Monday we
                    then do a deep dive on the game and its annotations. You will learn about
                    yourself and how to think about chess. It's fine to check the game with the
                    computer if you want - but only after the Monday workshop! We will do as many
                    classes as there are participants. Doing as many classes as there are
                    participants will allow us to have the workshop no matter what. Cost covers all
                    sessions. - Once the number of classes is set sensei Kraai will advertise the
                    next workshop for the next set of cohorts.
                </Typography>

                <Typography mt={4}>
                    Dojoer Nate Ehrenberg also had a great event, going 8/9 and winning that section
                    handily. Sensei Kraai played a couple nice games and was tied for first at the
                    end of round seven – but then it fell apart.
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
                    <a href='https://www.chessdojo.club/profile/255d01b5-2f0c-48d8-9ecc-4033cecd17a1'>
                        Dandeer
                    </a>{' '}
                    played in Section B (1700-2100) at the Salzburg Sonnenterrassen tournament and
                    finished with 5.5/9, gaining 74 elo! He also met{' '}
                    <a href='https://www.chessdojo.club/profile/8255a79a-5712-4532-88a7-0892bb34899b'>
                        hmp
                    </a>{' '}
                    at the tournament. He played in section C (U1700) and finished second place with
                    6.5/9, winning prize money and gaining 16.8 elo! Dandeer defeated someone rated
                    over 1800 for the first time in his life in the penultimate round. He then went
                    on to defeate a 1960 rated opponent in the final round!
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={dandeer}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_111431555372539094121'>
                        ysulaiman
                    </a>{' '}
                    played in his first FIDE rated OTB rapid tournament! He played against 5 FIDE
                    rated players and got a first rating of 1592!
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/9ad63b1e-cd90-4cf4-91df-8dd8b96106ed'>
                        Adam Greener
                    </a>{' '}
                    met up in person with their Dojo endgame sparring partner{' '}
                    <a href='https://www.chessdojo.club/profile/google_113172928867782995399'>
                        mn1171
                    </a>
                    ! They've been sparring endgames and going through the Dojo endgame taskas and
                    books on a weekly basis for about 18 months. mn1171 was visiting the UK from
                    Afghanistan and they met up for some games and general training!
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={sparring}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={sparring2}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_104186277850925094929'>
                        Alvin_Cruz
                    </a>{' '}
                    recently joined the Dojo and picked up some new books! He's following the
                    training program and putting in the work!
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={books}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_103371006521330447651'>
                        Marcupial_misconduct
                    </a>{' '}
                    got their first ever smothered mate in an OTB game!
                </Typography>

                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_107509909976314695585'>
                        Forky Chess
                    </a>{' '}
                    played black against an FM in an OTB classical game and won!
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={forky}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_110990508000334256892'>
                        SOM_GOD
                    </a>{' '}
                    got first place in the unrated section in a very strong field at a local
                    tournament. That was his first time in 3 years, after just 3 months of being in
                    the Dojo!
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={somgod}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <DojoAchievements
                    rating='210,526'
                    hours='94,011'
                    points='71,257'
                    graduations='3,336'
                />
                <Footer utmCampaign='digest23' />
            </Stack>
        </Container>
    );
}
