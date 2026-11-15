'use client';

import { anton } from '@/components/landing/fonts';
import senseisImage from '@/components/landing/hero.webp';
import backgroundImage from '@/components/landing/main-background.webp';
import { Link } from '@/components/navigation/Link';
import { fontFamily } from '@/style/font';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import { Body, INK, MUTED, ORANGE, scrollToOffer } from './shared';

export function Closing({ onWatch }: { onWatch: () => void }) {
    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: -2 }}>
                <Image
                    src={backgroundImage}
                    alt=''
                    fill
                    sizes='100vw'
                    style={{ objectFit: 'cover' }}
                />
            </Box>
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: -1,
                    background: `linear-gradient(180deg, ${INK} 0%, rgba(7, 7, 18, 0.88) 45%, rgba(7, 7, 18, 0.96) 100%)`,
                }}
            />
            <Container
                maxWidth='lg'
                sx={{
                    py: { xs: '4.5rem', md: '7rem' },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
                    gap: { xs: 5, md: 7 },
                    alignItems: 'center',
                }}
            >
                <Box>
                    <Typography
                        component='h2'
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, anton),
                            fontSize: { xs: '2.75rem', md: '4.25rem' },
                            lineHeight: 1.08,
                            textWrap: 'balance',
                        }}
                    >
                        The next class is already on the calendar.
                    </Typography>
                    <Body sx={{ mt: 2.5, color: 'common.white', fontSize: '1.25rem' }}>
                        Pick a plan and bring your questions to the next one.
                    </Body>
                    <Stack direction='row' sx={{ mt: 3.5, gap: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            variant='contained'
                            color='dojoOrange'
                            size='large'
                            onClick={scrollToOffer}
                            sx={{ minHeight: 52, px: 4, fontWeight: 600, fontSize: '1.05rem' }}
                        >
                            Choose my plan
                        </Button>
                        <Button
                            variant='outlined'
                            color='inherit'
                            size='large'
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                onWatch();
                            }}
                            sx={{
                                minHeight: 52,
                                fontWeight: 600,
                                borderColor: 'rgba(255,255,255,0.6)',
                            }}
                        >
                            Watch the free class
                        </Button>
                    </Stack>
                </Box>
                <Image
                    src={senseisImage}
                    alt='IM David Pruess, GM Jesse Kraai and IM Kostya Kavutskiy'
                    sizes='(max-width: 900px) 100vw, 560px'
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                />
            </Container>
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 2.5,
                    pb: { xs: 11, md: 11 },
                    color: MUTED,
                    fontSize: '0.92rem',
                    '& a': { color: 'inherit' },
                    '& a:hover': { color: ORANGE },
                }}
            >
                <span>© ChessDojo</span>
                <Link href='/privacy-policy'>Privacy Policy</Link>
                <Link href='/help'>Help</Link>
                <Link href='/calendar'>Class calendar</Link>
            </Stack>
        </Box>
    );
}
