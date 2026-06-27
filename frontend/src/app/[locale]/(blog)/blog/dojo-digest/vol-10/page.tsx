import { Container, Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Footer } from '../../common/Footer';
import mainImage from './masters.png';

export const metadata: Metadata = {
    title: 'The Dojo Masters Database | ChessDojo Blog',
    description: 'New masters database with 5 million games and new endgame tests',
    keywords: ['Chess', 'Dojo', 'Training'],
};

export default function DojoDigestVol10() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Stack sx={{ mb: 3 }}>
                <Typography variant='h4'>The Dojo has a new Masters Database</Typography>
                <Typography variant='h6' color='text.secondary'>
                    Dojo Digest Vol 10 • July 1, 2024
                </Typography>
            </Stack>

            <Image
                src={mainImage}
                alt=''
                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                priority
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Site Updates
                </Typography>
                <Typography mt={2} mb={1}>
                    <strong>Master's Database</strong> - We now have a database of master-level
                    games, filterable by time control! We currently have 250,000 games available and
                    are in the process of uploading another 5 million! The database will then be
                    updated weekly with the latest games. To search the database, just open the
                    Position Explorer tab and you'll be able to choose between Dojo members'
                    annotated games, the Lichess database and the new masters database.
                </Typography>

                <Typography mt={4}>
                    <strong>Endgame Tests</strong> - In addition to our tactics tests, we now have
                    endgame tests for all rating groups. The endgame tests will soon be part of a
                    player's endgame rating on their profile, similar to the existing tactics
                    rating. You can take the new tests here.
                </Typography>

                <Typography mt={4}>
                    <strong>Positional Tests</strong> - are coming soon. We are beta-testing them
                    now. The particular challenge is asking for an evaluation and then grading it.
                    No other website has ever done this!
                </Typography>

                <Typography mt={4}>
                    <strong>A Lesson from the Tests</strong> - The most common mistake we see across
                    the Dojo is players moving too fast. People generally move too fast out of
                    anxiety and exhaustion. While you might not feel exhausted in the same way as
                    with physical work, your system two thinking can only go so far and it’s at that
                    point when you make an impulsive move. We are seeing this phenomenon in the
                    tests too: players are so sure of their answers that they often are not using
                    all of their allotted time. The Dojo hopes these tests will train patience,
                    reflection and a judgement of our first instincts!
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>
                <Typography mt={2}>
                    <Link href='https://www.chessdojo.club/profile/google_114391023466287136398?utm_source=newsletter&utm_medium=blog&utm_campaign=digest10'>
                        NoseKnowsAll
                    </Link>{' '}
                    faced and beat his first NM in an OTB event! Check out his{' '}
                    <Link href='https://www.chessdojo.club/games/1900-2000/2024.06.03_add61acc-b1ad-4011-a1a9-ae95ad93a49f?utm_source=newsletter&utm_medium=blog&utm_campaign=digest10'>
                        game here
                    </Link>{' '}
                    and leave a comment!
                </Typography>
                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/google_115587319098605190849?utm_source=newsletter&utm_medium=blog&utm_campaign=digest10'>
                        Timpe
                    </Link>{' '}
                    recently beat an IM in a FIDE-rate OTB rapid tournament and had an overall
                    tournament performance of 2089! You can check out the full results of the{' '}
                    <Link href='https://chess-results.com/tnr954028.aspx?lan=1&art=9&fed=BEL&snr=81'>
                        tournament here
                    </Link>
                    .
                </Typography>
                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/4194f5e1-8fdf-4f00-9c25-102bc72b0a6b?utm_source=newsletter&utm_medium=blog&utm_campaign=digest10'>
                        Penrow
                    </Link>{' '}
                    has been continuing to make great progress, recently graduating to the 900-1000
                    cohort!
                </Typography>

                <Typography textAlign='center' mt={4}>
                    Over the past year of Dojo 2.0, we&apos;ve collectively achieved:
                    <br />
                    <br />
                    <strong>147,460</strong> rating points gained
                    <br />
                    <strong>71,050</strong> training hours logged
                    <br />
                    <strong>1,563</strong> graduations
                    <br />
                    <br />
                    Keep up the great work!
                </Typography>

                <Footer utmCampaign='digest10' />
            </Stack>
        </Container>
    );
}
