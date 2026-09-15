import { fontFamily } from '@/style/font';
import { Container, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { BulletPoint } from './BulletPoint';
import { trainingPlanBulletPoints } from './bulletPoints';
import mockUIImage from './features-mock.webp';
import { barlowCondensed } from './fonts';
import { JoinDojoButton } from './JoinDojoButton';

export const FEATURES_ELEMENT_ID = 'features';

export function Features() {
    const t = useTranslations('landing');

    return (
        <Container
            id={FEATURES_ELEMENT_ID}
            maxWidth='lg'
            sx={{ py: '5.5rem', scrollMarginTop: { xs: 0, md: 'var(--navbar-height)' } }}
        >
            <Grid container spacing='2rem'>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack
                        sx={{
                            alignItems: { xs: 'center', md: 'start' },
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '3rem',
                                lineHeight: '3.375rem',
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                fontWeight: 500,
                                letterSpacing: 0,
                                textAlign: { xs: 'center', md: 'start' },
                            }}
                        >
                            {t('features.heading')}
                        </Typography>

                        <Stack sx={{ my: '2.5rem', gap: '1.25rem' }}>
                            {trainingPlanBulletPoints.map(({ key }) => (
                                <BulletPoint
                                    key={key}
                                    description={t(`trainingPlan.${key}`)}
                                    slotProps={{
                                        description: { sx: { mt: '-0.25rem' } },
                                    }}
                                />
                            ))}
                        </Stack>

                        <JoinDojoButton />
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Image
                        alt=''
                        src={mockUIImage}
                        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                </Grid>
            </Grid>
        </Container>
    );
}
