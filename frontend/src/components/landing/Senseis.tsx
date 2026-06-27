import { fontFamily } from '@/style/font';
import { Box, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import davidImage from './david.webp';
import { barlow, barlowCondensed } from './fonts';
import jesseImage from './jesse.webp';
import kostyaImage from './kostya.webp';

type SenseiKey = 'jesse' | 'kostya' | 'david';

const senseiImages: Record<SenseiKey, string> = {
    jesse: jesseImage,
    kostya: kostyaImage,
    david: davidImage,
};

const senseiKeys: SenseiKey[] = ['jesse', 'kostya', 'david'];

export function Senseis() {
    const t = useTranslations('landing');

    return (
        <Container maxWidth='lg' sx={{ py: '5.5rem' }}>
            <Grid container spacing='2rem'>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack
                        sx={{
                            gap: '1.5rem',
                            position: { xs: 'unset', md: 'sticky' },
                            top: 'calc(var(--navbar-height) + 1rem)',
                            mb: { xs: 2, md: 0 },
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '3rem',
                                lineHeight: '3.375rem',
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                fontWeight: '500',
                            }}
                        >
                            {t('senseis.heading')}
                        </Typography>

                        <Divider
                            sx={{
                                height: '3px',
                                background:
                                    'linear-gradient(90deg, var(--mui-palette-darkBlue-main) 0%, var(--mui-palette-darkBlue-light) 100%)',
                                width: 0.37,
                            }}
                        />

                        <Typography
                            sx={{
                                fontFamily: (theme) => fontFamily(theme, barlow),
                                fontSize: '1.5rem',
                                lineHeight: '2.125rem',
                            }}
                        >
                            {t('senseis.description')}
                        </Typography>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack gap='3.75rem'>
                        {senseiKeys.map((key) => (
                            <Sensei
                                key={key}
                                image={senseiImages[key]}
                                title={t(`senseis.${key}.title`)}
                                name={t(`senseis.${key}.name`)}
                                bio={t(`senseis.${key}.bio`)}
                            />
                        ))}
                    </Stack>
                </Grid>
            </Grid>
        </Container>
    );
}

function Sensei({
    image,
    title,
    name,
    bio,
}: {
    image: string;
    title: string;
    name: string;
    bio: string;
}) {
    return (
        <Box
            sx={{
                display: 'grid',
                columnGap: '1.5625rem',
                gridTemplateColumns: {
                    xs: 'auto 1fr',
                },
                gridTemplateAreas: {
                    xs: `"image name"
                         "bio bio"`,
                    md: `"image name"
                         "image bio"`,
                },
            }}
        >
            <Image
                src={image}
                alt=''
                style={{
                    width: '9.375rem',
                    height: '9.375rem',
                    borderRadius: '50%',
                    objectFit: 'contain',
                    gridArea: 'image',
                }}
            />

            <Stack gridArea='name' justifyContent={{ xs: 'center', md: 'unset' }}>
                <Typography
                    color='darkBlue'
                    sx={{
                        fontWeight: '700',
                        fontSize: '0.9375rem',
                        lineHeight: '1.375rem',
                        letterSpacing: '10%',
                        textTransform: 'uppercase',
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: barlowCondensed.style.fontFamily,
                        fontWeight: '500',
                        fontSize: '2.625rem',
                        lineHeight: '2.625rem',
                        letterSpacing: '0%',
                        marginTop: '0.3125rem',
                    }}
                >
                    {name}
                </Typography>
            </Stack>

            <Typography
                gridArea='bio'
                sx={{
                    fontFmaily: barlow.style.fontFamily,
                    fontWeight: '400',
                    fontSize: '1.1875rem',
                    lineHeight: '1.9375rem',
                    letterSpacing: '0%',
                    marginTop: '0.9375rem',
                }}
            >
                {bio}
            </Typography>
        </Box>
    );
}
