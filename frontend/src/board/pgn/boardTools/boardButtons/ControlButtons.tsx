import { Move } from '@jackstenglein/chess';
import {
    ChevronLeft,
    ChevronRight,
    FirstPage,
    WifiProtectedSetup as Flip,
    LastPage,
} from '@mui/icons-material';
import { IconButton, IconButtonProps, Stack, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';
import { useReconcile } from '../../../Board';
import { useChess } from '../../PgnBoard';
import { solitaireBlocksAction } from '../../solitaire/solitaireFrontier';
import { ShortcutAction } from '../underboard/settings/ShortcutAction';
import {
    GoToEndButtonBehavior,
    GoToEndButtonBehaviorKey,
} from '../underboard/settings/ViewerSettings';

const ControlButtons = () => {
    const t = useTranslations('analysisBoard.boardButtons');
    const [goToEndBehavior] = useLocalStorage(
        GoToEndButtonBehaviorKey,
        GoToEndButtonBehavior.SingleClick,
    );
    const { chess, solitaire } = useChess();
    const reconcile = useReconcile();

    const onClickMove = (move: Move | null) => {
        chess?.seek(move);
        reconcile();
    };

    const onFirstMove = () => {
        onClickMove(null);
    };

    const onPreviousMove = () => {
        if (chess) {
            onClickMove(chess.previousMove());
        }
    };

    const onNextMove = () => {
        if (!chess || solitaireBlocksAction(ShortcutAction.NextMove, chess, solitaire)) {
            return;
        }

        const nextMove = chess.nextMove();
        if (nextMove) {
            onClickMove(nextMove);
        }
    };

    const onLastMove = () => {
        if (!chess || solitaireBlocksAction(ShortcutAction.LastMove, chess, solitaire)) {
            return;
        }
        onClickMove(chess.lastMove());
    };

    return (
        <Stack
            direction='row'
            sx={{
                gap: { xs: 1.5, sm: 0 },
                flexWrap: 'wrap',
            }}
        >
            {goToEndBehavior !== GoToEndButtonBehavior.Hidden && (
                <Tooltip title={t('firstMove')}>
                    <IconButton
                        aria-label={t('firstMoveAria')}
                        onClick={
                            goToEndBehavior === GoToEndButtonBehavior.SingleClick
                                ? onFirstMove
                                : undefined
                        }
                        onDoubleClick={
                            goToEndBehavior === GoToEndButtonBehavior.DoubleClick
                                ? onFirstMove
                                : undefined
                        }
                    >
                        <FirstPage sx={{ color: 'text.secondary' }} />
                    </IconButton>
                </Tooltip>
            )}

            <Tooltip title={t('previousMove')}>
                <IconButton aria-label={t('previousMoveAria')} onClick={onPreviousMove}>
                    <ChevronLeft sx={{ color: 'text.secondary' }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={t('nextMove')}>
                <IconButton aria-label={t('nextMoveAria')} onClick={onNextMove}>
                    <ChevronRight sx={{ color: 'text.secondary' }} />
                </IconButton>
            </Tooltip>

            {goToEndBehavior !== GoToEndButtonBehavior.Hidden && (
                <Tooltip title={t('lastMove')}>
                    <IconButton
                        aria-label={t('lastMoveAria')}
                        onClick={
                            goToEndBehavior === GoToEndButtonBehavior.SingleClick
                                ? onLastMove
                                : undefined
                        }
                        onDoubleClick={
                            goToEndBehavior === GoToEndButtonBehavior.DoubleClick
                                ? onLastMove
                                : undefined
                        }
                    >
                        <LastPage sx={{ color: 'text.secondary' }} />
                    </IconButton>
                </Tooltip>
            )}

            <FlipBoardButton />
        </Stack>
    );
};

export default ControlButtons;

export function FlipBoardButton(props: IconButtonProps) {
    const t = useTranslations('analysisBoard.boardButtons');
    const { toggleOrientation } = useChess();
    if (!toggleOrientation) {
        return null;
    }

    return (
        <Tooltip title={t('flipBoard')}>
            <IconButton {...props} aria-label={t('flipBoardAria')} onClick={toggleOrientation}>
                <Flip sx={{ color: 'text.secondary' }} />
            </IconButton>
        </Tooltip>
    );
}
