import { LiveClassesList } from '@/app/[locale]/(scoreboard)/learn/live-classes/LiveClassesList';
import { Link } from '@/components/navigation/Link';
import { fontFamily } from '@/style/font';
import { ChevronRight } from '@mui/icons-material';
import { Button, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { barlow, barlowCondensed, eyebrowSx, sectionTitleSx } from './fonts';
import { landingLiveClasses } from './sampleLiveClasses';

export const LIVE_CLASSES_ELEMENT_ID = 'live-classes';

export function LiveClasses() {
    const t = useTranslations('landing');

    return (
        <Container
            id={LIVE_CLASSES_ELEMENT_ID}
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
                    color='dojoOrange'
                    sx={{
                        ...eyebrowSx,
                        textAlign: 'center',
                    }}
                >
                    {t('liveClasses.eyebrow')}
                </Typography>
                <Typography
                    sx={{
                        ...sectionTitleSx,
                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                        textAlign: 'center',
                    }}
                >
                    {t('liveClasses.heading')}
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
                    {t('liveClasses.subheading')}
                </Typography>
            </Stack>

            <LiveClassesList
                classes={landingLiveClasses}
                onTagClick={() => null}
                selectedTags={[]}
                variant='scroll'
                cardCta='Watch Sample'
            />

            <Stack sx={{ alignItems: 'center', mt: 3 }}>
                <Button
                    variant='outlined'
                    component={Link}
                    href='/live-classes'
                    endIcon={<ChevronRight />}
                    color='dojoOrange'
                    sx={{
                        fontSize: '0.94rem',
                        fontWeight: 600,
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        px: 2,
                        py: '0.7rem',
                        '&:hover': {
                            borderColor: 'var(--mui-palette-dojoOrange-main)',
                            backgroundColor: 'transparent',
                        },
                    }}
                >
                    {t('liveClasses.viewAll')}
                </Button>
            </Stack>
        </Container>
    );
}
