import { EventType } from '@jackstenglein/chess';
import { Button, Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useChess } from '../PgnBoard';

export function SolitaireAfterPgnText() {
    const { solitaire } = useChess();
    if (solitaire?.complete) {
        return <CompletedAfterPgnText />;
    }
    return <InProgressAfterPgnText />;
}

function CompletedAfterPgnText() {
    const { solitaire } = useChess();
    const t = useTranslations('analysisBoard.chrome');
    if (!solitaire) {
        return;
    }

    const white = solitaire.results.white;
    const black = solitaire.results.black;

    const totalMoves = white.total + black.total;
    const totalPercentage =
        totalMoves === 0 ? 0 : Math.round((100 * (white.correct + black.correct)) / totalMoves);
    const whitePercentage = white.total === 0 ? 0 : Math.round((100 * white.correct) / white.total);
    const blackPercentage = black.total === 0 ? 0 : Math.round((100 * black.correct) / black.total);

    return (
        <Stack
            sx={{
                alignItems: 'center',
                pb: 1,
                textAlign: 'center',
            }}
        >
            <Divider sx={{ width: 1, mb: 2 }} />
            <Typography>{t('solitaireCompletionMessage')}</Typography>
            <Typography sx={{ mt: 1 }}>
                {t('solitaireGuessedSummary', {
                    correct: white.correct + black.correct,
                    total: totalMoves,
                    percentage: totalPercentage,
                })}
            </Typography>
            {solitaire.playAs === 'both' && (
                <>
                    <Typography>
                        {t('solitaireWhiteGuessedSummary', {
                            correct: white.correct,
                            total: white.total,
                            percentage: whitePercentage,
                        })}
                    </Typography>
                    <Typography>
                        {t('solitaireBlackGuessedSummary', {
                            correct: black.correct,
                            total: black.total,
                            percentage: blackPercentage,
                        })}
                    </Typography>
                </>
            )}

            <Stack direction='row' sx={{ mt: 1 }}>
                <Button onClick={() => solitaire?.start(null)}>
                    {t('solitaireRestartButton')}
                </Button>
                <Button onClick={solitaire?.stop}>{t('solitaireExitButton')}</Button>
            </Stack>
        </Stack>
    );
}

export function InProgressAfterPgnText() {
    const { chess, board, solitaire } = useChess();
    const [, setForceRender] = useState(0);
    const t = useTranslations('analysisBoard.chrome');

    useEffect(() => {
        const observer = {
            types: [EventType.LegalMove],
            handler: () => setForceRender((v) => v + 1),
        };
        chess?.addObserver(observer);
        return () => chess?.removeObserver(observer);
    }, [chess, setForceRender]);

    const onHint = (type: 'hint' | 'answer') => {
        const move = chess?.nextMove(solitaire?.currentMove);
        if (!move) {
            return;
        }

        board?.set({
            drawable: {
                shapes:
                    type === 'hint'
                        ? [{ orig: move.from, brush: 'red' }]
                        : [{ orig: move.from, dest: move.to, brush: 'red' }],
                eraseOnMovablePieceClick: false,
            },
        });
    };

    return (
        <Stack>
            <Divider sx={{ width: 1 }} />
            <Stack direction='row' sx={{ my: 1, px: 1 }}>
                <Button disabled={solitaire?.complete} onClick={() => onHint('hint')}>
                    {t('solitaireHintButton')}
                </Button>
                <Button disabled={solitaire?.complete} onClick={() => onHint('answer')}>
                    {t('solitaireAnswerButton')}
                </Button>
            </Stack>
        </Stack>
    );
}
