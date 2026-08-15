import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useChess } from '@/board/pgn/PgnBoard';
import GameTable from '@/components/games/list/GameTable';
import useGame from '@/context/useGame';
import { GameInfo } from '@/database/game';
import { usePagination } from '@/hooks/usePagination';
import { usePgnExportOptions } from '@/hooks/usePgnExportOptions';
import { Move } from '@jackstenglein/chess';
import { PgnMergeType, PgnMergeTypes } from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    FormLabel,
    ListItemText,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
} from '@mui/material';
import { GridPaginationModel, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

export function MergeLineDialog({
    open,
    onClose,
    move,
}: {
    open: boolean;
    onClose: () => void;
    move?: Move;
}) {
    const t = useTranslations('analysisBoard.underboard.share');
    const { chess } = useChess();
    const { game } = useGame();
    const api = useApi();
    const { user } = useAuth();
    const request = useRequest<{ cohort: string; id: string }>();

    const mergeTypeLabels = useMemo(
        () => ({
            [PgnMergeTypes.MERGE]: t('mergeOptionLabel'),
            [PgnMergeTypes.DISCARD]: t('ignoreOptionLabel'),
            [PgnMergeTypes.OVERWRITE]: t('overwriteOptionLabel'),
        }),
        [t],
    );

    const { skipVariations, setSkipVariations, skipNullMoves, setSkipNullMoves } =
        usePgnExportOptions();
    const [commentMergeType, setCommentMergeType] = useState<PgnMergeType>(PgnMergeTypes.MERGE);
    const [nagMergeType, setNagMergeType] = useState<PgnMergeType>(PgnMergeTypes.MERGE);
    const [drawableMergeType, setDrawableMergeType] = useState<PgnMergeType>(PgnMergeTypes.MERGE);
    const [citeSource, setCiteSource] = useState(true);
    const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
        type: 'include',
        ids: new Set(),
    });

    const searchByOwner = useCallback(
        (startKey: string) => api.listGamesByOwner(user?.username, startKey),
        [api, user?.username],
    );

    const pagination = usePagination(searchByOwner, 0, 10);

    const onPaginationModelChange = (model: GridPaginationModel) => {
        if (model.pageSize !== pagination.pageSize) {
            pagination.setPageSize(model.pageSize);
        }
    };

    const onMergeLine = async () => {
        const rowId = [...selectedRows.ids.values()][0];
        const [cohort, id] = (rowId as string).split('/');
        if (!chess || !cohort || !id) {
            return;
        }

        const renderMove = move || chess.currentMove();
        if (!renderMove) {
            request.onFailure({ message: t('mergeLineError') });
            return;
        }

        const pgn = chess.renderLine(move || chess.currentMove(), {
            skipVariations,
            skipNullMoves,
        });

        try {
            request.onStart();
            const response = await api.mergePgn({
                cohort,
                id,
                pgn,
                citeSource,
                sourceCohort: game?.cohort,
                sourceId: game?.id,
                commentMergeType,
                nagMergeType,
                drawableMergeType,
            });
            request.onSuccess(response.data);
            onClose();
        } catch (err) {
            request.onFailure(err);
        }
    };

    const onOpenGame = () => {
        const cohort = request.data?.cohort.replaceAll('+', '%2B');
        const id = request.data?.id.replaceAll('?', '%3F');
        window.open(`/games/${cohort}/${id}`, '_blank');
    };

    const handleClose = () => {
        if (request.isLoading()) {
            return;
        }
        onClose();
        request.reset();
        setSelectedRows({ type: 'include', ids: new Set() });
    };

    return (
        <>
            <RequestSnackbar request={request} />

            <Snackbar
                data-testid='success-snackbar'
                open={!!request.data}
                autoHideDuration={6000}
                onClose={request.reset}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={t('mergeSuccessMessage')}
                action={
                    <Button
                        onClick={onOpenGame}
                        color='secondary'
                        size='small'
                        sx={{ fontWeight: 'bold' }}
                    >
                        {t('openButton')}
                    </Button>
                }
            />

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth='md'>
                <DialogTitle>{t('mergeLineTitle')}</DialogTitle>
                <DialogContent>
                    <FormLabel>{t('exportOptionsLabel')}</FormLabel>
                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            columnGap: 1,
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipVariations}
                                    onChange={(e) => setSkipVariations(!e.target.checked)}
                                />
                            }
                            label={t('mergeVariations')}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipNullMoves}
                                    onChange={(e) => setSkipNullMoves(!e.target.checked)}
                                />
                            }
                            label={t('mergeNullMoves')}
                        />
                    </Stack>

                    <FormGroup sx={{ mt: 2 }}>
                        <FormLabel>{t('importOptionsLabel')}</FormLabel>
                        <Stack
                            direction='row'
                            sx={{
                                flexWrap: 'wrap',
                                columnGap: 1,
                                alignItems: 'center',
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={citeSource}
                                        onChange={(e) => setCiteSource(e.target.checked)}
                                    />
                                }
                                label={t('citeCurrentGame')}
                            />

                            <TextField
                                label={t('mergeCommentsLabel')}
                                select
                                value={commentMergeType}
                                onChange={(e) =>
                                    setCommentMergeType(e.target.value as PgnMergeType)
                                }
                                slotProps={{
                                    select: {
                                        renderValue: (value) =>
                                            mergeTypeLabels[value as PgnMergeType],
                                    },
                                }}
                                size='small'
                                sx={{ minWidth: '116px' }}
                            >
                                <MenuItem value={PgnMergeTypes.MERGE}>
                                    <ListItemText
                                        primary={t('mergeOptionLabel')}
                                        secondary={t('mergeOptionSecondary')}
                                    />
                                </MenuItem>
                                <MenuItem value={PgnMergeTypes.OVERWRITE}>
                                    <ListItemText
                                        primary={t('overwriteOptionLabel')}
                                        secondary={t('overwriteOptionSecondary')}
                                    />
                                </MenuItem>
                                <MenuItem value={PgnMergeTypes.DISCARD}>
                                    <ListItemText
                                        primary={t('ignoreOptionLabel')}
                                        secondary={t('ignoreOptionSecondary')}
                                    />
                                </MenuItem>
                            </TextField>

                            <TextField
                                label={t('glyphsLabel')}
                                select
                                value={nagMergeType}
                                onChange={(e) => setNagMergeType(e.target.value as PgnMergeType)}
                                slotProps={{
                                    select: {
                                        renderValue: (value) =>
                                            mergeTypeLabels[value as PgnMergeType],
                                    },
                                }}
                                size='small'
                                sx={{ minWidth: '116px' }}
                            >
                                <MenuItem value={PgnMergeTypes.MERGE}>
                                    <ListItemText
                                        primary={t('mergeOptionLabel')}
                                        secondary={t('glyphsMergeSecondary')}
                                    />
                                </MenuItem>
                                <MenuItem value={PgnMergeTypes.OVERWRITE}>
                                    <ListItemText
                                        primary={t('overwriteOptionLabel')}
                                        secondary={t('glyphsOverwriteSecondary')}
                                    />
                                </MenuItem>
                                <MenuItem value={PgnMergeTypes.DISCARD}>
                                    <ListItemText
                                        primary={t('ignoreOptionLabel')}
                                        secondary={t('glyphsIgnoreSecondary')}
                                    />
                                </MenuItem>
                            </TextField>

                            <TextField
                                label={t('arrowsHighlightsLabel')}
                                select
                                value={drawableMergeType}
                                onChange={(e) =>
                                    setDrawableMergeType(e.target.value as PgnMergeType)
                                }
                                slotProps={{
                                    select: {
                                        renderValue: (value) =>
                                            mergeTypeLabels[value as PgnMergeType],
                                    },
                                }}
                                size='small'
                                sx={{ minWidth: '140px' }}
                            >
                                <MenuItem value={PgnMergeTypes.MERGE}>
                                    <ListItemText
                                        primary={t('mergeOptionLabel')}
                                        secondary={t('arrowsMergeSecondary')}
                                    />
                                </MenuItem>
                                <MenuItem value={PgnMergeTypes.OVERWRITE}>
                                    <ListItemText
                                        primary={t('overwriteOptionLabel')}
                                        secondary={t('arrowsOverwriteSecondary')}
                                    />
                                </MenuItem>
                                <MenuItem value={PgnMergeTypes.DISCARD}>
                                    <ListItemText
                                        primary={t('ignoreOptionLabel')}
                                        secondary={t('arrowsIgnoreSecondary')}
                                    />
                                </MenuItem>
                            </TextField>
                        </Stack>
                    </FormGroup>

                    <FormGroup sx={{ mt: 2 }}>
                        <FormLabel>{t('selectGameLabel')}</FormLabel>
                        <GameTable
                            namespace='my-existing-games'
                            getRowId={getRowId}
                            pagination={pagination}
                            onPaginationModelChange={onPaginationModelChange}
                            onRowSelectionModelChange={setSelectedRows}
                            rowSelectionModel={selectedRows}
                            defaultVisibility={{
                                unlisted: true,
                                owner: false,
                            }}
                            checkboxSelection
                            disableMultipleRowSelection={true}
                        />
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={request.isLoading()}>
                        {t('mergeCancelButton')}
                    </Button>
                    <Button
                        loading={request.isLoading()}
                        disabled={selectedRows.ids.size === 0}
                        onClick={onMergeLine}
                    >
                        {t('mergeLineButton')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function getRowId(row: GameInfo) {
    return `${row.cohort}/${row.id}`;
}
