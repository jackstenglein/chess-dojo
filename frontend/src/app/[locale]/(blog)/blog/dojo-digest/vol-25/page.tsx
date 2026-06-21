import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import mrhence from './mrhence.gif';
import solitairechess from './solitairechess.jpg';

export const metadata: Metadata = {
    title: 'CoachChamps, Solitaire Chess & More',
    description: `Dojo has a great new feature, Solitaire Chess (Guess the Move)!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol25() {
    return (
        <Container>
            <Header
                title='CoachChamps & Solitaire Chess'
                subtitle='Dojo Digest 25 • October 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={4}>
                    {' '}
                    <strong> David at CoachChamps</strong> — David has joined a host of top coaches
                    and personalities including Levy, Neiksans, Dina and more, to see who can prove
                    themselves as the best coach. The eight coaches each drafted four students from
                    different rating brackets on September 9. They'll have one month to help their
                    students improve as much as possible to face their final challenge: Starting
                    October 7, the improvers will compete against each other in round-robins to
                    showcase their newfound skills. David is streaming all of his lessons with
                    Marten on{' '}
                    <Link href='https://www.twitch.tv/chessdojo' target='_blank'>
                        Twitch
                    </Link>{' '}
                    .
                </Typography>

                <Typography mt={4}>
                    <strong>Solitaire Chess (Guess the Move)</strong> — Dojo has a great new feature
                    that you can use to memorize classic games (a training plan task in all cohorts)
                    or to play guess the move. Guess the move is a great way to immerse yourself in
                    a game and learn how great players thought about their own games. To find this
                    feature, open any game and look for the tools (wrench and hammer) icon.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={solitairechess}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <strong>Kraai on the Perpetual pod</strong> — Ben Johnson had Jesse on to talk
                    about his first place finish at the US Senior Open and all things Dojo. Check it
                    out{' '}
                    <Link
                        href='https://www.perpetualchesspod.com/new-blog/2025/9/2/ep-449-gm-jesse-kraai-on-confronting-tournament-fears-mental-and-physical-fitness-and-whats-next-for-him-and-chessdojo'
                        target='_blank'
                    >
                        here
                    </Link>{' '}
                    .
                </Typography>

                <Typography mt={4}>
                    <strong>Spacebar Analysis</strong> — You will often hear masters talk about
                    “hitting spacebar.” Hitting the spacebar on your keyboard is the shortcut
                    Chessbase created for an instant engine analysis of the position on the board.
                    It was often a joke, as in “you’re not actually thinking at all.” In honor of
                    this legacy, the Dojo has added spacebar as the default shortcut for inserting
                    the top engine move.
                </Typography>

                <Typography mt={4}>
                    <strong>Dojo in Samarkand</strong> — Well, we weren’t actually there, but it
                    felt like it with the live feed of the games. The Dojo pioneered engine-less
                    commentary, and we are proud to keep it up. In addition to sharing a sense of
                    what the players might actually be thinking, playing guess the move helps the
                    senseis develop their own game. We also did a podcast on the results of the
                    tournament and how it affects the world championship cycle. We aim to cover the
                    World Cup in a similar way. The World Cup will take place from Oct 31st to Nov
                    27, and the three highest placing players will earn a spot in the Candidates
                    tournament.
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
                    <a href='https://www.chessdojo.club/profile/google_104186277850925094929'>
                        Alvin_Cruz
                    </a>{' '}
                    went on a 24-game no loss streak with 22 wins and 2 draws in classical format!
                </Typography>

                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/google_110999236586145026586'>
                        Chahat
                    </a>{' '}
                    crossed the 2000 rating on Chess.com for the{' '}
                    <Link
                        href='https://x.com/chahat__agg/status/1971607338919575697?s=46&t=SPCvdCTvVFcozXnICnIOYg'
                        target='_blank'
                    >
                        first time
                    </Link>{' '}
                    ! They had a long term goal for nearly 2.5 years, but jumped from the 1600s to
                    2000 this year alone following the Dojo training plan!
                </Typography>
                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/2539684b-b267-476d-8119-21355a37bc9d'>
                        MrHence
                    </a>{' '}
                    beat an IM in a blitz game! Check out the game:
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={mrhence}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>

                <Typography mt={4}>
                    <a href='https://www.chessdojo.club/profile/b32a7e2f-b677-4c92-a80e-c4ee3bce9058'>
                        Sarciness
                    </a>{' '}
                    won the Swindon Under 1900 chess tournament, scoring an impressive 5.5 out of 6.
                    This is their first time winning a Major section and earned them a £600 first
                    prize. This performance resulted in a tournament performance rating above 2100.
                    They expect their first official "full" English Chess Federation rating next
                    month to be close to 2000, suggesting they are playing better than ever, despite
                    only playing chess online for the last decade.
                </Typography>

                <DojoAchievements
                    rating='218,198'
                    hours='95,429'
                    points='73,421'
                    graduations='3,476'
                />
                <Footer utmCampaign='digest25' />
            </Stack>
        </Container>
    );
}
