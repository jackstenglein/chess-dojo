'use client';

import davidImage from '@/components/landing/david.webp';
import jesseImage from '@/components/landing/jesse.webp';
import kostyaImage from '@/components/landing/kostya.webp';
import { Box, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import friedelImage from '../assets/friedel.webp';
import perelshteynImage from '../assets/perelshteyn.webp';
import tatevImage from '../assets/tatev.webp';
import { Body, Condensed, Heading, ORANGE, revealSx, Section } from './shared';

const SENSEIS = [
    {
        title: 'GM',
        name: 'Jesse Kraai',
        image: jesseImage,
        line: 'He became a GM in 2007 by consistently examining his games.',
        bio: 'Jesse has been playing and teaching chess since deep in the last millennium. He has played in seven US Championships and scored clear second in the 2024 US Senior Closed.',
    },
    {
        title: 'IM',
        name: 'Kostya Kavutskiy',
        image: kostyaImage,
        line: 'A coach for the United States at World Youth and Pan-American Championships.',
        bio: 'Kostya earned the IM title at 24 and has taught all levels for over 15 years. He is a published author and has produced popular courses for Chess.com and Chessable.',
    },
    {
        title: 'IM',
        name: 'David Pruess',
        image: davidImage,
        line: 'He helped design the Training Program to cross the 2500 barrier.',
        bio: 'David became an IM in 2003, won the Samford Chess Fellowship in 2006 and has all three Grandmaster norms.',
    },
];

const WORKSHOP_TEACHERS = [
    {
        title: 'GM',
        name: 'Josh Friedel',
        image: friedelImage,
        teaches: 'Checkmate Patterns',
        bio: 'Josh became a Grandmaster in 2008 and won the 2013 U.S. Open in a playoff. A coach and opening specialist, he has also written for Chess Life.',
    },
    {
        title: 'IM',
        name: 'Tatev Abrahamyan',
        image: tatevImage,
        teaches: 'Attacking 101',
        bio: 'Tatev has played for the United States since 2002. She was part of the bronze-winning US team at the 2008 Olympiad and finished second at the US Women’s Championship in 2004 and 2011.',
    },
    {
        title: 'GM',
        name: 'Eugene Perelshteyn',
        image: perelshteynImage,
        teaches: 'The London System',
        bio: 'Eugene won the 2000 US Junior Closed and became a Grandmaster in 2006. He co-wrote Chess Openings for White, Explained and Evaluate Like a Grandmaster, and has over 20 years of teaching experience.',
    },
];

export function Senseis() {
    return (
        <Section>
            <Heading center>The senseis who run the Dojo</Heading>
            <Stack sx={{ gap: { xs: 7, md: 9 } }}>
                {SENSEIS.map((sensei, index) => (
                    <Box
                        key={sensei.name}
                        sx={{
                            ...revealSx,
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: index % 2 ? '1.2fr 1fr' : '1fr 1.2fr',
                            },
                            gap: { xs: 3, md: 8 },
                            alignItems: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                order: { md: index % 2 ? 2 : 1 },
                                justifySelf: 'center',
                                width: { xs: '17rem', md: '25rem' },
                            }}
                        >
                            <Image
                                src={sensei.image}
                                alt={`${sensei.title} ${sensei.name}`}
                                sizes='(max-width: 900px) 272px, 400px'
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                            />
                        </Box>
                        <Box sx={{ order: { md: index % 2 ? 1 : 2 } }}>
                            <Stack direction='row' sx={{ alignItems: 'center', gap: 1.25 }}>
                                <Box
                                    sx={{
                                        px: 0.9,
                                        py: 0.1,
                                        borderRadius: 0.75,
                                        bgcolor: '#8E2F2F',
                                        fontWeight: 700,
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    {sensei.title}
                                </Box>
                                <Condensed
                                    component='h3'
                                    sx={{
                                        fontSize: { xs: '2.25rem', md: '3rem' },
                                        fontWeight: 500,
                                    }}
                                >
                                    {sensei.name}
                                </Condensed>
                            </Stack>
                            <Typography
                                variant='body2'
                                sx={{
                                    mt: 1.5,
                                    color: ORANGE,
                                    fontStyle: 'italic',
                                    lineHeight: 1.35,
                                    fontSize: '1.2rem',
                                }}
                            >
                                {sensei.line}
                            </Typography>
                            <Body sx={{ mt: 1.5, fontSize: '1.25rem' }}>{sensei.bio}</Body>
                        </Box>
                    </Box>
                ))}
            </Stack>
            <Condensed
                component='h3'
                sx={{
                    mt: { xs: 8, md: 11 },
                    mb: { xs: 4, md: 5 },
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: { xs: '2rem', md: '2.75rem' },
                }}
            >
                Also teaching your workshops
            </Condensed>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    gap: { xs: 6, md: 5 },
                }}
            >
                {WORKSHOP_TEACHERS.map((teacher) => (
                    <Stack
                        key={teacher.name}
                        sx={{ ...revealSx, alignItems: 'center', textAlign: 'center' }}
                    >
                        <Box
                            sx={{
                                width: '11.5rem',
                                height: '11.5rem',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: `5px solid ${ORANGE}`,
                            }}
                        >
                            <Image
                                src={teacher.image}
                                alt={`${teacher.title} ${teacher.name}`}
                                sizes='184px'
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        </Box>
                        <Stack direction='row' sx={{ mt: 2, alignItems: 'center', gap: 1 }}>
                            <Box
                                sx={{
                                    px: 0.75,
                                    borderRadius: 0.75,
                                    bgcolor: '#8E2F2F',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                }}
                            >
                                {teacher.title}
                            </Box>
                            <Condensed sx={{ fontSize: '1.9rem', fontWeight: 500 }}>
                                {teacher.name}
                            </Condensed>
                        </Stack>
                        <Typography
                            variant='body2'
                            sx={{ mt: 0.75, color: ORANGE, fontStyle: 'italic' }}
                        >
                            Teaches {teacher.teaches}
                        </Typography>
                        <Body sx={{ mt: 1.25 }}>{teacher.bio}</Body>
                    </Stack>
                ))}
            </Box>
        </Section>
    );
}
