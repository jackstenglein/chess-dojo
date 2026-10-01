import SocialIcons from '@/components/navigation/navbar/SocialIcons';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '../navigation/Link';
import { barlowCondensed, eyebrowSx } from './fonts';

const productLinks = [
    { key: 'features', href: '#features' },
    { key: 'liveClasses', href: '#live-classes' },
    { key: 'pricing', href: '#pricing' },
    { key: 'senseis', href: '#senseis' },
    { key: 'blog', href: '/blog' },
] as const;

const companyLinks = [
    { key: 'help', href: '/help' },
    { key: 'donate', href: '/donate' },
    { key: 'privacy', href: '/privacy-policy' },
    { key: 'signIn', href: '/signin' },
] as const;

export function Footer() {
    const t = useTranslations('landing');

    return (
        <Box
            sx={{
                width: 1,
                borderTop: '3px solid',
                borderImage: 'linear-gradient(90deg, #1875EE 0%, #2A86FF 100%) 1',
                backgroundImage: 'var(--mui-overlays-2)',
                py: { xs: 4, md: 5 },
            }}
        >
            <Container maxWidth='lg'>
                <Grid
                    container
                    spacing={{ xs: 4, md: 3 }}
                    sx={{
                        alignItems: { xs: 'center', md: 'flex-start' },
                    }}
                >
                    <Grid size={{ xs: 12, md: 'auto' }}>
                        <Stack
                            direction='row'
                            sx={{
                                alignItems: 'center',
                                justifyContent: { xs: 'center', md: 'flex-start' },
                            }}
                        >
                            <ChessDojoIcon />
                            <Typography sx={{ ml: 1 }}>{t('footer.chessDojo')}</Typography>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FooterColumn heading={t('footer.product')} links={productLinks} t={t} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FooterColumn heading={t('footer.company')} links={companyLinks} t={t} />
                    </Grid>

                    <Grid
                        size={{ xs: 12, md: 'grow' }}
                        sx={{
                            display: 'flex',
                            justifyContent: { xs: 'center', md: 'flex-end' },
                            alignItems: 'center',
                        }}
                    >
                        <SocialIcons />
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}

function FooterColumn({
    heading,
    links,
    t,
}: {
    heading: string;
    links: readonly { key: string; href: string }[];
    t: ReturnType<typeof useTranslations<'landing'>>;
}) {
    return (
        <Stack
            sx={{
                alignItems: { xs: 'center', sm: 'flex-start' },
                gap: 1,
            }}
        >
            <Typography
                sx={{
                    ...eyebrowSx,
                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                    color: 'text.secondary',
                    mb: 0.5,
                }}
            >
                {heading}
            </Typography>
            {links.map((link) => (
                <Link
                    key={link.key}
                    href={link.href}
                    color='inherit'
                    underline='hover'
                    sx={{ fontWeight: 500 }}
                    onClick={(e) => {
                        if (!link.href.startsWith('#')) {
                            return;
                        }
                        e.preventDefault();
                        document
                            .getElementById(link.href.slice(1))
                            ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    {t(`footer.${link.key}`)}
                </Link>
            ))}
        </Stack>
    );
}
