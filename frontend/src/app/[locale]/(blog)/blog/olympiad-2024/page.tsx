import { Container, Divider, Link, Typography } from '@mui/material';
import { Metadata } from 'next';
import { Footer } from '../common/Footer';
import { Header } from '../common/Header';

export const metadata: Metadata = {
    title: 'Dojo at the Olympiad!',
    description: `Jan (LifeCanBeSoNice) got the party started with an amazing AI driven hype video, and Sensei David covers German #1 Vincent Keymer's streak in the 2024 Akiba Rubinstein Memorial.`,
};

export default function DojoTalksTop2025() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Header title='Dojo at the Olympiad!' subtitle='September 12, 2024' />

            <Typography mb={3}>
                Jan, known in the Dojo as{' '}
                <Link href='https://www.chessdojo.club/profile/90957cf2-7e8c-43a7-a4f3-f063f24e3781?utm_source=playerspotlight&utm_medium=blog&utm_campaign=lifecanbesonice'>
                    LifeCanBeSoNice
                </Link>
                , got the party started with this amazing AI driven hype video.
            </Typography>

            <iframe
                width='100%'
                style={{ aspectRatio: '16 / 9' }}
                src='https://www.youtube.com/embed/2jwOHs9DlGQ?si=WWioRGU_ImGiIT7E'
                title='YouTube video player'
                frameBorder='0'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
            />

            <br />
            <br />
            <br />

            <Typography>And Sensei David did a vid about German #1 Vincent Keymer.</Typography>
            <br />
            <iframe
                width='100%'
                style={{ aspectRatio: '16 / 9' }}
                src='https://www.youtube.com/embed/9UW7F0czGDk?si=f_AyX9FGfA8QWOoa'
                title='YouTube video player'
                frameBorder='0'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
            />
            <br />
            <br />
            <Typography>
                The Dojo will cover several rounds of the Olympiad on{' '}
                <Link href='https://www.twitch.tv/chessdojo'>Twitch</Link> after sensei Kostya
                finishes his luxurious Italian norm event, which we are also covering. After Kostya
                has had all the pasta he can eat, he's heading over to Budapest with a fancy press
                pass. We will have our own reporter on the ground!
            </Typography>
            <Divider sx={{ my: 6 }} />

            <Footer utmSource='olympiad' utmCampaign='olympiad' />
        </Container>
    );
}
