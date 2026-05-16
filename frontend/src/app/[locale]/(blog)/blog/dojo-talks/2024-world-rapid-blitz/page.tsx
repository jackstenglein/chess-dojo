import { Container, Divider, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { ReactNode } from 'react';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';

export const metadata: Metadata = {
    title: '2024 World Rapid & Blitz w/ GM Hammer | Dojo Talks',
    description:
        'The sensei are joined by GM Jon Ludvig Hammer to discuss the 2024 World Rapid Blitz Championship.',
};

const SectionHeader = ({ children }: { children: ReactNode }) => (
    <Typography variant='subtitle1' fontWeight='bold' sx={{ mt: 3 }}>
        {children}
    </Typography>
);

export default function DojoTalks2024WorldRapidBlitz() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Header
                title={
                    <>
                        2024 World Rapid & Blitz w/ GM Hammer <br /> Dojo Talks
                    </>
                }
                subtitle='Jesse, Kostya, David, & GM Hammer • January 3, 2025'
            />

            <Typography mb={3}>
                The sensei are joined by GM Jon Ludvig Hammer to discuss the 2024 World Rapid Blitz
                Championship and Magnus Carlsen's controversial decision to split the championship
                title with Ian Nepomniachtchi, drawing significant criticism for bending competition
                rules and setting a troubling precedent.
            </Typography>

            <iframe
                width='100%'
                style={{ aspectRatio: '16 / 9' }}
                src='https://www.youtube.com/embed/XDhXhCqVQzM'
                title='YouTube video player'
                frameBorder='0'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
            />

            <Typography variant='h5' sx={{ mt: 5 }}>
                Summary of episode
            </Typography>

            <SectionHeader>Introduction and Guest Introduction (00:06)</SectionHeader>
            <Typography>
                Introduction of GM Jon Ludvig Hammer, his background, and promotion of his new
                Chessable course.
            </Typography>

            <SectionHeader>
                Topic Overview: Blitz Championship and Magnus Carlsen (00:37)
            </SectionHeader>
            <Typography>
                Discussion on Magnus Carlsen, his mindset, and takeaways from the Blitz
                Championship.
            </Typography>

            <SectionHeader>Impressions of Abdusattorov and Rising Stars (01:16)</SectionHeader>
            <Typography>
                Hammer discusses Abdusattorov’s rise and breakout performances in Blitz/Rapid
                formats.
            </Typography>
            <SectionHeader>
                Magnus Carlsen and Nepomniachtchi Sharing the Title Controversy (02:32)
            </SectionHeader>
            <Typography>
                Analysis of Magnus and Nepomniachtchi’s decision to share the Blitz Championship
                title and the public reaction.
            </Typography>

            <SectionHeader>Social Media and Viewer Perspectives on the Tie (03:15)</SectionHeader>
            <Typography>
                Hammer reflects on how perspectives differ depending on social circles and broadcast
                narratives.
            </Typography>
            <SectionHeader>
                Hammer’s Stance on Sportsmanship and Rule-breaking (04:08)
            </SectionHeader>
            <Typography>
                Arguments against sharing titles and comparisons to other sports regulations.
            </Typography>
            <SectionHeader>Comparisons to Past Events and Grandmaster Draws (08:21)</SectionHeader>
            <Typography>
                Parallels drawn to the "Grandmaster draw" era and Magnus’s evolving mindset.
            </Typography>
            <SectionHeader>
                Magnus Carlsen’s Motivation Behind Sharing the Title (12:20)
            </SectionHeader>
            <Typography>
                Speculations on Magnus’s motivations, including fatigue, strategy, and respect for
                Nepomniachtchi.
            </Typography>
            <SectionHeader>Hammer’s View on Magnus’s Changing Chess Career (29:03)</SectionHeader>
            <Typography>
                Insights into Magnus’s current form, work ethic, and future direction in chess.
            </Typography>
            <SectionHeader>FIDE’s Role in Allowing the Shared Title (34:15)</SectionHeader>
            <Typography>
                Analysis of FIDE’s decision-making and its implications for chess governance.
            </Typography>
            <SectionHeader>Freestyle Chess and FIDE Rivalries (41:04)</SectionHeader>
            <Typography>
                Discussion on the growing divide between FIDE and freestyle chess organizers.
            </Typography>
            <SectionHeader>Hammer’s Final Thoughts on the Controversy (48:22)</SectionHeader>
            <Typography>
                Hammer critiques Magnus’s recent decisions and shares predictions for the future.
            </Typography>
            <SectionHeader>Conclusion and Upcoming Topics (52:06)</SectionHeader>
            <Typography>
                Closing remarks and teaser for an upcoming episode on openings for beginners.
            </Typography>

            <Divider sx={{ my: 6 }} />

            <Typography fontWeight='bold' textAlign='center'>
                Make sure to follow the DojoTalks podcast
            </Typography>

            <Stack direction='row' justifyContent='center' alignItems='center' gap='20px' mt={2}>
                <a
                    href='https://www.youtube.com/chessdojo'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <Image
                        src='https://th.bing.com/th/id/R.aa96dba2d64d799f0d1c6a02e4acdebb?rik=c8ee4vAHUDLR6g&riu=http%3a%2f%2fwww.freeiconspng.com%2fuploads%2fyoutube-icon-21.png&ehk=OC7MLPky6SWdtoLCCQRd94v%2bJ5GAFSBXzcJ%2fu4zbhNE%3d&risl=&pid=ImgRaw&r=0'
                        width={50}
                        height={50}
                        alt='YouTube Logo'
                    />
                </a>

                <a
                    href='https://chessdojotalks.podbean.com/'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <Image
                        src='https://chess-dojo-images.s3.amazonaws.com/emails/podbean+logo.png'
                        width={50}
                        height={50}
                        alt='Podbean Logo'
                    />
                </a>
            </Stack>

            <Footer utmCampaign='dojotalks_top-10-2025' />
        </Container>
    );
}
