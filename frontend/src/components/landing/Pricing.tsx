import { fontFamily } from '@/style/font';
import { ArrowForward, Close } from '@mui/icons-material';
import { Box, Button, Grid, Link, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BackgroundImageContainer } from './BackgroundImage';
import { BulletPoint } from './BulletPoint';
import { freeBulletPoints, membershipBulletPoints } from './bulletPoints';
import { barlow, barlowCondensed } from './fonts';
import { JoinDojoButton } from './JoinDojoButton';
import backgroundImage from './pricing-background.webp';

export function Pricing() {
    const t = useTranslations('landing');

    return (
        <BackgroundImageContainer
            src={backgroundImage}
            background='linear-gradient(270deg, #141422 0%, #06060B 100%)'
            slotProps={{ image: { style: { opacity: 0.2 } } }}
        >
            <Stack gap='1rem' alignItems='center'>
                <Typography
                    sx={{ textTransform: 'uppercase', textAlign: 'center' }}
                    color='dojoOrange'
                    fontWeight='600'
                    fontSize='1.1875rem'
                    lineHeight='1.1875rem'
                    letterSpacing='11%'
                >
                    {t('pricing.cta')}
                </Typography>

                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                        fontSize: '3rem',
                        lineHeight: '3.5rem',
                        textAlign: 'center',
                    }}
                >
                    {t.rich('pricing.heading', {
                        br: () => <br />,
                        bold: (chunks) => <span style={{ fontWeight: '600' }}>{chunks}</span>,
                    })}
                </Typography>
            </Stack>

            <Stack mt='4.0625rem' gap='1.5rem' alignItems='center'>
                <MembershipSection />
                <FreeSection />
            </Stack>
        </BackgroundImageContainer>
    );
}

function MembershipSection() {
    const t = useTranslations('landing');
    const [timeframe, setTimeframe] = useState<'yearly' | 'monthly'>('yearly');

    return (
        <Box
            sx={{
                background: 'linear-gradient(180deg, #1B1B2C 0%, #06060B 100%)',
                padding: { xs: '1rem', md: '3.75rem 3.375rem' },
                borderRadius: 1,
                width: 1,
            }}
        >
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                    borderBottom: '3px solid',
                    paddingBottom: '1.875rem',
                    borderImage: 'linear-gradient(90deg, #F08B32 0%, #F0AA32 100%) 1',
                }}
            >
                <Stack>
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            fontSize: { xs: '2rem', md: '3rem' },
                            fontWeight: '500',
                            lineHeight: { xs: '2.5rem', md: '3.375rem' },
                        }}
                    >
                        {t('pricing.membershipTitle')}
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlow),
                            fontSize: { xs: '0.85rem', md: '1.1875rem' },
                            lineHeight: { xs: '1.3rem', md: '1.9375rem' },
                            color: 'rgba(255, 255, 255, 0.9)',
                        }}
                    >
                        {t('pricing.membershipSubtitle')}
                    </Typography>
                </Stack>

                <Stack>
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlow),
                            fontWeight: '400',
                            fontSize: { xs: '2rem', md: '3rem' },
                            lineHeight: { xs: '2.5rem', md: '3.375rem' },
                            textAlign: 'right',
                            letterSpacing: '0%',
                        }}
                    >
                        {t('pricing.currencySymbol')}
                        <Box
                            component='span'
                            sx={{ fontWeight: '300', fontSize: { xs: '3rem', md: '5.125rem' } }}
                        >
                            {timeframe === 'yearly' ? '120' : '15'}
                        </Box>
                    </Typography>
                    <Typography
                        color='dojoOrange'
                        sx={{
                            textTransform: 'uppercase',
                            fontWeight: '700',
                            fontSize: '0.8125rem',
                            letterSpacing: '8%',
                            lineHeight: '1.375rem',
                            textAlign: 'right',
                        }}
                    >
                        {t(timeframe === 'yearly' ? 'pricing.eachYear' : 'pricing.eachMonth')}
                    </Typography>
                </Stack>
            </Stack>

            <Grid container sx={{ mt: '3.75rem' }} spacing='1.375rem'>
                {membershipBulletPoints.map(({ key }) => (
                    <Grid key={key} size={{ xs: 6, md: 4 }}>
                        <BulletPoint
                            title={t(`membership.${key}`)}
                            icon={<ArrowForward color='dojoOrange' />}
                        />
                    </Grid>
                ))}
            </Grid>

            <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                sx={{ mt: '3.75rem' }}
                flexWrap='wrap'
            >
                <JoinDojoButton />

                <Stack direction='row' gap='0.5rem' display={{ xs: 'none', md: 'flex' }}>
                    <Button
                        variant={timeframe === 'yearly' ? 'contained' : 'outlined'}
                        sx={{
                            fontSize: '0.8125rem',
                            fontWeight: '700',
                            py: '0.875rem',
                            px: '1.75rem',
                            letterSpacing: '8%',
                            lineHeight: 1,
                        }}
                        color='dojoOrange'
                        onClick={() => setTimeframe('yearly')}
                    >
                        {t('pricing.annual')}
                    </Button>

                    <Button
                        variant={timeframe === 'yearly' ? 'outlined' : 'contained'}
                        sx={{
                            fontSize: '0.8125rem',
                            fontWeight: '700',
                            py: '0.25rem',
                            px: '1rem',
                            letterSpacing: '8%',
                            lineHeight: 1,
                        }}
                        color='dojoOrange'
                        onClick={() => setTimeframe('monthly')}
                    >
                        {t('pricing.monthly')}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}

