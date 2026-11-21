import { Chess, EventType, Move } from '@jackstenglein/chess';
import { Backspace } from '@mui/icons-material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Button, Stack, SvgIcon, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useChess } from '../../PgnBoard';
import { DeletePrompt, useDeletePrompt } from './DeletePrompt';

type EditorT = ReturnType<typeof useTranslations<'analysisBoard.underboard'>>;

export default function MoveControls() {
    const { chess, config } = useChess();
    const t = useTranslations('analysisBoard.underboard');
    const [, setForceRender] = useState(0);
    const { onDelete, deleteAction, onClose: onCloseDelete } = useDeletePrompt(chess);
    useEffect(() => {
        if (!chess) return;
        const observer = {
            types: [
                EventType.LegalMove,
                EventType.NewVariation,
                EventType.UpdateNags,
                EventType.PromoteVariation,
            ],
            handler: () => setForceRender((value) => value + 1),
        };
        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [chess]);
    if (!chess) return null;
    const move = chess.currentMove();
    const isMainline = chess.isInMainline(move);
    const takebacksDisabled =
        config?.disableTakebacks === 'both' ||
        (Boolean(move) && config?.disableTakebacks?.[0] === move?.color);
    let variationRoot = move;
    while (variationRoot?.previous && !chess.isInMainline(variationRoot.previous)) {
        variationRoot = variationRoot.previous;
    }
    return (
        <>
            <Stack
                direction='row'
                sx={{
                    width: 1,
                    gap: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiButton-root': {
                        minWidth: 0,
                        width: '100%',
                        height: 24,
                        borderRadius: 0,
                        p: 0,
                        fontSize: '0.75rem',
                    },
                    '& > span': { flex: 1, minWidth: 0, display: 'flex' },
                    '& .MuiSvgIcon-root': { fontSize: 18 },
                }}
            >
                <Tooltip title={t('moveVariationUp')}>
                    <span>
                        <Button
                            aria-label={t('moveVariationUp')}
                            disabled={!chess.canPromoteVariation(move, true) || takebacksDisabled}
                            onClick={() =>
                                chess.promoteVariation(move, !chess.canPromoteVariation(move))
                            }
                            color='primary'
                            variant='outlined'
                        >
                            <ArrowUpwardIcon />
                        </Button>
                    </span>
                </Tooltip>

                <Tooltip title='Delete variation'>
                    <span>
                        <Button
                            aria-label='Delete variation'
                            onClick={() => onDelete(variationRoot, 'after')}
                            disabled={
                                !config?.allowMoveDeletion ||
                                takebacksDisabled ||
                                !move ||
                                isMainline
                            }
                            color='error'
                            variant='outlined'
                        >
                            <Backspace sx={{ transform: 'rotateY(180deg)' }} />
                        </Button>
                    </span>
                </Tooltip>
                <Tooltip title='Delete remaining moves'>
                    <span>
                        <Button
                            aria-label='Delete remaining moves'
                            onClick={() => onDelete(chess.nextMove(), 'after')}
                            disabled={
                                !config?.allowMoveDeletion || takebacksDisabled || !chess.nextMove()
                            }
                            color='inherit'
                            variant='outlined'
                            sx={{
                                color: 'text.secondary',
                                borderColor: 'divider',
                                '&:hover': {
                                    borderColor: 'divider',
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        >
                            <SvgIcon sx={{ fontSize: 18 }} viewBox='0 0 24 24'>
                                <path
                                    d='M9 3h6v18H9'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='2'
                                    strokeLinecap='square'
                                />
                            </SvgIcon>
                        </Button>
                    </span>
                </Tooltip>
            </Stack>

            {deleteAction && <DeletePrompt deleteAction={deleteAction} onClose={onCloseDelete} />}
        </>
    );
}

export function getNullMoveStatus(
    chess: Chess,
    t: EditorT,
    move: Move | null = chess.currentMove(),
): { disabled: boolean; tooltip: string } {
    if (chess.isCheck(move)) {
        return {
            disabled: true,
            tooltip: t('nullMoveCheckWarning'),
        };
    }
    if (chess.isGameOver(move)) {
        return {
            disabled: true,
            tooltip: t('nullMoveGameOverWarning'),
        };
    }
    if (move?.san === 'Z0') {
        return {
            disabled: true,
            tooltip: t('nullMoveMultipleWarning'),
        };
    }
    return {
        disabled: false,
        tooltip: t('nullMoveDefault'),
    };
}
