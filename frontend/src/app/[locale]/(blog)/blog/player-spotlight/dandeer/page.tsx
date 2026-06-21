import {
    Container,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Typography,
} from '@mui/material';
import { Metadata } from 'next';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import { GameViewer } from '../GameViewer';
import { Question } from '../Question';
import image from './opengraph-image.jpg';

export const metadata: Metadata = {
    title: 'Dojo Player Spotlight | Dandeer',
    description:
        'Dandeer is a member of the 1300-1400 cohort and plays classical OTB at his club in Hungary.',
};

export default function Page() {
    return (
        <Stack spacing={2} alignItems='center' sx={{ pb: 5 }}>
            <Container maxWidth='sm' sx={{ pt: 5 }}>
                <Header
                    title='Dandeer'
                    subtitle='Dojo Player Spotlight • September 30, 2024'
                    image={image}
                    imageCaption='Dandeer (with the black pieces) playing a 90+30 tournament at his club in Hungary in April 2024'
                />

                <Question>Key Stats</Question>
                <Table sx={{ mb: 1 }}>
                    <TableBody>
                        <TableRow>
                            <TableCell>Dojo Cohort</TableCell>
                            <TableCell>1300-1400</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Current Rating</TableCell>
                            <TableCell>1591 FIDE</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total Dojo Points</TableCell>
                            <TableCell>53.17</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total Time Spent</TableCell>
                            <TableCell>191h 1m</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                <Typography variant='caption' sx={{ mb: 2 }}>
                    <Link
                        target='_blank'
                        href='https://www.chessdojo.club/profile/255d01b5-2f0c-48d8-9ecc-4033cecd17a1?utm_source=playerspotlight&utm_medium=blog&utm_campaign=dandeer'
                    >
                        View Dandeer's Profile
                    </Link>
                </Typography>

                <Question>What has been your journey with chess so far?</Question>

                <Typography>
                    I'm 33 and I got serious about chess at 26, when an adolescent kid beat me up. I
                    got mad and started watching Ben Finegold on YouTube. The fact that I didn't
                    learn anything about it in my childhood hurts me, but I do everything I can to
                    compensate for that. First I played on Lichess, then joined the next-door club,
                    and started going to tournaments regularly. I'm your definition of an adult
                    improver, as everything I learned in chess I learned as an adult. I have 2 kids
                    now, so I wake up every day at 4am to analyse and do ChessDojo stuff.
                </Typography>

                <Question>Why did you join the Dojo?</Question>

                <Typography>
                    I was stuck below 1300, and wanted to get better. My long-term goal is to work
                    as a chess coach, either part-time or full-time.
                </Typography>

                <Question>What are your main chess goals?</Question>
                <Typography>
                    Keeping my mind fresh is the most important thing. Mentally I experience a lot
                    of growth because of this hobby. I see a lot of players over 70 at tournaments
                    whose minds are still clean. I want to keep playing while I live on this Earth.
                    As of September 2024 my club plays in national second division, and I'm proud to
                    be part of the small squad. I want to play in div. 2 as much as possible, and I
                    want to get to 1800 by trusting the program. I am so thankful for this
                    community.
                </Typography>

                <Question>What is a non-chess fun fact about you?</Question>
                <Typography>
                    I refuse to work full-time! Life is too short to work 50-60 hours per week. I
                    work from Monday till Thursday.
                </Typography>

                <Question>Check out one of Dandeer's games:</Question>
            </Container>

            <GameViewer cohort='1300-1400' id='2024.08.26_74044686-c0b3-4cd6-83c1-c62833a9c994' />

            <Container maxWidth='sm' sx={{ mt: 8 }}>
                <Typography textAlign='center'>
                    Interested in being featured on the blog? Fill out{' '}
                    <Link
                        target='_blank'
                        href='https://docs.google.com/forms/d/e/1FAIpQLSenHkmnr88V9JEGf6_L0RDvnpZ6nTX7CUJTEvGao9Lk0qbd-w/viewform?usp=sf_link'
                    >
                        this form
                    </Link>
                    !
                </Typography>

                <Footer utmSource='playerspotlight' utmCampaign='dandeer' />
            </Container>
        </Stack>
    );
}
