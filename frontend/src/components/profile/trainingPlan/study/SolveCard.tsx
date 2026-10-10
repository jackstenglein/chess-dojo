import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { SolveStatus } from './SolveBoard';

export interface SolveCardProps {
    status: SolveStatus;
    onShowSolution: () => void;
}

/** The feedback beside the solve board: what to do, how the last move went, and when the line is solved. */
export function SolveCard({ status, onShowSolution }: SolveCardProps) {
    const t = useTranslations('study.solve');

    const sideToMove = (toMove: 'white' | 'black') => (
        <Typography variant='subtitle2'>
            {toMove === 'white' ? t('whiteToMove') : t('blackToMove')}
        </Typography>
    );
    const showSolution = (
        <Button
            size='small'
            onClick={onShowSolution}
            data-testid='study-show-solution'
            sx={{ alignSelf: 'flex-start' }}
        >
            {t('showSolution')}
        </Button>
    );

    return (
        <Stack
            data-testid='study-solve-card'
            data-status={status.kind}
            sx={{ px: 1.5, py: 1, gap: 1, flexGrow: 1 }}
        >
            {status.kind === 'prompt' && (
                <>
                    {sideToMove(status.toMove)}
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {t('prompt')}
                    </Typography>
                    {showSolution}
                </>
            )}
            {status.kind === 'wrong' && (
                <>
                    {sideToMove(status.toMove)}
                    <Typography variant='body2'>{status.feedback ?? t('wrong')}</Typography>
                    {showSolution}
                </>
            )}
            {status.kind === 'correct' && (
                <Typography variant='subtitle2'>{t('correct')}</Typography>
            )}
            {status.kind === 'complete' && (
                <Typography variant='subtitle2'>{t('solved')}</Typography>
            )}
        </Stack>
    );
}
