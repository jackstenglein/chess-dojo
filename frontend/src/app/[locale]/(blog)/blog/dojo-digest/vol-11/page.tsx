import { Box, Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '../../common/Container';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { DojoAchievements } from '../components/DojoAchievements';
import anandImage from './anand.jpg';
import kaidanovImage from './kaidanov.jpg';
import kostyaImage from './kostya.jpg';
import kraaiImage from './kraai.jpg';

export const metadata: Metadata = {
    title: 'Kraai Scores Clear Second at the US Senior | ChessDojo Blog',
    description: `Sensei Kraai trusted the program and the results finally came. In a field of legends, 9 GMs and one IM, the sensei won his last four games and scored his fifth GM norm...`,
    keywords: ['Chess', 'Dojo', 'Training', 'Digest', 'US Senior', 'Kraai'],
};

export default function DojoDigestVol11() {
    return (
        <Container>
            <Header
                title='Tablebase, Jesse Kraai at the US Senior, and other updates'
                subtitle='Dojo Digest Vol 11 • August 1, 2024'
                hideDivider
                image={kraaiImage}
                imageCaption='Jesse vs GM Larray Christiansen'
            />

            <Stack mt={3}>
                <Typography mt={2} variant='h5'>
                    Site Updates
                </Typography>

                <Typography mt={2} mb={1}>
                    <strong>Tablebase</strong> - The Dojo database now supports tablebase, which
                    solves all seven-piece (or less) endgames. It’s an incredibly powerful tool that
                    allows for easy navigation of complex endgames.
                </Typography>

                <Typography mt={2}>
                    <strong>Coming Soon</strong> - We will soon add the ability to organize your
                    games into folders. Imagine a cross between Lichess Studies and Google Drive.
                    Reach out to us on Discord if you'd like to be part of our beta testing group
                    for this feature.
                </Typography>

                <Typography mt={4} variant='h5'>
                    Achievements
                </Typography>

                <Typography mt={2} mb={1}>
                    <strong>Kraai scores clear second at US Senior</strong> -{' '}
                    <Link href='https://www.chessdojo.club/profile/google_108763076343237273295?utm_source=newsletter&utm_medium=email&utm_campaign=digest11'>
                        Sensei Kraai
                    </Link>
                    trusted the program and the results finally came. In a field of legends, 9 GMs
                    and one IM, the sensei won his last four games and scored his fifth GM norm.
                    Dude is almost ready to graduate back into 2400+.
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kaidanovImage}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        A difficult position from GM Gregory Kaidanov vs Kraai
                    </Typography>
                </Stack>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={kostyaImage}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        Kostya and Jesse in the round 6 post-game interview
                    </Typography>
                </Stack>

                <Typography mt={3} mb={1}>
                    Sensei Kraai played many fighting games and will review them all according to
                    the Dojo program. Below is his favorite game, against GM Julio Becerra in the
                    final round. Kraai had practiced the line several times in sparring against
                    Kostya as part of his work in the Dojo Training Program!
                </Typography>

                <Box sx={{ width: 1, aspectRatio: '1/1', position: 'relative' }}>
                    <Image
                        src='https://chess-dojo-images.s3.amazonaws.com/emails/Becerra+v+Kraai.gif'
                        alt=''
                        style={{ borderRadius: '8px' }}
                        fill
                    />
                </Box>

                <Typography mt={4}>
                    <Link href='https://www.chessdojo.club/profile/google_111679691028507818183?utm_source=newsletter&utm_medium=email&utm_campaign=digest11'>
                        Sensei Kostya
                    </Link>{' '}
                    recently traveled to Europe and played two tournaments, the Porticcio Open
                    (5.0/9) and the Valencia Open (6.0/9).
                </Typography>

                <Stack mt={2} alignItems='center'>
                    <Image
                        src={anandImage}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                    <Typography textAlign='center' color='text.secondary'>
                        Kostya with five-time World Champion Viswanathan Anand at the 2024 Porticcio
                        Open
                    </Typography>
                </Stack>

                <Typography mt={4}>
                    <Link href='https://www.chessdojo.club/profile/c2a3b42d-0024-488d-84d2-25cf4baab352?utm_source=newsletter&utm_medium=email&utm_campaign=digest11'>
                        Doozre
                    </Link>{' '}
                    (1300-1400 cohort) recently had his highest-rated OTB win against a 1900 CFC
                    player and gained 81 rating points!
                </Typography>

                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/8353ba12-b330-4eda-af52-b3765fa1caf5?utm_source=newsletter&utm_medium=email&utm_campaign=digest11'>
                        Gaspard28
                    </Link>{' '}
                    (1700-1800 cohort) finished 6.5/9 in the U2000 section at the World Open and
                    achieved an all-time high rating of 1886 USCF.
                </Typography>

                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/google_103194376898623452790?utm_source=newsletter&utm_medium=email&utm_campaign=digest11'>
                        Big Dave
                    </Link>{' '}
                    (1800-1900 cohort) drew a GM in a 90+30 OTB game.
                </Typography>

                <Typography mt={3}>
                    <Link href='https://www.chessdojo.club/profile/google_115587319098605190849?utm_source=newsletter&utm_medium=email&utm_campaign=digest11'>
                        Timpe
                    </Link>{' '}
                    (1900-2000 cohort) had a 2079 performance in a recent swiss tournament and will
                    soon be graduating into the 2000-2100 cohort.
                </Typography>

                <DojoAchievements
                    rating='151,649'
                    hours='75,831'
                    points='56,185'
                    graduations='1,698'
                />

                <Footer utmCampaign='digest11' />
            </Stack>
        </Container>
    );
}
