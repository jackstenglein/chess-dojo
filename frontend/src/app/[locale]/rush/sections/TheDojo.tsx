import davidImage from '@/components/landing/david.webp';
import jesseImage from '@/components/landing/jesse.webp';
import kostyaImage from '@/components/landing/kostya.webp';
import { Box, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import { Condensed, Heading, MUTED, revealSx, Section } from '../../class/sections/shared';
import { SENSEIS, SENSEIS_HEADING } from '../content';
import { bodyFontSx } from './parts';

const SENSEI_IMAGES = { jesse: jesseImage, kostya: kostyaImage, david: davidImage };

/** The three founders, each with one line about who they are. */
export function Senseis() {
    return (
        <Section sx={{ py: { xs: '4rem', md: '6rem' } }}>
            <Heading sx={{ mb: { xs: 4, md: 6 } }}>{SENSEIS_HEADING}</Heading>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    gap: { xs: 3, md: 5 },
                }}
            >
                {SENSEIS.map((sensei) => (
                    <Stack
                        key={sensei.name}
                        direction={{ xs: 'row', md: 'column' }}
                        sx={{ ...revealSx, gap: { xs: 2, md: 2.5 }, alignItems: 'flex-start' }}
                    >
                        <Box
                            sx={{
                                flexShrink: 0,
                                width: { xs: '6.5rem', md: '15rem' },
                            }}
                        >
                            <Image
                                src={SENSEI_IMAGES[sensei.key]}
                                alt={`${sensei.title} ${sensei.name}`}
                                sizes='(max-width: 900px) 104px, 240px'
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                            />
                        </Box>
                        <Box>
                            <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                                <Box
                                    sx={{
                                        px: 0.75,
                                        borderRadius: 0.75,
                                        bgcolor: '#8E2F2F',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {sensei.title}
                                </Box>
                                <Condensed
                                    component='h3'
                                    sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' } }}
                                >
                                    {sensei.name}
                                </Condensed>
                            </Stack>
                            <Typography
                                sx={{ ...bodyFontSx, mt: 0.75, color: MUTED, fontSize: '1.05rem' }}
                            >
                                {sensei.line}
                            </Typography>
                        </Box>
                    </Stack>
                ))}
            </Box>
        </Section>
    );
}
