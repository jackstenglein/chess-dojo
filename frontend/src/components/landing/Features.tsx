import { fontFamily } from '@/style/font';
import { CalendarMonth, Insights, MenuBook, Visibility } from '@mui/icons-material';
import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { type JSX } from 'react';
import { featureTiles } from './bulletPoints';
import mockUIImage from './features-mock.webp';
import { barlow, barlowCondensed, sectionTitleSx } from './fonts';

export const FEATURES_ELEMENT_ID = 'features';

const featureIcons: Record<string, JSX.Element> = {
    dailyTasks: <CalendarMonth />,
    progressTracking: <Insights />,
    openingSpy: <Visibility />,
    annotatedGames: <MenuBook />,
};

export function Features() {
    const t = useTranslations('landing');

    return (
        <Container
            id={FEATURES_ELEMENT_ID}
            maxWidth='lg'
            sx={{ py: '5.5rem', scrollMarginTop: { xs: 0, md: 'var(--navbar-height)' } }}
        >
            <Stack
                sx={{
                    alignItems: 'center',
                    mb: { xs: '2.5rem', md: '3.5rem' },
                    gap: 2,
                }}
            >
                <Typography
                    sx={{
                        ...sectionTitleSx,
                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                        textAlign: 'center',
                    }}
                >
                    {t('features.heading')}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlow),
                        fontSize: '1.25rem',
                        lineHeight: '1.875rem',
                        textAlign: 'center',
                        maxWidth: '40rem',
                        color: 'text.secondary',
                    }}
                >
                    {t('features.subheading')}
                </Typography>
            </Stack>

            <Box
                sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    mb: { xs: '2.5rem', md: '3.5rem' },
                }}
            >
                <Image
                    alt={t('features.imageAlt')}
                    src={mockUIImage}
                    style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                    }}
                />
            </Box>

            <Grid container spacing='1.5rem'>
                {featureTiles.map(({ key }) => (
                    <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
                        <FeatureTile
                            icon={featureIcons[key]}
                            title={t(`features.tiles.${key}.title`)}
                            description={t(`features.tiles.${key}.description`)}
                        />
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

function FeatureTile({
    icon,
    title,
    description,
}: {
    icon: JSX.Element;
    title: string;
    description: string;
}) {
    return (
        <Stack
            sx={{
                height: 1,
                gap: 1.5,
                padding: '1.5rem',
                background: 'linear-gradient(180deg, #1B1B2C 0%, #06060B 100%)',
                borderRadius: 1,
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'dojoOrange.main',
                    backgroundColor: 'rgba(247, 148, 31, 0.12)',
                    '& .MuiSvgIcon-root': { fontSize: '1.5rem' },
                }}
            >
                {icon}
            </Box>
            <Typography
                sx={{
                    textTransform: 'uppercase',
                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                    fontWeight: 600,
                    fontSize: '1.25rem',
                    letterSpacing: '0.04em',
                    lineHeight: 1.2,
                }}
            >
                {title}
            </Typography>
            <Typography
                sx={{
                    fontFamily: (theme) => fontFamily(theme, barlow),
                    fontSize: '1.0625rem',
                    lineHeight: '1.6875rem',
                    color: 'text.secondary',
                }}
            >
                {description}
            </Typography>
        </Stack>
    );
}
