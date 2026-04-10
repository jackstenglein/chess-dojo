import { Link } from '@/components/navigation/Link';
import Icon, { IconName } from '@/style/Icon';
import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Container,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

export default function InfoPage() {
    const t = useTranslations('tournaments.openClassical.info');

    return (
        <Container sx={{ py: 5 }}>
            <Stack spacing={4}>
                <Stack>
                    <Typography variant='h4' align='center' gutterBottom>
                        {t('title')}
                    </Typography>

                    <Typography variant='h6' align='center' color='text.secondary'>
                        {t('subtitle')}
                    </Typography>
                </Stack>

                <Stack spacing={3}>
                    <InfoEntryAccordion icon='info' title={t('overviewTitle')}>
                        <Typography>{t('overviewBody')}</Typography>
                    </InfoEntryAccordion>

                    <InfoEntryAccordion icon='player' title={t('directorTitle')}>
                        <Typography>{t('directorBody')}</Typography>
                    </InfoEntryAccordion>

                    <InfoEntryAccordion icon='eventCheck' title={t('registeringTitle')}>
                        <Typography>
                            {t.rich('registeringBody', {
                                tournamentLink: (chunks) => (
                                    <Link href='/tournaments/open-classical'>{chunks}</Link>
                                ),
                            })}
                        </Typography>
                    </InfoEntryAccordion>

                    <InfoEntryAccordion icon='cohort' title={t('pairingsTitle')}>
                        <Typography>
                            {t.rich('pairingsBody', {
                                tournamentLink: (chunks) => (
                                    <Link href='/tournaments/open-classical'>{chunks}</Link>
                                ),
                            })}
                        </Typography>
                    </InfoEntryAccordion>

                    <InfoEntryAccordion
                        icon='Rook Endgame Progression'
                        title={t('playingGamesTitle')}
                    >
                        <Typography>{t('playingGamesIntro')}</Typography>
                        <ul>
                            <li>{t('playingGamesOpen')}</li>
                            <li>{t('playingGamesU1900')}</li>
                        </ul>
                        <Typography>{t('playingGamesBody1')}</Typography>
                        <Typography mt={2}>{t('playingGamesBody2')}</Typography>
                    </InfoEntryAccordion>

                    <InfoEntryAccordion icon='submit' title={t('submittingTitle')}>
                        <Typography>
                            {t.rich('submittingBody', {
                                submitLink: (chunks) => (
                                    <Link href='/tournaments/open-classical/submit-results'>
                                        {chunks}
                                    </Link>
                                ),
                                strong: (chunks) => <strong>{chunks}</strong>,
                            })}
                        </Typography>
                    </InfoEntryAccordion>

                    <InfoEntryAccordion icon='warning' title={t('disputesTitle')}>
                        {t('disputesIntro')}
                        <ol>
                            <li>{t('disputesItem1')}</li>
                            <li>{t('disputesItem2')}</li>
                            <li>{t('disputesItem3')}</li>
                        </ol>
                        {t('disputesThen')}
                        <ul>
                            <li>{t('disputesAction1')}</li>
                            <li>{t('disputesAction2')}</li>
                            <li>{t('disputesAction3')}</li>
                        </ul>
                        {t('disputesFootnote')}
                    </InfoEntryAccordion>

                    <InfoEntryAccordion icon='liga' title={t('winnersTitle')}>
                        <Typography>
                            {t.rich('winnersBody', {
                                tournamentLink: (chunks) => (
                                    <Link href='/tournaments/open-classical'>{chunks}</Link>
                                ),
                            })}
                        </Typography>
                    </InfoEntryAccordion>
                </Stack>
            </Stack>
        </Container>
    );
}

const InfoEntryAccordion = ({
    icon,
    title,
    children,
}: {
    icon: IconName;
    title: string;
    children: React.ReactNode;
}) => {
    return (
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant='h6' color='text.secondary'>
                    <Icon
                        name={icon}
                        sx={{ mr: 1, mt: -0.5, verticalAlign: 'middle' }}
                        color='dojoOrange'
                    />
                    {title}
                </Typography>
            </AccordionSummary>
            <AccordionDetails>{children}</AccordionDetails>
        </Accordion>
    );
};
