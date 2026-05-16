import { ExamList } from '@/components/exams/ExamList';
import { KingIcon } from '@/style/ChessIcons';
import { ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import { Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const POLGAR_RANGES = ['0-500', '500-1000', '1000-1500', '1500+'];

/**
 * Renders the Material > Tests > Checkmate Tests page.
 */
export default function ListCheckmateExamsPage() {
    const t = useTranslations('exams.checkmate');
    return (
        <Container sx={{ py: 5 }}>
            <Stack spacing={4}>
                <Typography variant='h4'>
                    <KingIcon fontSize='inherit' sx={{ mr: 2, verticalAlign: 'center' }} />
                    {t('heading')}
                </Typography>
                <ExamList cohortRanges={POLGAR_RANGES} examType={ExamType.Polgar} />
            </Stack>
        </Container>
    );
}
