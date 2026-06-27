import { Container, Divider, Link, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import { ReactNode } from 'react';
import { Footer } from '../../common/Footer';
import { Header } from '../../common/Header';

export const metadata: Metadata = {
    title: 'Who Will Be Top 10 in 2025? | Dojo Talks',
    description:
        "GM Jesse Kraai, IM David Pruess, and IM Kostya Kavutskiy forecast who will be the top 10 FIDE rated chess players in June 2025 in today's episode of Dojo Talks, the ChessDojo podcast.",
};

const SectionHeader = ({ children }: { children: ReactNode }) => (
    <Typography variant='subtitle1' fontWeight='bold' sx={{ mt: 3 }}>
        {children}
    </Typography>
);

export default function DojoTalksTop2025() {
    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Header
                title={
                    <>
                        Who Will Be Top 10 in 2025? <br /> Dojo Talks
                    </>
                }
                subtitle='Jesse, Kostya, & David • June 7, 2024'
            />

            <Typography mb={3}>
                GM Jesse Kraai, IM David Pruess, and IM Kostya Kavutskiy forecast who will be the
                top 10 FIDE rated chess players in June 2025 in today's episode of Dojo Talks, the
                ChessDojo podcast.
            </Typography>

            <iframe
                width='100%'
                style={{ aspectRatio: '16 / 9' }}
                src='https://www.youtube.com/embed/pJksjHfzo7Q'
                title='YouTube video player'
                frameBorder='0'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
            />

            <Typography variant='h5' sx={{ mt: 5 }}>
                Summary of episode
            </Typography>

            <SectionHeader>Introduction - 00:04 to 00:46</SectionHeader>
            <Typography>
                Kostya introduces the episode's topic: Predicting the top 10 chess players for June
                2025.
            </Typography>

            <SectionHeader>Update on Junior Draft Standings - 00:46 to 03:33</SectionHeader>
            <Typography>
                Discussion on the{' '}
                <Link href='https://youtu.be/8BnPNbpE1Qc?si=GfIt2hTyDLIeZy6u' target='_blank'>
                    Junior Draft
                </Link>{' '}
                from October 2023 and how those players are performing.
            </Typography>

            <SectionHeader>Recent Changes in Top 10 - 03:33 to 06:17</SectionHeader>
            <Typography>
                New players entering the top 10, particularly Juniors like Arjun and Nodirbek.
            </Typography>

            <SectionHeader>Juniors' Performance Overview - 06:17 to 08:52</SectionHeader>
            <Typography>Analysis of drafted juniors' performance over the past year.</Typography>

            <SectionHeader>Top 10 Players (Current) - 10:04 to 12:43</SectionHeader>
            <Typography>
                Listing and discussion of the current top 10 players as of June 2024.
            </Typography>

            <SectionHeader>Comparison to Last Year's Top 10 - 11:47 to 15:28</SectionHeader>
            <Typography>
                Comparing the current top 10 to the list from June 2023 and discussing notable
                changes.
            </Typography>

            <SectionHeader>
                Individual Predictions for Top 10 in 2025 - 13:50 to 55:28
            </SectionHeader>
            <Typography>
                Jesse, David, and Kostya share and debate their predictions for the top 10 chess
                players in June 2025.
            </Typography>

            <SectionHeader>Average Rankings - 55:28 to 58:03</SectionHeader>
            <Typography>Combining individual rankings to create an average top 10 list.</Typography>

            <SectionHeader>Final Thoughts - 58:03 to 1:02:35</SectionHeader>
            <Typography>
                Jesse, Kostya, and David discuss possible changes to the FIDE rating system.
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
