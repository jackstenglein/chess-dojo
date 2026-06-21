import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import { usePgnExportOptions } from '@/hooks/usePgnExportOptions';
import ScoreboardProgress from '@/scoreboard/ScoreboardProgress';
import {
    ExportDirectoryRun,
    exportDirectoryRunStatus,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Stack,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const MAX_RETRIES = 40;

export function DownloadGamesDialog({
    directories,
    games,
    onClose,
}: {
    directories?: { owner: string; id: string }[];
    games: { cohort: string; id: string }[];
    onClose: () => void;
}) {
    const t = useTranslations('games.downloadDialog');
    const {
        skipComments,
        setSkipComments,
        skipNags,
        setSkipNags,
        skipDrawables,
        setSkipDrawables,
        skipVariations,
        setSkipVariations,
        skipNullMoves,
        setSkipNullMoves,
        skipHeader,
        setSkipHeader,
        skipClocks,
        setSkipClocks,
    } = usePgnExportOptions();
    const api = useApi();
    const startRequest = useRequest<string>();
    const checkRequest = useRequest<ExportDirectoryRun>();
    const [recursive, setRecursive] = useState(true);
    const [delay, setDelay] = useState(1000);
    const [retries, setRetries] = useState(0);

    const { onSuccess, onFailure } = checkRequest;
    useEffect(() => {
        const id = startRequest.data;
        if (id && retries < MAX_RETRIES) {
            setTimeout(() => {
                api.checkDirectoryExport(id)
                    .then((response) => {
                        onSuccess(response.data);
                        if (response.data.downloadUrl) {
                            window.open(response.data.downloadUrl, '_blank');
                        } else if (response.data.status !== exportDirectoryRunStatus.enum.FAILED) {
                            setDelay(Math.min(30000, delay * 1.3));
                            setRetries(retries + 1);
                        }
                    })
                    .catch((err) => {
                        onFailure(err);
                        setDelay(Math.min(30000, delay * 1.3));
                        setRetries(retries + 1);
                    });
            }, delay);
        } else if (retries >= MAX_RETRIES) {
            onFailure(t('requestTimedOut'));
        }
    }, [api, onFailure, startRequest.data, onSuccess, retries, setRetries, delay, setDelay, t]);

    const onDownload = async () => {
        try {
            startRequest.onStart();
            const response = await api.exportDirectory({
                directories,
                games: games.map((g) => ({ cohort: g.cohort, id: g.id })),
                recursive,
                options: {
                    skipComments,
                    skipNags,
                    skipDrawables,
                    skipVariations,
                    skipNullMoves,
                    skipHeader,
                    skipClocks,
                },
            });
            startRequest.onSuccess(response.data.id);
        } catch (err) {
            startRequest.onFailure(err);
        }
    };

    if (startRequest.data) {
        return (
            <Dialog open onClose={checkRequest.data?.completedAt ? onClose : undefined} fullWidth>
                <DialogTitle>{t('title')}</DialogTitle>
                {checkRequest.data?.downloadUrl ? (
                    <>
                        <DialogContent>
                            <DialogContentText>
                                {t('exportCompleted', { total: checkRequest.data.total })}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button href={checkRequest.data.downloadUrl} target='_blank'>
                                {t('download')}
                            </Button>
                            <Button onClick={onClose}>{t('close')}</Button>
                        </DialogActions>
                    </>
                ) : checkRequest.data?.status !== exportDirectoryRunStatus.enum.FAILED ? (
                    <DialogContent>
                        <DialogContentText sx={{ mb: 1 }}>{t('exporting')}</DialogContentText>
                        {checkRequest.data?.total ? (
                            <ScoreboardProgress
                                value={checkRequest.data.progress}
                                max={checkRequest.data.total}
                                min={0}
                                suffix={t('games')}
                            />
                        ) : (
                            <Stack alignItems='center'>
                                <CircularProgress />
                            </Stack>
                        )}
                    </DialogContent>
                ) : (
                    <>
                        <DialogContent>
                            <DialogContentText>{t('exportFailed')}</DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button href='/help' component={Link}>
                                {t('help')}
                            </Button>
                            <Button onClick={onClose}>{t('close')}</Button>
                        </DialogActions>
                    </>
                )}
                <RequestSnackbar request={checkRequest} />
            </Dialog>
        );
    }

    return (
        <Dialog open onClose={startRequest.isLoading() ? undefined : onClose} fullWidth>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogContent>
                {Boolean(directories?.length) && (
                    <Stack sx={{ mb: 3 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={recursive}
                                    onChange={(e) => setRecursive(e.target.checked)}
                                />
                            }
                            label={t('includeSubfolders')}
                        />
                    </Stack>
                )}

                <FormLabel>{t('options')}</FormLabel>
                <Stack direction='row' flexWrap='wrap' columnGap={1} mt={1}>
                    <FormGroup sx={{ flexGrow: 1, width: { xs: 1, sm: 'unset' } }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipComments}
                                    onChange={(e) => setSkipComments(!e.target.checked)}
                                />
                            }
                            label={t('comments')}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipNags}
                                    onChange={(e) => setSkipNags(!e.target.checked)}
                                />
                            }
                            label={t('glyphs')}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipDrawables}
                                    onChange={(e) => setSkipDrawables(!e.target.checked)}
                                />
                            }
                            label={t('arrowsHighlights')}
                        />
                    </FormGroup>

                    <FormGroup sx={{ flexGrow: 1, width: { xs: 1, sm: 'unset' } }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipVariations}
                                    onChange={(e) => setSkipVariations(!e.target.checked)}
                                />
                            }
                            label={t('variations')}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipNullMoves}
                                    onChange={(e) => setSkipNullMoves(!e.target.checked)}
                                />
                            }
                            label={t('nullMoves')}
                        />
                    </FormGroup>

                    <FormGroup sx={{ flexGrow: 1, width: { xs: 1, sm: 'unset' } }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipHeader}
                                    onChange={(e) => setSkipHeader(!e.target.checked)}
                                />
                            }
                            label={t('tags')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!skipClocks}
                                    onChange={(e) => setSkipClocks(!e.target.checked)}
                                />
                            }
                            label={t('clockTimes')}
                        />
                    </FormGroup>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={startRequest.isLoading()} onClick={onClose}>
                    {t('cancel')}
                </Button>
                <Button loading={startRequest.isLoading()} onClick={onDownload}>
                    {t('download')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={startRequest} />
        </Dialog>
    );
}
