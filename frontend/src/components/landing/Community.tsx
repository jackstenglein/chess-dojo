import { PresenterIcon } from '@/style/PresenterIcon';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import { fontFamily } from '@/style/font';
import { EmojiEvents, Groups, Hub, LiveTv, MenuBook, Speed } from '@mui/icons-material';
import { Box, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { type JSX } from 'react';
import { BulletPoint } from './BulletPoint';
import { communityBulletPoints } from './bulletPoints';
import { barlow, barlowCondensed, sectionTitleSx } from './fonts';
import communityImage from './hero.webp';

const itemIcons: Record<string, JSX.Element> = {
    classicalTournaments: <EmojiEvents color='darkBlue' />,
    chessCommunity: <Groups color='darkBlue' />,
    testsAndTactics: <Speed color='darkBlue' />,
    studyGroups: <MenuBook color='darkBlue' />,
    workshops: <PresenterIcon color='darkBlue' />,
    graduationStreams: <LiveTv color='darkBlue' />,
    privateDiscord: <DiscordIcon color='darkBlue' />,
    clubs: <Hub color='darkBlue' />,
};

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
                                ...sectionTitleSx,
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
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

                        <Box
                            sx={{
                                borderRadius: 2,
                                overflow: 'hidden',
                                width: 1,
                                display: { xs: 'none', md: 'block' },
                            }}
                        >
                            <Image
                                alt={t('communitySection.imageAlt')}
                                src={communityImage}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        </Box>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack sx={{ gap: '2.5rem' }}>
                        {communityBulletPoints.map((bp) => (
                            <BulletPoint
                                key={bp.key}
                                icon={itemIcons[bp.key]}
                                title={t(`community.${bp.key}.title`)}
                                description={t(`community.${bp.key}.description`)}
                            />
                        ))}
                    </Stack>
                </Grid>
            </Grid>
        </Container>
    );
}
