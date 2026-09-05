import PricingPage from '@/app/[locale]/(scoreboard)/prices/PricingPage';
import { fontFamily } from '@/style/font';
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { BackgroundImageContainer } from './BackgroundImage';
import { barlow, barlowCondensed, eyebrowSx, sectionTitleSx } from './fonts';
import backgroundImage from './pricing-background.webp';

export const PRICING_ELEMENT_ID = 'pricing';

const faqKeys = ['startFree', 'longGames', 'cohorts', 'cancel'] as const;

export function Pricing() {
    const t = useTranslations('landing');

    return (
        <BackgroundImageContainer
            id={PRICING_ELEMENT_ID}
            src={backgroundImage}
            background='linear-gradient(270deg, #141422 0%, #06060B 100%)'
            slotProps={{
                image: { style: { opacity: 0.12 } },
                container: { maxWidth: 'xl' },
            }}
        >
            <Stack
                sx={{
                    gap: '1rem',
                    alignItems: 'center',
                }}
            >
                <Typography
                    color='dojoOrange'
                    sx={{
                        ...eyebrowSx,
                        textAlign: 'center',
                    }}
                >
                    {t('pricing.cta')}
                </Typography>

                <Typography
                    sx={{
                        ...sectionTitleSx,
                        fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                        textAlign: 'center',
                    }}
                >
                    {t.rich('pricing.heading', {
                        br: () => <br />,
                        bold: (chunks) => <span style={{ fontWeight: '600' }}>{chunks}</span>,
                    })}
                </Typography>
            </Stack>

            <Stack sx={{ mt: '3rem' }}>
                <PricingPage embedded />
            </Stack>

            <Stack sx={{ mt: { xs: '3rem', md: '4rem' }, maxWidth: '48rem', mx: 'auto' }}>
                <Typography
                    sx={{
                        ...eyebrowSx,
                        textAlign: 'center',
                        mb: 2,
                    }}
                >
                    {t('faq.title')}
                </Typography>
                {faqKeys.map((key) => (
                    <Accordion
                        key={key}
                        disableGutters
                        elevation={0}
                        sx={{
                            bgcolor: 'transparent',
                            color: 'inherit',
                            '&:before': { display: 'none' },
                            borderBottom: '1px solid rgba(255, 255, 255, 0.16)',
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ color: 'dojoOrange.main' }} />}
                            sx={{ px: 0 }}
                        >
                            <Typography
                                sx={{
                                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                    fontWeight: 600,
                                    fontSize: '1.25rem',
                                }}
                            >
                                {t(`faq.${key}.title`)}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pb: 2 }}>
                            <Typography
                                sx={{
                                    fontFamily: (theme) => fontFamily(theme, barlow),
                                    fontSize: '1.0625rem',
                                    lineHeight: 1.6,
                                    color: 'rgba(255, 255, 255, 0.8)',
                                }}
                            >
                                {t(`faq.${key}.content`)}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </BackgroundImageContainer>
    );
}
