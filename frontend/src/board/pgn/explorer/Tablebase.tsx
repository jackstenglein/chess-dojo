import {
    LichessTablebaseCategory,
    LichessTablebaseMove,
    LichessTablebasePosition,
    isInTablebase,
} from '@jackstenglein/chess-dojo-common/src/explorer/types';
import { Button, Chip, Stack, Tooltip, Typography, styled } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Request } from '../../../api/Request';
import LoadingPage from '../../../loading/LoadingPage';
import { useReconcile } from '../../Board';
import { useChess } from '../PgnBoard';
import { getBackgroundColor } from './Database';

import type { JSX } from 'react';

const TablebaseHeader = styled(Stack)(({ theme }) => ({
    backgroundColor: getBackgroundColor(theme.palette.info.main, theme.palette.mode),
}));

interface TablebaseProps {
    fen: string;
    position: LichessTablebasePosition | null | undefined;
    request: Request;
}

export function Tablebase({ fen, position, request }: TablebaseProps) {
    const { chess } = useChess();
    const reconcile = useReconcile();
    const t = useTranslations('analysisBoard.explorer');

    if (!isInTablebase(fen)) {
        return (
            <Stack
                data-testid='explorer-tab-tablebase'
                sx={{
                    width: 1,
                    alignItems: 'center',
                    mt: 2,
                }}
            >
                <Typography>{t('tablebaseAvailabilityMessage')}</Typography>
            </Stack>
        );
    }

    if (!position && (!request.isSent() || request.isLoading())) {
        return <LoadingPage />;
    }

    if (!position) {
        return (
            <Stack
                data-testid='explorer-tab-tablebase'
                sx={{
                    width: 1,
                    alignItems: 'center',
                    mt: 2,
                }}
            >
                <Typography>{t('noTablebaseFound')}</Typography>
            </Stack>
        );
    }

    const onClickMove = (move: LichessTablebaseMove) => () => {
        chess?.move(move.san);
        reconcile();
    };

    const items: JSX.Element[] = [];

    let currentStatus = '';
    let index = 0;

    for (const move of position.moves) {
        const status = getStatus(fen, move);
        if (currentStatus !== status) {
            currentStatus = status;
            index = 0;

            items.push(
                <TablebaseHeader key={status} direction='row' sx={{ pl: 1, py: 0.5 }}>
                    <Typography>{status}</Typography>
                </TablebaseHeader>,
            );
        }

        items.push(
            <Button
                key={move.san}
                sx={{
                    width: 1,
                    bgcolor: index % 2 ? '#302e2c' : undefined,
                    pl: 1,
                    py: 1,
                    textTransform: 'none',
                    color: 'text.primary',
                    borderRadius: 0,
                }}
                onClick={onClickMove(move)}
            >
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: 1,
                    }}
                >
                    {move.san}

                    <Stack direction='row' spacing={0.5}>
                        {move.dtz !== null && move.dtz !== 0 && (
                            <Tooltip title={t('dtzTooltip')}>
                                <Chip label={`DTZ ${Math.ceil(Math.abs(move.dtz) / 2)}`} />
                            </Tooltip>
                        )}
                        {move.dtm !== null && move.dtm !== 0 && (
                            <Tooltip
                                title={t('mateInTooltip', {
                                    moves: Math.ceil(Math.abs(move.dtm) / 2),
                                })}
                            >
                                <Chip label={`M${Math.ceil(Math.abs(move.dtm) / 2)}`} />
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Button>,
        );
        index++;
    }

    return (
        <Stack
            data-testid='explorer-tab-tablebase'
            sx={{
                mt: 2,
                borderRadius: '4px',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            {items}
        </Stack>
    );
}

function getStatus(fen: string, move: LichessTablebaseMove): '1–0' | '1/2–1/2' | '0–1' {
    const turn = fen.split(' ')[1];

    if (turn === 'w') {
        switch (move.category) {
            case LichessTablebaseCategory.Win:
            case LichessTablebaseCategory.MaybeWin:
                return '0–1';

            case LichessTablebaseCategory.CursedWin:
            case LichessTablebaseCategory.Draw:
            case LichessTablebaseCategory.BlessedLoss:
            case LichessTablebaseCategory.Unknown:
                return '1/2–1/2';

            case LichessTablebaseCategory.MaybeLoss:
            case LichessTablebaseCategory.Loss:
                return '1–0';
        }
    }

    switch (move.category) {
        case LichessTablebaseCategory.Win:
        case LichessTablebaseCategory.MaybeWin:
            return '1–0';

        case LichessTablebaseCategory.CursedWin:
        case LichessTablebaseCategory.Draw:
        case LichessTablebaseCategory.BlessedLoss:
        case LichessTablebaseCategory.Unknown:
            return '1/2–1/2';

        case LichessTablebaseCategory.MaybeLoss:
        case LichessTablebaseCategory.Loss:
            return '0–1';
    }
}
