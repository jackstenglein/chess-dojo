import { isValidDate, stripTagValue } from '@/api/gameApi';
import { Link } from '@/components/navigation/Link';
import { Game, MastersCohort } from '@/database/game';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { EventType, PgnDate, PgnTime, TimeControl } from '@jackstenglein/chess';
import { Close } from '@mui/icons-material';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    DataGridPro,
    GridCellParams,
    GridColDef,
    GridEditInputCell,
    GridEditSingleSelectCell,
    GridRenderCellParams,
    GridRenderEditCellParams,
} from '@mui/x-data-grid-pro';
import React, { useEffect, useState } from 'react';
import { useChess } from '../../../PgnBoard';
import { EditDateCell } from './DateEditor';
import { TimeControlGridEditor } from './TimeControlEditor';

interface OwnerValue {
    displayName: string;
    username: string;
    previousCohort: string;
}

function isOwnerValue(obj: unknown): obj is OwnerValue {
    return typeof obj === 'object' && obj !== null && 'displayName' in obj;
}

export interface TagRow {
    name: string;
    value: string | OwnerValue | PgnDate | PgnTime | TimeControl;
}

const columns: GridColDef<TagRow>[] = [
    { field: 'name', flex: 0.25 },
    {
        field: 'value',
        flex: 0.75,
        editable: true,
        renderCell: (params: GridRenderCellParams<TagRow>) => {
            if (isOwnerValue(params.row.value)) {
                if (params.row.value.username === MastersCohort) {
                    return null;
                }
                return (
                    <Stack direction='row' spacing={1} alignItems='center' height={1}>
                        <Avatar
                            username={params.row.value.username}
                            displayName={params.row.value.displayName}
                            size={28}
                        />
                        <Link href={`/profile/${params.row.value.username}`}>
                            <Typography variant='body2'>{params.row.value.displayName}</Typography>
                        </Link>
                        <CohortIcon cohort={params.row.value.previousCohort} size={20} />
                    </Stack>
                );
            }

            if (params.row.name === 'Cohort' && typeof params.row.value === 'string') {
                return (
                    <Link
                        href={`/games/?type=cohort&cohort=${encodeURIComponent(params.row.value)}`}
                    >
                        {params.row.value === MastersCohort ? 'Masters DB' : params.row.value}
                    </Link>
                );
            }

            if (typeof params.row.value === 'string') {
                return params.row.value;
            }

            return params.row.value.value;
        },
        renderEditCell: (params) => <CustomEditComponent {...params} />,
    },
];

const dateTags = ['Date', 'EventDate', 'UTCDate', 'EndDate'];

const CHESS_TITLES = ['', 'GM', 'WGM', 'IM', 'WIM', 'FM', 'WFM', 'CM', 'WCM', 'NM', 'WNM'];

function CustomEditComponent(props: GridRenderEditCellParams<TagRow>) {
    if (props.row.name === 'Result') {
        return (
            <GridEditSingleSelectCell
                {...props}
                variant='outlined'
                colDef={{
                    ...props.colDef,
                    type: 'singleSelect',
                    valueOptions: ['1-0', '1/2-1/2', '0-1'],
                    getOptionValue(value) {
                        return value;
                    },
                    getOptionLabel(value) {
                        if (typeof value === 'string') {
                            return value;
                        }
                        // This should not happen but is required by eslint
                        return '';
                    },
                }}
            />
        );
    }
    if (props.row.name === 'WhiteTitle' || props.row.name === 'BlackTitle') {
        return (
            <GridEditSingleSelectCell
                {...props}
                variant='outlined'
                colDef={{
                    ...props.colDef,
                    type: 'singleSelect',
                    valueOptions: CHESS_TITLES,
                    getOptionValue(value) {
                        return value;
                    },
                    getOptionLabel(value) {
                        if (typeof value === 'string') {
                            return value || 'None';
                        }
                        return '';
                    },
                }}
            />
        );
    }
    if (props.row.name === 'TimeControl') {
        return <TimeControlGridEditor {...props} />;
    }
    if (dateTags.includes(props.row.name)) {
        return <EditDateCell {...props} />;
    }
    return <GridEditInputCell {...props} />;
}

const defaultTags = [
    'White',
    'WhiteElo',
    'WhiteTitle',
    'Black',
    'BlackElo',
    'BlackTitle',
    'Result',
    'Date',
    'Event',
    'Section',
    'Round',
    'Board',
    'TimeControl',
];

const uneditableTags = ['PlyCount'];

const suggestedCustomTags = [
    'Site',
    'Annotator',
    'Termination',
    'Mode',
    'WhiteTeam',
    'WhiteFideId',
    'BlackTeam',
    'BlackFideId',
    'GameId',
].sort((a, b) => a.localeCompare(b));

interface TagsProps {
    game?: Game;
    allowEdits?: boolean;
}

