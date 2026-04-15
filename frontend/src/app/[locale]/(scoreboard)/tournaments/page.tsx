import { ExamCard } from '@/components/exams/ExamCard';
import { CrossedSwordIcon } from '@/style/CrossedSwordIcon';
import { TournamentBracketIcon } from '@/style/TournamentIcon';
import { MilitaryTech } from '@mui/icons-material';
import { Container, Grid, Typography } from '@mui/material';
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'ChessDojo Tournaments',
    description: `Win a free ChessDojo membership by participating in the ChessDojo Champions' Circuit!`,
};

/**
 * Renders a basic landing page for tournaments that redirects to the more specific
 * tournament pages.
 */
export default function Page() {
    const t = useTranslations('tournaments.landing');

    return (
        <Container
            maxWidth='lg'
            sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
            <Typography variant='h4' textAlign='center' sx={{ mb: 2 }}>
                {t('heading')}
            </Typography>

            <Grid container rowSpacing={2} columnSpacing={2}>
                <ExamCard
                    name={t('roundRobinName')}
                    description={t('roundRobinDescription')}
                    href='/tournaments/round-robin'
                    icon={CrossedSwordIcon}
                />

                <ExamCard
                    name={t('openClassicalName')}
                    description={t('openClassicalDescription')}
                    href='/tournaments/open-classical'
                    icon={TournamentBracketIcon}
                />

                <ExamCard
                    name={t('dojoligaName')}
                    description={t('dojoligaDescription')}
                    href='/tournaments/liga'
                    icon={MilitaryTech}
                />
            </Grid>

            <Typography variant='h5' textAlign='center' sx={{ mt: 10, mb: 2 }}>
                {t('championsCircuit')}
            </Typography>

            <Typography textAlign='center' maxWidth='md'>
                {t('championsDescription')}
            </Typography>
        </Container>
    );
}
