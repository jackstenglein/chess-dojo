import { Container, Divider, Link, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';
import youtube from './lifecanbesonice-youtube.png';

export const metadata: Metadata = {
    title: 'Dojo Player Spotlight | LifeCanBeSoNice',
    description: `Jan, aka LifeCanBeSoNice, is going for it. Since joining the Dojo last year he has gained 279 points and has started his own chess improvement channel with his coach IM Jurica Srbis. His goal is 2000 Lichess. It's a magical number! Will he be able to make it?`,
};

export default function DojoTalksTop2025() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Header title='LifeCanBeSoNice' subtitle='Dojo Player Spotlight • September 2, 2024' />

            <Typography mb={3}>
                Jan, aka{' '}
                <Link href='https://www.chessdojo.club/profile/90957cf2-7e8c-43a7-a4f3-f063f24e3781?utm_source=playerspotlight&utm_medium=blog&utm_campaign=lifecanbesonice'>
                    LifeCanBeSoNice
                </Link>
                , is going for it. Since joining the Dojo last year, he has gained 279 points and
                has started his own chess improvement channel with his coach IM Jurica Srbis. His
                goal is 2000 Lichess. It's a magical number! Will he be able to make it?
            </Typography>
            <Typography>
                <strong>The good news:</strong>
            </Typography>
            <br />

            <Typography>
                1) He's doing good work in analyzing his own games — take a look at{' '}
                <Link href='https://www.chessdojo.club/games/1300-1400/2024.03.03_b42ba0ca-b5eb-4c7b-9c60-7010ddf26fc1?utm_source=playerspotlight&utm_medium=blog&utm_campaign=lifecanbesonice'>
                    this one
                </Link>
                .
            </Typography>
            <br />
            <Typography>
                2) He's taking his time! That's one of the biggest problems the Dojo sees in players
                at his level (1300-1400 cohort).
            </Typography>
            <br />
            <Typography>
                3) He's got a good coach with whom he has a fun working relationship with.
            </Typography>
            <br />
            <Typography> 4) And best of all he's trusting the program!</Typography>
            <br />
            <Typography>
                Sensei Kraai thinks the following two areas will be the biggest challenge:
            </Typography>
            <br />
            <Typography>
                1) He needs to tighten up his grip on the board, ie he sometimes still hangs pieces.
                This can be helped by: doing the mates (I know I know, it's not that fun!) and doing
                any kind of calculation work where you have to see a couple moves ahead, where you
                are forced to see what controls what. This is sweatwork.
            </Typography>
            <br />
            <Typography>
                2) He needs to trust in development! In too many games, Jan is giving away time for
                free. He needs to get some tempo religion. Das Tempo ist die Seele des Schaches
                (Time is the Soul of Chess) – Siegbert Tarrasch.
            </Typography>
            <br />
            <Typography>
                The Dojo is pumped to follow{' '}
                <Link href='https://www.youtube.com/@ChessUnderFireALearningJourney'>
                    Jan's new chess channel
                </Link>
                !
            </Typography>

            <Image
                src={youtube}
                alt=''
                style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                }}
            />
            <br />
            <Typography>
                Learn more about Jan's life and chess adventure on the{' '}
                <Link href='https://podcasts.apple.com/us/podcast/ep-162-jan-1750-lichess/id1577673957?i=1000666999123'>
                    Chess Journeys Podcast
                </Link>
                . Jan starts talking about the Dojo at the 12 minute mark.
            </Typography>

            <Divider sx={{ my: 6 }} />

            <Footer utmSource='playerspotlight' utmCampaign='lifecanbesonice' />
        </Container>
    );
}
