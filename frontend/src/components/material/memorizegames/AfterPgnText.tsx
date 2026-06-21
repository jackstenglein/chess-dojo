import { useChess } from '@/board/pgn/PgnBoard';
import { InProgressAfterPgnText } from '@/board/pgn/solitaire/SolitaireAfterPgnText';
import { Button, Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

export function AfterPgnText() {
    const { solitaire } = useChess();
    if (solitaire?.complete) {
        return <CompletedAfterPgnText />;
    }
    return <InProgressAfterPgnText />;
}

function CompletedAfterPgnText() {
    const t = useTranslations('material.memorizeGames.afterPgnText');
    const { solitaire } = useChess();
    if (!solitaire) {
        return;
    }

    const white = solitaire.results.white;
    const black = solitaire.results.black;

    const totalMoves = white.total + black.total;
    const totalPercentage =
        totalMoves === 0 ? 0 : Math.round((100 * (white.correct + black.correct)) / totalMoves);

    return (
        <Stack alignItems='center' sx={{ pb: 1 }}>
            <Divider sx={{ width: 1, mb: 2 }} />
            <Typography>{t('greatJob')}</Typography>
            <Typography sx={{ mt: 1 }}>
                {t('totalMovesGuessed', {
                    correct: white.correct + black.correct,
                    total: totalMoves,
                    percent: totalPercentage,
                })}
            </Typography>
            {solitaire.playAs === 'both' && (
                <>
                    <Typography>
                        {t('whiteMovesGuessed', {
                            correct: white.correct,
                            total: white.total,
                            percent:
                                white.total === 0
                                    ? 0
                                    : Math.round((100 * white.correct) / white.total),
                        })}
                    </Typography>
                    <Typography>
                        {t('blackMovesGuessed', {
                            correct: black.correct,
                            total: black.total,
                            percent:
                                black.total === 0
                                    ? 0
                                    : Math.round((100 * black.correct) / black.total),
                        })}
                    </Typography>
                </>
            )}

            <Button sx={{ mt: 1 }} onClick={() => solitaire?.start(null)}>
                {t('restart')}
            </Button>
        </Stack>
    );
}
