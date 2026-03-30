import SocialIcons from '@/components/navigation/navbar/SocialIcons';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { Box, Button, Container, Grid, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '../navigation/Link';

import type { JSX } from 'react';

export function Footer() {
    const t = useTranslations('landing');

    return (
        <Box
            sx={{
                width: 1,
                minHeight: 'var(--navbar-height)',
                borderTop: '3px solid',
                borderImage: 'linear-gradient(90deg, #1875EE 0%, #2A86FF 100%) 1',
                backgroundImage: 'var(--mui-overlays-2)',
                py: { xs: 3, md: 0 },
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Container maxWidth='lg'>
                <Grid container alignItems='center'>
                    <FooterItem>
                        <ChessDojoIcon />
                        <Typography sx={{ ml: 1, display: { xs: 'initial', md: 'none' } }}>
                            {t('footer.chessDojo')}
                        </Typography>
                    </FooterItem>
                    <FooterItem>
                        <Button
                            component={Link}
                            href='/blog'
                            sx={{ color: 'white', mt: { xs: 1, md: 0 } }}
                        >
                            {t('footer.blog')}
                        </Button>
                    </FooterItem>
                    <FooterItem>
                        <Button component={Link} href='/help' sx={{ color: 'white' }}>
                            {t('footer.contactUs')}
                        </Button>
                    </FooterItem>
                    <FooterItem>
                        <Button component={Link} href='/donate' sx={{ color: 'white' }}>
                            {t('footer.donate')}
                        </Button>
                    </FooterItem>
                    <Grid size={{ xs: 0, md: 'grow' }}></Grid>
                    <FooterItem>
                        <SocialIcons />
                    </FooterItem>
                </Grid>

                {/* <Stack
                    direction='row'
                    justifyContent={{ xs: 'center', md: 'space-between' }}
                    alignItems='center'
                    height={1}
                    flexWrap='wrap'
                >
                    <Stack
                        direction='row'
                        alignItems='center'
                        flexWrap='wrap'
                        justifyContent='center'
                    >
                        <ChessDojoIcon />
                        <Button sx={{ color: 'white' }}>Blog</Button>
                        <Button sx={{ color: 'white' }}>Contact Us</Button>
                        <Button sx={{ color: 'white' }}>Donate to the Dojo</Button>
                    </Stack>

                    <SocialIcons />
                </Stack> */}
            </Container>
        </Box>
    );
}

function FooterItem({ children }: { children: JSX.Element | JSX.Element[] }) {
    return (
        <Grid
            size={{ xs: 12, md: 'auto' }}
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
            {children}
        </Grid>
    );
}
