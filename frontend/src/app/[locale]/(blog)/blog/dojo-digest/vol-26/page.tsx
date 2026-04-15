import { Link } from '@/components/navigation/Link';
import { Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';

export const metadata: Metadata = {
    title: 'Remembering Daniel Naroditsky',
    description: `The Dojo was rocked by the news of Danya's passing.`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'Tournaments'],
};

export default function DojoDigestVol26() {
    return (
        <Container>
            <Header
                title='Remembering Daniel Naroditsky'
                subtitle='Dojo Digest 26 • November 1, 2025'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Updates
                </Typography>
                <Typography mt={4}>
                    The Dojo has been rocked by the news of Danya’s passing. The senseis all knew
                    him personally and almost every Dojoer had enjoyed his online content in some
                    form, whether it was commentary, humor, speedruns, or educational videos. We
                    talked about our memories{' '}
                    <Link href='https://www.youtube.com/watch?v=EPW2u6GUQM8' target='_blank'>
                        here
                    </Link>{' '}
                    and also what we need to do better{' '}
                    <Link href='https://youtu.be/teq6CehQqOg?si=iic2_V2sz6-B3aRI' target='_blank'>
                        here.
                    </Link>{' '}
                </Typography>

                <Typography mt={4}>
                    <strong> Revamped Checkmate Puzzles</strong> — We've updated our checkmate
                    puzzle interface to be more intuitive and user friendly! Check out the new
                    version{' '}
                    <Link href='https://www.chessdojo.club/puzzles/checkmate' target='_blank'>
                        here.
                    </Link>{' '}
                    Soon we'll update the rest of our tactics tests as well.
                </Typography>
                <Typography mt={4}>
                    New Dojo Tournaments — We now have rapid arenas on Friday nights and classical
                    arenas from Saturday to Sunday. Make sure to join our{' '}
                    <Link href='https://www.chess.com/club/chessdojo' target='_blank'>
                        chess.com club
                    </Link>{' '}
                    to participate in future events.
                </Typography>

                <Typography mt={4}>
                    David was voted Chess.com’s Creator of the Month! Here’s a great{' '}
                    <Link
                        href='https://www.chess.com/article/view/creator-of-the-month-im-david-pruess'
                        target='_blank'
                    >
                        interview
                    </Link>{' '}
                    with him where he talks Dojo and chess.
                </Typography>

                <Typography mt={4}>
                    Need Help Using the Dojo's Site? We now offer weekly Zoom meeting Tuesdays at
                    1-2pm ET where new members can meet the senseis and ask questions about how to
                    use the site. If you're confused or lost on the site, this is a great
                    opportunity to get your questions answered!
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
                        href='https://www.chessdojo.club/profile/eb6a6360-f4ed-4866-bbc0-4310b8f800fd'
                        target='_blank'
                    >
                        Garageheroes
                    </Link>{' '}
                    has a great new podcast{' '}
                    <Link
                        href='https://podcasts.apple.com/us/podcast/l2c-04-top-ten-things-that-helped-me-the-chessdojo/id1839042026?i=1000733283494'
                        target='_blank'
                    >
                        Late 2 Chess
                    </Link>{' '}
                    where he discusses his journey into chess as an older dude. The man is on a
                    mission!
                </Typography>
                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/4dc67c7a-54da-4d16-88cb-d3c412154f5d'
                        target='_blank'
                    >
                        wolson
                    </Link>{' '}
                    took 1st place at the Wyoming Championship and Open U1000 on the 22nd and 23rd
                    of October in Casper, Wyoming and gained 139 USCF elo!
                </Typography>

                <Typography mt={4}>
                    <Link
                        href=' https://www.chessdojo.club/profile/google_103371006521330447651'
                        target='_blank'
                    >
                        Marcupial_misconduct
                    </Link>{' '}
                    tied for 1st in the U1400 class and tied for 3rd overall at the Lafayette Open
                    Chess Tournament going 3/5! They also beat a 1700 FIDE at that same tournament.
                </Typography>

                <Typography mt={4}>
                    <Link
                        href=' https://www.chessdojo.club/profile/google_103877160430184384995'
                        target='_blank'
                    >
                        Ryan Cameron
                    </Link>{' '}
                    just crossed 2000 Chess.com rapid for the first time!
                </Typography>

                <Typography mt={4}>
                    <Link
                        href='https://www.chessdojo.club/profile/google_114391023466287136398 '
                        target='_blank'
                    >
                        NoseKnowsAll
                    </Link>{' '}
                    published his Morphy study after six months of work! Part 1 is best for the
                    600-1000 cohorts, and Part 2 is best for 800-1200. Check it out{' '}
                    <Link href=' https://lichess.org/study/LAV8k5kM' target='_blank'>
                        here
                    </Link>
                    .
                </Typography>

                <DojoAchievements
                    rating='226,600'
                    hours='97,078'
                    points='74,070'
                    graduations='3,626'
                />
                <Footer utmCampaign='digest26' />
            </Stack>
        </Container>
    );
}