const Tags: React.FC<TagsProps> = ({ game, allowEdits }) => {
    const chess = useChess().chess;
    const [, setForceRender] = useState(0);
    const [error, setError] = useState('');
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [customTagLabel, setCustomTagLabel] = useState('');
    const [customTagValue, setCustomTagValue] = useState('');
    const [customTagError, setCustomTagError] = useState<Record<string, string>>({});

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [EventType.UpdateHeader],
                handler: () => {
                    setForceRender((v) => v + 1);
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess]);

    const header = chess?.pgn.header;
    if (!header) {
        return null;
    }

    const onCloseCustomModal = () => {
        setCustomModalOpen(false);
        setCustomTagLabel('');
        setCustomTagValue('');
        setCustomTagError({});
    };

    const onAddCustomTag = () => {
        const newErrors: Record<string, string> = {};
        if (customTagLabel.trim().length === 0) {
            newErrors.label = 'This field is required';
        }
        if (customTagValue.trim().length === 0) {
            newErrors.value = 'This field is required';
        }
        setCustomTagError(newErrors);
        if (Object.entries(newErrors).length > 0) {
            return;
        }

        chess.setHeader(customTagLabel.trim(), customTagValue.trim());
        onCloseCustomModal();
    };

    const rows: TagRow[] = [];
    if (game) {
        if (game.ownerDisplayName) {
            rows.push({
                name: 'Uploaded By',
                value: {
                    displayName: game.ownerDisplayName,
                    username: game.owner,
                    previousCohort: game.ownerPreviousCohort,
                },
            });
        }
        rows.push({ name: 'Cohort', value: game.cohort });
    }

    rows.push(...defaultTags.map((name) => ({ name, value: header.getRawValue(name) })));

    for (const tag of Object.keys(header.tags || {})) {
        if (!defaultTags.includes(tag) && !uneditableTags.includes(tag)) {
            rows.push({ name: tag, value: header.getValue(tag) });
        }
    }

    for (const tag of uneditableTags) {
        rows.push({ name: tag, value: header.getRawValue(tag) });
    }

    return (
        <Box height={1}>
            {allowEdits && (
                <Typography variant='body2' color='text.secondary' ml={1} mt={1} mb={1}>
                    Double click a cell to edit
                </Typography>
            )}
            {error && (
                <Snackbar
                    data-testid='error-snackbar'
                    open={!!error}
                    autoHideDuration={6000}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    onClose={() => setError('')}
                >
                    <Alert variant='filled' severity='error' sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                </Snackbar>
            )}

            <DataGridPro
                autoHeight
                sx={{
                    border: 0,
                    '& .MuiDataGrid-cell--editing': { outline: 'none !important' },
                }}
                columns={columns}
                rows={rows}
                getRowId={(row) => row.name}
                slots={{
                    columnHeaders: NullHeader,
                }}
                hideFooter
                isCellEditable={(params: GridCellParams<TagRow>) => {
                    if (!allowEdits) {
                        return false;
                    }
                    if (params.row.name === 'Uploaded By' || params.row.name === 'Cohort') {
                        return false;
                    }
                    return !uneditableTags.includes(params.row.name);
                }}
                processRowUpdate={(newRow, oldRow) => {
                    const value = newRow.value as string;
                    const name = newRow.name;

                    if (['White', 'Date', 'Black'].includes(name) && stripTagValue(value) === '') {
                        setError(`${name} tag is required to publish`);
                        return oldRow;
                    }

                    if (dateTags.includes(name) && value && !isValidDate(value)) {
                        setError('PGN dates must be in the format 2024.12.31');
                        return oldRow;
                    }

                    if (!value && !['WhiteTitle', 'BlackTitle'].includes(name)) {
                        return oldRow;
                    }

                    chess.setHeader(newRow.name, newRow.value as string);

                    if (defaultTags.includes(name)) {
                        return {
                            ...newRow,
                            value: chess.header().getRawValue(name),
                        };
                    }

                    return {
                        ...newRow,
                        value: chess.header().getValue(newRow.name),
                    };
                }}
                onProcessRowUpdateError={(err: Error) => {
                    setError(err.message);
                }}
            />
            <Button onClick={() => setCustomModalOpen(true)}>Add PGN Tag</Button>
            <Dialog fullWidth maxWidth='sm' open={customModalOpen}>
                <IconButton
                    aria-label='close'
                    onClick={onCloseCustomModal}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <Close />
                </IconButton>
                <DialogTitle>Add PGN Tag</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                                autoSelect
                                freeSolo
                                fullWidth
                                onChange={(_e, v) => setCustomTagLabel(v ?? '')}
                                options={suggestedCustomTags.filter(
                                    (name) =>
                                        !Object.keys(chess.header().valueMap()).includes(name),
                                )}
                                value={customTagLabel}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label='Tag Label'
                                        error={!!customTagError.label}
                                        helperText={customTagError.label}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label='Tag Value'
                                value={customTagValue}
                                onChange={(e) => setCustomTagValue(e.target.value)}
                                error={!!customTagError.value}
                                helperText={customTagError.value}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCloseCustomModal}>Cancel</Button>
                    <Button onClick={onAddCustomTag}>Add Tag</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Tags;

const NullHeader = React.forwardRef(() => null);
NullHeader.displayName = 'NullHeader';
