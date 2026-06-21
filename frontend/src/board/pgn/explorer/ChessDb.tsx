import { ChessDbMove } from '@/api/cache/chessdb';
import LoadingPage from '@/loading/LoadingPage';
import { Help } from '@mui/icons-material';
import { Box, Button, Grid, Stack, Tooltip, Typography } from '@mui/material';
import {
    DataGridPro,
    GridColDef,
    GridRenderCellParams,
    GridRowModel,
    GridRowParams,
} from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useReconcile } from '../../Board';
import { useChess } from '../PgnBoard';

interface ChessDBTabProps {
    moves: ChessDbMove[];
    loading: boolean;
    error: string | null;
    requestAnalysis: (fen: string) => void;
}

export function ChessDBTab({ moves, loading, error, requestAnalysis }: ChessDBTabProps) {
    const { chess } = useChess();
    const reconcile = useReconcile();
    const t = useTranslations('analysisBoard.explorer');

    const columns: GridColDef<ChessDbMove>[] = useMemo(
        () => [
            {
                field: 'san',
                headerName: t('chessDbColumnMove'),
                align: 'left',
                headerAlign: 'left',
                minWidth: 55,
                width: 55,
            },
            {
                field: 'score',
                headerName: t('chessDbColumnEval'),
                align: 'left',
                headerAlign: 'left',
                width: 75,
                valueFormatter: (value: number) => (value >= 0 ? `+${value}` : value),
            },
            {
                field: 'winrate',
                headerName: t('chessDbColumnWinrate'),
                align: 'left',
                headerAlign: 'left',
                width: 80,
                renderCell: (params: GridRenderCellParams<ChessDbMove, string>) =>
                    params.value ? `${params.value}%` : '—',
            },
            {
                field: 'note',
                headerName: t('chessDbColumnNote'),
                align: 'left',
                headerAlign: 'left',
                flex: 1,
                renderCell: (params: GridRenderCellParams<ChessDbMove, string>) => params.value,
            },
        ],
        [t],
    );

    if (loading) return <LoadingPage />;

    if (error) {
        return (
            <Stack mt={2} spacing={1} alignItems='center'>
                <Typography color='error'>{error}</Typography>
                <Button
                    onClick={() => requestAnalysis(chess?.fen() ?? '')}
                    variant='outlined'
                    size='small'
                >
                    {t('queueAnalysisButton')}
                </Button>
            </Stack>
        );
    }

    if (moves.length === 0) {
        return (
            <Stack mt={2} spacing={1} alignItems='center'>
                <Typography>{t('positionNotInChessDb')}</Typography>
                <Button
                    onClick={() => requestAnalysis(chess?.fen() ?? '')}
                    variant='outlined'
                    size='small'
                >
                    {t('queueAnalysisButton')}
                </Button>
            </Stack>
        );
    }

    const onClickMove = (params: GridRowParams<ChessDbMove>) => {
        const move = chess?.move(params.id as string);

        if (move) {
            move.commentDiag = move.commentDiag || {};
            move.commentDiag.dojoEngine = 'CloudDB';
        }

        reconcile();
    };

    return (
        <Grid container columnSpacing={1} rowSpacing={2} mt={2}>
            <Grid size={12}>
                <Stack direction='row' alignItems='center' spacing={0.5}>
                    <Typography variant='subtitle2' color='text.secondary'>
                        {t('chessCloudDatabaseLabel')}
                    </Typography>
                    <Tooltip
                        title={
                            <Box sx={{ p: 1, maxWidth: 320 }}>
                                <Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
                                    {t('chessDbInfo')}
                                </Typography>
                            </Box>
                        }
                    >
                        <Help sx={{ color: 'text.secondary', fontSize: '1rem', cursor: 'help' }} />
                    </Tooltip>
                </Stack>
            </Grid>

            <Grid size={12}>
                <DataGridPro
                    autoHeight
                    disableColumnMenu
                    disableColumnReorder
                    hideFooter
                    columns={columns}
                    rows={moves}
                    getRowId={(row: GridRowModel<ChessDbMove>) => row.san}
                    onRowClick={onClickMove}
                    sx={{ fontSize: '0.8rem' }}
                />
            </Grid>
        </Grid>
    );
}

export default ChessDBTab;
