import { ExamCard } from '@/components/exams/ExamCard';
import { KingIcon, QueenIcon, RookIcon } from '@/style/ChessIcons';
import { EmojiEvents, Visibility } from '@mui/icons-material';
import { Container, Grid } from '@mui/material';
import { useTranslations } from 'next-intl';

/**
 * Renders a simple landing page that directs users to the different types of exams
 * (tactics, polgar, endgame, etc).
 */
export default function ExamLandingPage() {
    const t = useTranslations('exams.landing');
    return (
        <Container maxWidth='lg' sx={{ py: 5 }}>
            <Grid container rowSpacing={2} columnSpacing={2}>
                <ExamCard
                    name={t('tacticsTests')}
                    description={t('allRatings')}
                    href='/tests/tactics'
                    icon={QueenIcon}
                />

                <ExamCard
                    name={t('checkmatePuzzles')}
                    description={t('allRatings')}
                    href='/puzzles/checkmate'
                    icon={KingIcon}
                />

                <ExamCard
                    name={t('endgameTests')}
                    description={t('allRatings')}
                    href='/tests/endgame'
                    icon={RookIcon}
                />

                <ExamCard
                    name={t('squareColorDrill')}
                    description={t('allRatings')}
                    href='/puzzles/square-colors'
                    icon={Visibility}
                />

                <ExamCard
                    name='Mate in One Visualization Drill'
                    description='All Ratings'
                    href='/puzzles/mate-in-one'
                    icon={EmojiEvents}
                />
            </Grid>
        </Container>
    );
}
