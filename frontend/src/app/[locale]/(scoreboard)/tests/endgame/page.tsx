import { ExamList } from '@/components/exams/ExamList';
import { RookIcon } from '@/style/ChessIcons';
import { ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import { Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const COHORT_RANGES = ['0-1000', '1000-1500', '1500-2000', '2000+'];

/**
 * Renders the Material > Tests > Endgame Tests page.
 */
export default function ListEndgameExamsPage() {
    const t = useTranslations('exams.endgame');
    return (
        <Container sx={{ py: 5 }}>
            <Stack spacing={4}>
                <Typography variant='h4'>
                    <RookIcon fontSize='inherit' sx={{ mr: 2, verticalAlign: 'center' }} />
                    {t('heading')}
                </Typography>
                <ExamList cohortRanges={COHORT_RANGES} examType={ExamType.Endgame} />
            </Stack>
        </Container>
    );
}
