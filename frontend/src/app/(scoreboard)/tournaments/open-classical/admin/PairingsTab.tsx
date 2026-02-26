import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { getRatingRanges, OpenClassical, OpenClassicalPairing } from '@/database/tournament';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { Edit } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
} from '@mui/material';
import { DataGridPro, GridActionsCellItem, GridColDef } from '@mui/x-data-grid-pro';
import { useMemo, useState } from 'react';
import { PairingsTableProps, pairingTableColumns } from '../PairingsTable';
import Editor from './Editor';
import EmailPairingsButton from './EmailPairingsButton';

interface PairingsTabProps {
    openClassical: OpenClassical;
    onUpdate: (openClassical: OpenClassical) => void;
}

const PairingsTab: React.FC<PairingsTabProps> = ({ openClassical, onUpdate }) => {
    const { searchParams, updateSearchParams } = useNextSearchParams({
        region: 'A',
        ratingRange: 'Open',
        view: '1',
    });

    const region = searchParams.get('region') || 'A';
    const ratingRange = searchParams.get('ratingRange') || 'Open';
    const view = searchParams.get('view') || '1';

    const round = openClassical.sections[`${region}_${ratingRange}`]?.rounds[parseInt(view) - 1];

    const maxRound = openClassical.sections[`${region}_${ratingRange}`]?.rounds.length ?? 1;

    return (
        <Stack spacing={3}>
            <Stack direction='row' spacing={2}>
                <Editor openClassical={openClassical} onSuccess={onUpdate} />
                <EmailPairingsButton
                    maxRound={maxRound}
                    currentRound={parseInt(view)}
                    emailsSent={round?.pairingEmailsSent}
                    onSuccess={onUpdate}
                />
            </Stack>

            <Stack direction='row' width={1} spacing={2}>
                <TextField
                    label='Region'
                    select
                    value={region}
                    onChange={(e) => updateSearchParams({ region: e.target.value })}
                    sx={{
                        flexGrow: 1,
                    }}
                >
                    <MenuItem value='A'>Region A (Americas)</MenuItem>
                    <MenuItem value='B'>Region B (Eurasia/Africa/Oceania)</MenuItem>
                </TextField>

                <TextField
                    data-testid='section'
                    label='Section'
                    select
                    value={ratingRange}
                    onChange={(e) => updateSearchParams({ ratingRange: e.target.value })}
                    sx={{
                        flexGrow: 1,
                    }}
                >
                    {getRatingRanges(openClassical).map((rating) => (
                        <MenuItem key={rating} value={rating}>
                            {rating}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label='Round'
                    select
                    value={view}
                    onChange={(e) => updateSearchParams({ view: e.target.value })}
                    sx={{
                        flexGrow: 1,
                    }}
                >
                    {Array(maxRound)
                        .fill(0)
                        .map((_, i) => (
                            <MenuItem key={i + 1} value={`${i + 1}`}>
                                Round {i + 1}
                            </MenuItem>
                        ))}
                </TextField>
            </Stack>

            <AdminPairingsTable
                openClassical={openClassical}
                region={region}
                ratingRange={ratingRange}
                round={parseInt(view)}
                onUpdate={onUpdate}
            />
        </Stack>
    );
};

const adminPairingTableColumns: GridColDef<OpenClassicalPairing>[] = [
    ...pairingTableColumns,
    {
        field: 'reportOpponent',
        headerName: 'Report Opponent',
        type: 'boolean',
        width: 125,
    },
    {
        field: 'notes',
        headerName: 'Notes',
        headerAlign: 'center',
        flex: 1,
    },
];

interface AdminPairingsTableProps extends PairingsTableProps {
    onUpdate: (openClassical: OpenClassical) => void;
}

const AdminPairingsTable: React.FC<AdminPairingsTableProps> = ({
    openClassical,
    region,
    ratingRange,
    round,
    onUpdate,
}) => {
    const [updatePairing, setUpdatePairing] = useState<OpenClassicalPairing>();
    const [updateResult, setUpdateResult] = useState('');
    const api = useApi();
    const updateRequest = useRequest();

    const columns = useMemo(() => {
        return adminPairingTableColumns.concat({
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            getActions: (params) => [
                <Tooltip key='update-result' title='Update Result'>
                    <GridActionsCellItem
                        icon={<Edit />}
                        label='Update Result'
                        onClick={() => {
                            setUpdateResult(params.row.result);
                            setUpdatePairing(params.row);
                        }}
                    />
                </Tooltip>,
            ],
            width: 70,
        });
    }, [setUpdatePairing]);

    const pairings =
        openClassical.sections[`${region}_${ratingRange}`]?.rounds[round - 1]?.pairings ?? [];

    const onConfirmUpdate = () => {
        if (updateResult === '') {
            return;
        }

        updateRequest.onStart();
        api.adminVerifyResult({
            region,
            section: ratingRange,
            round,
            white: updatePairing?.white.lichessUsername || '',
            black: updatePairing?.black.lichessUsername || '',
            result: updateResult,
        })
            .then((resp) => {
                onUpdate(resp.data);
                setUpdatePairing(undefined);
                updateRequest.onSuccess();
            })
            .catch((err: unknown) => {
                updateRequest.onFailure(err);
            });
    };

    return (
        <>
            <DataGridPro
                columns={columns}
                rows={pairings}
                getRowId={(pairing) =>
                    `${pairing.white.lichessUsername}-${pairing.black.lichessUsername}`
                }
                getRowHeight={() => 'auto'}
                sx={{
                    '&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell': {
                        py: '8px',
                    },
                    '&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell': {
                        py: '15px',
                    },
                    '&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell': {
                        py: '22px',
                    },
                }}
                autoHeight
            />

            <Dialog
                open={Boolean(updatePairing)}
                onClose={updateRequest.isLoading() ? undefined : () => setUpdatePairing(undefined)}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>Update Result?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Update and verify the result of this pairing?
                    </DialogContentText>
                    <DialogContentText>
                        {updatePairing?.white.lichessUsername} -{' '}
                        {updatePairing?.black.lichessUsername}
                    </DialogContentText>

                    <TextField
                        data-testid='result'
                        label='Result'
                        select
                        required
                        value={updateResult}
                        onChange={(e) => setUpdateResult(e.target.value)}
                        sx={{ mt: 3, mb: 1, width: 1 }}
                    >
                        <MenuItem value='1-0'>White Wins (1-0)</MenuItem>
                        <MenuItem value='0-1'>Black Wins (0-1)</MenuItem>
                        <MenuItem value='1/2-1/2'>Draw (1/2-1/2)</MenuItem>
                        <MenuItem value='1/2-1/2F'>Did Not Play (1/2-1/2F)</MenuItem>
                        <MenuItem value='0-1F'>White Forfeits (0-1F)</MenuItem>
                        <MenuItem value='1-0F'>Black Forfeits (1-0F)</MenuItem>
                        <MenuItem value='0-0'>No Results Submitted (0-0)</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setUpdatePairing(undefined)}
                        disabled={updateRequest.isLoading()}
                    >
                        Cancel
                    </Button>
                    <LoadingButton loading={updateRequest.isLoading()} onClick={onConfirmUpdate}>
                        Update
                    </LoadingButton>
                </DialogActions>

                <RequestSnackbar request={updateRequest} />
            </Dialog>
        </>
    );
};

export default PairingsTab;
