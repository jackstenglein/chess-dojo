import { fontFamily } from '@/style/font';
import { Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { BulletPoint } from './BulletPoint';
import { communityBulletPoints } from './bulletPoints';
import { barlow, barlowCondensed } from './fonts';
import { JoinDojoButton } from './JoinDojoButton';

export function Community() {
    const t = useTranslations('landing');

    return (
        <Container maxWidth='lg' sx={{ py: '5.5rem' }}>
            <Grid container spacing='2rem'>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack
                        sx={{
                            alignItems: { xs: 'center', md: 'start' },
                            gap: '1.5rem',
                            position: { xs: 'unset', md: 'sticky' },
                            top: 'calc(var(--navbar-height) + 1rem)',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '3rem',
                                lineHeight: '3.375rem',
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                fontWeight: '500',
                                textAlign: { xs: 'center', md: 'start' },
                            }}
                        >
                            {t('communitySection.heading')}
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
                                textAlign: { xs: 'center', md: 'start' },
                            }}
                        >
                            {t('communitySection.description')}
                        </Typography>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid
                        container
                        spacing='2rem'
                        sx={{
                            justifyContent: { xs: 'center', md: 'start' },
                        }}
                    >
                        {communityBulletPoints.map((bp) => (
                            <Grid size={{ xs: 11, md: 6 }} key={bp.key}>
                                <BulletPoint
                                    title={t(`community.${bp.key}.title`)}
                                    description={t(`community.${bp.key}.description`)}
                                />
                            </Grid>
                        ))}

                        <Grid
                            size={12}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                mt: 3,
                            }}
                        >
                            <JoinDojoButton />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Container>
    );
}
