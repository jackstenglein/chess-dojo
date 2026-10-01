import { fontFamily } from '@/style/font';
import { Box, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import davidImage from './david.webp';
import { barlow, barlowCondensed, eyebrowSx, sectionTitleSx } from './fonts';
import jesseImage from './jesse.webp';
import kostyaImage from './kostya.webp';

type SenseiKey = 'jesse' | 'kostya' | 'david';

const senseiImages: Record<SenseiKey, string> = {
    jesse: jesseImage,
    kostya: kostyaImage,
    david: davidImage,
};

const senseiKeys: SenseiKey[] = ['jesse', 'kostya', 'david'];

export const SENSEIS_ELEMENT_ID = 'senseis';

export function Senseis() {
    const t = useTranslations('landing');

    return (
        <Container
            id={SENSEIS_ELEMENT_ID}
            maxWidth='lg'
            sx={{ py: '5.5rem', scrollMarginTop: { xs: 0, md: 'var(--navbar-height)' } }}
        >
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
                                ...sectionTitleSx,
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
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
                    <Stack
                        sx={{
                            gap: '3.75rem',
                        }}
                    >
                        {senseiKeys.map((key) => (
                            <Sensei
                                key={key}
                                image={senseiImages[key]}
                                title={t(`senseis.${key}.title`)}
                                name={t(`senseis.${key}.name`)}
                                quote={t(`senseis.${key}.quote`)}
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
    quote,
    bio,
}: {
    image: string;
    title: string;
    name: string;
    quote: string;
    bio: string;
}) {
    return (
        <Box
            sx={{
                display: 'grid',
                columnGap: '1.5625rem',
                rowGap: 1,
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
            <Box
                sx={{
                    gridArea: 'image',
                    width: '9.375rem',
                    height: '9.375rem',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                <Image
                    src={image}
                    alt={name}
                    width={150}
                    height={150}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            </Box>

            <Stack
                sx={{
                    gridArea: 'name',
                    justifyContent: { xs: 'center', md: 'unset' },
                }}
            >
                <Typography color='darkBlue' sx={eyebrowSx}>
                    {title}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
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

            <Stack sx={{ gridArea: 'bio', gap: 1.5, mt: { xs: 1, md: 0.5 } }}>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlow),
                        fontWeight: 400,
                        fontSize: '1.1875rem',
                        lineHeight: '1.75rem',
                        fontStyle: 'italic',
                        color: 'dojoOrange.main',
                    }}
                >
                    “{quote}”
                </Typography>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlow),
                        fontWeight: '400',
                        fontSize: '1.1875rem',
                        lineHeight: '1.9375rem',
                    }}
                >
                    {bio}
                </Typography>
            </Stack>
        </Box>
    );
}
