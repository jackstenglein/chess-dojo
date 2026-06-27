import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import capschess from './capschess.jpg';
import houseline from './houseline.png';
import openingscout from './openingscout.png';
import openingscout2 from './openingscout2.png';
import suggestedvariations from './suggestedvariations.png';
import variations from './variations.png';

export const metadata: Metadata = {
    title: 'Annotation Workshop, Dojo Opening Scout & more!',
    description: `Annotation Workshop, Dojo Opening Scout & more!`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol20() {
    return (
        <Container>
            <Header
                title='Annotation Workshop, Dojo Opening Scout & more!'
                subtitle='Dojo Digest 20 • May 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={2}>
                    <strong> Take a Class with Jesse Kraai</strong> — Sensei Kraai is reviving the
                    Dojo's coaching workshops. If you're in the 1100-1200 or 1200-1300 cohorts, join
                    here and improve your game annotation skills! Jesse plans to do classes for the
                    other cohorts later as well.
                </Typography>
                <Typography mt={4}>
                    <strong>Dojo Opening Scout</strong> — We've added a new tab to our database
                    explorer which allows you to search for specific users in Chess.com and Lichess
                    and explore their openings. You can add multiple accounts and filter by color,
                    rated/unrated, time control and more.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={openingscout}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={openingscout2}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    <strong>Discord Verification/Roles</strong> — We've greatly improved our Discord
                    verification and role assignment process. You can now easily link your Discord
                    account in your settings, and your Discord roles will be automatically updated
                    when you graduate or switch cohorts. We are trying our best to make Discord as
                    user-friendly as possible! We've also combined our private and public Discord
                    servers — join here.
                </Typography>
                <Typography mt={4}>
                    <strong>Bulk Download</strong> — You now have the ability to bulk download your
                    games and folders, in case you want to save them outside of the Dojo as well.
                    You can find the new option in your profile page.
                </Typography>
                <Typography mt={4}>
                    <strong>Suggesting Variations</strong> — When reviewing games submitted by other
                    Dojoers, you can now add a suggested variation. Suggested variations are marked
                    in the text with your profile picture and are also included in the comments tab.
                    We hope this further increases the Dojo's culture of game analysis and peer
                    review.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={variations}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={suggestedvariations}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={4}>
                    <strong>Dojo 4.0</strong> — We've pushed back our yearly update of the training
                    plan to May 15. From a distance it might seem that this should get easier every
                    year, but that's somehow not true! We have so many technical updates that we'd
                    like to push out and they mesh with the requirements in a variety of ways. This
                    year, we will continue to do several smaller updates after our traditional May
                    1st birthday.
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
                        href='https://www.chessdojo.club/profile/google_111679691028507818183'
                        target='_blank'
                    >
                        Kostya
                    </Link>{' '}
                    has been in Europe on the road back to 2400, playing the 2025 Reykjavik and
                    Grenke Open. We've been following his games live on the channel, and you can
                    read about his trip so far (including a run-in with Ivanchuk!){' '}
                    <Link
                        href='https://hellokostya.substack.com/p/2025-spring-eurotrip'
                        target='_blank'
                    >
                        here
                    </Link>
                    .
                </Typography>

                <Typography mt={2}>
                    Following a hiatus of over a year from classical chess tournaments,{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/google_113961787834843452071'
                        target='_blank'
                    >
                        CapsChess
                    </Link>{' '}
                    scored 3/6 in the County Championships, with 2 wins, 2 draws, and 2 losses.
                    Having played more than 35,000 games since first taking up chess, this marks
                    Caps' best achievement to date. The final round featured a draw against a player
                    rated 1801 FIDE. As a result of this performance, Caps is set to receive an
                    official FIDE rating, expected to be around 1590.
                </Typography>
                <Stack mt={2} alignItems='center'>
                    <Image
                        src={capschess}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                </Stack>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/b11a51dc-29ab-4c5c-a953-07db13cfba7e'
                        target='_blank'
                    >
                        Carl
                    </Link>{' '}
                    tied for first place in a three-way finish at the Charlotte ALTO. One of the
                    other players in the tie was another Dojoer Eli Eichner, whom Carl faced in the
                    final round—where a decisive result would have secured clear first. Their
                    intense game, played on the top board of the U1800 section, was broadcast
                    alongside the{' '}
                    <Link
                        href='https://www.chess.com/events/2025-charlotte-alto-spring/05/Eichner_Eli_Stein-Labanz_Carl'
                        target='_blank'
                    >
                        other top games
                    </Link>{' '}
                    with commentary from the Dojo's own{' '}
                    <Link
                        href='https://www.chessdojo.club/profile/6753b3e1-36bd-4103-8487-f88f00935306'
                        target='_blank'
                    >
                        Houseline!
                    </Link>
                    <Stack mt={2} alignItems='center'>
                        <Image
                            src={houseline}
                            alt=''
                            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                        />
                    </Stack>
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_105215434829189834141'
                        target='_blank'
                    >
                        Om
                    </Link>{' '}
                    tied for first in the Bolton Easter Congress 2025 Major! Check out the standings{' '}
                    <Link
                        href='https://chess-results.com/tnr1159729.aspx?lan=1&art=1&rd=6&fed=IND'
                        target='_blank'
                    >
                        here
                    </Link>
                    .
                </Typography>
                <Typography mt={2}>
                    <Link
                        href='https://www.chessdojo.club/profile/cc7d5a48-d78f-42b1-ab13-8b71141effb9'
                        target='_blank'
                    >
                        Felipe
                    </Link>{' '}
                    beat FM Michael Shahade! See the game{' '}
                    <Link href='https://www.chess.com/game/live/137782313394' target='_blank'>
                        here
                    </Link>
                    .
                </Typography>
                <DojoAchievements
                    rating='186,843'
                    hours='82,262'
                    points='71,638'
                    graduations='2,777'
                />
                <Footer utmCampaign='digest20' />
            </Stack>
        </Container>
    );
}