function FreeSection() {
    const t = useTranslations('landing');

    return (
        <Stack
            width={{ xs: 1, md: 0.83 }}
            sx={{
                padding: { xs: '1rem', md: '2rem 3.375rem' },
                background: 'linear-gradient(180deg, #1B1B2C88 0%, #06060B88 100%)',
                borderRadius: 1,
            }}
        >
            <Stack
                sx={{
                    borderBottom: '3px solid',
                    paddingBottom: '1.5rem',
                    borderImage:
                        'linear-gradient(90deg, var(--mui-palette-darkBlue-main) 0%, var(--mui-palette-darkBlue-light) 100%) 1',
                }}
            >
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                        fontSize: '2rem',
                        fontWeight: '500',
                        lineHeight: { xs: '2.5rem', md: '2rem' },
                    }}
                >
                    {t('pricing.freeTitle')}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlow),
                        fontSize: { xs: '0.85rem', md: '1.1875rem' },
                        lineHeight: { xs: '1.3rem', md: '1.9375rem' },
                        color: 'rgba(255, 255, 255, 0.9)',
                    }}
                >
                    {t('pricing.freeSubtitle')}
                </Typography>
            </Stack>

            <Grid container sx={{ mt: '1.875rem' }} spacing='1.375rem'>
                {freeBulletPoints.map((bp) => (
                    <Grid key={bp.key} size={{ xs: 6, md: 4 }}>
                        <BulletPoint
                            title={bp.excluded ? t(`membership.${bp.key}`) : t(`free.${bp.key}`)}
                            icon={
                                bp.excluded ? (
                                    <Close sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                                ) : undefined
                            }
                            slotProps={{
                                root: {
                                    gap: '0.5rem',
                                },
                                title: {
                                    sx: {
                                        textTransform: 'uppercase',
                                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                        fontWeight: '600',
                                        fontSize: '1.1875rem',
                                        letterSpacing: '3%',
                                        lineHeight: 1,
                                        color: bp.excluded ? 'rgba(255, 255, 255, 0.5)' : undefined,
                                    },
                                },
                            }}
                        />
                    </Grid>
                ))}
            </Grid>

            <Button
                variant='outlined'
                component={Link}
                href='/signup'
                sx={{
                    mt: '1.875rem',
                    fontSize: '0.94rem',
                    fontWeight: '600',
                    border: 0,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    borderBottom: '3px solid var(--mui-palette-darkBlue-main)',
                    color: 'white',
                    px: 1,
                    alignSelf: 'start',
                    '&:hover': {
                        borderColor: 'var(--mui-palette-darkBlue-dark)',
                    },
                }}
                color='darkBlue'
            >
                {t('pricing.signUpFree')}
            </Button>
        </Stack>
    );
}
