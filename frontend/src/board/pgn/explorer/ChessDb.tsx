import { ChessDbMove } from '@/api/cache/chessdb';
import LoadingPage from '@/loading/LoadingPage';
import { getBackgroundColor } from './Database';
import { Help } from '@mui/icons-material';
import { Box, Button, Grid, Stack, Tooltip, Typography, styled } from '@mui/material';
import {
    DataGridPro,
    GridColDef,
    GridRenderCellParams,
    GridRowModel,
    GridRowParams,
} from '@mui/x-data-grid-pro';
import { useReconcile } from '../../Board';
import { useChess } from '../PgnBoard';

const CHESSDB_INFO =
    'Chess Cloud Database (aka "CDB") is a massive chess knowledge database, including an opening book and endgame tablebases.\n\nIn contrast to traditional opening book building from game results, CDB is built entirely from analyzing individual moves using chess engines while overcoming their problems such as aggressive pruning and blind spots.\n\nCDB attempts to explore and define new chess opening theories, currently it includes most of the popular opening lines and yet still refining the results.';

const StyledDataGrid = styled(DataGridPro<ChessDbMove>)(({ theme }) => ({
    '& .chessdb--best': {
        backgroundColor: `${getBackgroundColor(
            theme.palette.info.main,
            theme.palette.mode,
        )} !important`,
    },
}));

const columns: GridColDef<ChessDbMove>[] = [
    {
        field: 'san',
        headerName: 'Move',
        align: 'left',
        headerAlign: 'left',
        minWidth: 55,
        width: 55,
    },
    {
        field: 'score',
        headerName: 'Score',
        align: 'left',
        headerAlign: 'left',
        width: 75,
    },
    {
        field: 'winrate',
        headerName: 'Winrate',
        align: 'left',
        headerAlign: 'left',
        width: 80,
        renderCell: (params: GridRenderCellParams<ChessDbMove, string>) =>
            params.value ? `${params.value}%` : '—',
    },
    {
        field: 'note',
        headerName: 'Note',
        align: 'left',
        headerAlign: 'left',
        flex: 1,
        renderCell: (params: GridRenderCellParams<ChessDbMove, string>) => (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontStyle: 'italic' }}>
                {params.value}
            </Typography>
        ),
    },
];

interface ChessDBTabProps {
    moves: ChessDbMove[];
    loading: boolean;
    error: string | null;
    requestAnalysis: () => void;
}

export function ChessDBTab({ moves, loading, error, requestAnalysis }: ChessDBTabProps) {
    const { chess } = useChess();
    const reconcile = useReconcile();

    if (loading) return <LoadingPage />;

    if (error) {
        return (
            <Stack mt={2} spacing={1} alignItems='center'>
                <Typography color='error'>{error}</Typography>
                <Button onClick={requestAnalysis} variant='outlined' size='small'>
                    Queue Analysis
                </Button>
            </Stack>
        );
    }

    if (moves.length === 0) {
        return (
            <Stack mt={2} spacing={1} alignItems='center'>
                <Typography>Position not in ChessDB.</Typography>
                <Button onClick={requestAnalysis} variant='outlined' size='small'>
                    Queue Analysis
                </Button>
            </Stack>
        );
    }

    const onClickMove = (params: GridRowParams<ChessDbMove>) => {
        chess?.move(params.id as string);
        reconcile();
    };

    return (
        <Grid container columnSpacing={1} rowSpacing={2} mt={2}>
            <Grid size={12}>
                <Stack direction='row' alignItems='center' spacing={0.5}>
                    <Typography variant='subtitle2' color='text.secondary'>
                        Chess Cloud Database
                    </Typography>
                    <Tooltip
                        title={
                            <Box sx={{ p: 1, maxWidth: 320 }}>
                                <Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
                                    {CHESSDB_INFO}
                                </Typography>
                            </Box>
                        }
                    >
                        <Help sx={{ color: 'text.secondary', fontSize: '1rem', cursor: 'help' }} />
                    </Tooltip>
                </Stack>
            </Grid>

            <Grid size={12}>
                <StyledDataGrid
                    autoHeight
                    disableColumnMenu
                    disableColumnReorder
                    hideFooter
                    columns={columns}
                    rows={moves}
                    getRowId={(row: GridRowModel<ChessDbMove>) => row.san}
                    getRowClassName={(params) =>
                        params.row.rank === '1' ? 'chessdb--best' : ''
                    }
                    onRowClick={onClickMove}
                    sx={{ fontSize: '0.8rem' }}
                />
            </Grid>

        </Grid>
    );
}

export default ChessDBTab;