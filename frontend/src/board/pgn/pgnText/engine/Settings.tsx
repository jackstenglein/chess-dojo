import {
    CLOUD_EVAL_ENABLED,
    ENGINE_ADD_INFO_ON_EVAL_CLICK,
    ENGINE_ADD_INFO_ON_MOVE_CLICK,
    ENGINE_DEPTH,
    ENGINE_HASH,
    ENGINE_LINE_COUNT,
    ENGINE_NAME,
    ENGINE_PRIMARY_EVAL_TYPE,
    ENGINE_SHOW_EVAL,
    ENGINE_THREADS,
    EngineName,
    engines,
    HIGHLIGHT_ENGINE_LINES,
    PERSIST_ENGINE_LINES,
} from '@/stockfish/engine/engine';
import Icon from '@/style/Icon';
import SettingsIcon from '@mui/icons-material/Settings';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import KeyboardShortcuts from '../../boardTools/underboard/settings/KeyboardShortcuts';
import { ShortcutAction } from '../../boardTools/underboard/settings/ShortcutAction';
import Slider from './Slider';

export default function Settings() {
    const t = useTranslations('analysisBoard.engine');
    const [open, setOpen] = useState(false);
    const [depth, setDepth] = useLocalStorage<number>(ENGINE_DEPTH.Key, ENGINE_DEPTH.Default);
    const [multiPv, setMultiPv] = useLocalStorage<number>(
        ENGINE_LINE_COUNT.Key,
        ENGINE_LINE_COUNT.Default,
    );
    const [engineName, setEngineName] = useLocalStorage<EngineName>(
        ENGINE_NAME.Key,
        ENGINE_NAME.Default,
    );
    const [threads, setThreads] = useLocalStorage<number>(
        ENGINE_THREADS.Key,
        ENGINE_THREADS.Default,
    );
    const [hash, setHash] = useLocalStorage<number>(ENGINE_HASH.Key, ENGINE_HASH.Default);

    const [primaryEvalType, setPrimaryEvalType] = useLocalStorage<string>(
        ENGINE_PRIMARY_EVAL_TYPE.Key,
        ENGINE_PRIMARY_EVAL_TYPE.Default,
    );
    const [addEngineInfoOnEval, setAddEngineInfoOnEval] = useLocalStorage<boolean>(
        ENGINE_ADD_INFO_ON_EVAL_CLICK.Key,
        ENGINE_ADD_INFO_ON_EVAL_CLICK.Default,
    );
    const [addEngineInfoOnMove, setAddEngineInfoOnMove] = useLocalStorage<boolean>(
        ENGINE_ADD_INFO_ON_MOVE_CLICK.Key,
        ENGINE_ADD_INFO_ON_MOVE_CLICK.Default,
    );
    const [highlightEngineLines, setHighlightEngineLines] = useLocalStorage<boolean>(
        HIGHLIGHT_ENGINE_LINES.Key,
        HIGHLIGHT_ENGINE_LINES.Default,
    );
    const [showEngineEval, setShowEngineEval] = useLocalStorage<boolean>(
        ENGINE_SHOW_EVAL.Key,
        ENGINE_SHOW_EVAL.Default,
    );
    const [persistEngineLines, setPersistEngineLines] = useLocalStorage<boolean>(
        PERSIST_ENGINE_LINES.Key,
        PERSIST_ENGINE_LINES.Default,
    );

    const [cloudEvalEnabled, setCloudEvalEnabled] = useLocalStorage<boolean>(
        CLOUD_EVAL_ENABLED.Key,
        CLOUD_EVAL_ENABLED.Default,
    );

    useEffect(() => {
        if (!ENGINE_THREADS.Default) {
            ENGINE_THREADS.Default = navigator.hardwareConcurrency;
            ENGINE_THREADS.Max = navigator.hardwareConcurrency;
        }
        if (threads === 0) {
            setThreads(navigator.hardwareConcurrency);
        }
    }, [threads, setThreads]);

    return (
        <>
            <IconButton
                title={t('engineSettingsTooltip')}
                color='primary'
                onClick={() => setOpen(true)}
                sx={{ alignSelf: 'flex-end' }}
            >
                <SettingsIcon fontSize='medium' />
            </IconButton>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>{t('engineSettingsDialogTitle')}</DialogTitle>
                <DialogContent>
                    <Stack
                        sx={{
                            rowGap: 2,
                            pt: 1,
                        }}
                    >
                        <TextField
                            select
                            fullWidth
                            label={t('engineLabel')}
                            value={engineName}
                            onChange={(e) => setEngineName(e.target.value as EngineName)}
                            slotProps={{
                                select: {
                                    renderValue: (value) =>
                                        engines.find((e) => e.name === value)?.fullName,
                                },
                            }}
                        >
                            {engines.map((engine) => (
                                <MenuItem key={engine.name} value={engine.name}>
                                    <ListItemIcon>
                                        <Icon
                                            name={engine.name}
                                            sx={{ verticalAlign: 'middle', mr: 1 }}
                                            color='dojoOrange'
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={engine.fullName}
                                        secondary={t(`engineDescription_${engine.name}`)}
                                    />
                                </MenuItem>
                            ))}
                        </TextField>

                        <Slider
                            label={t('depthLabel')}
                            value={depth}
                            setValue={setDepth}
                            min={ENGINE_DEPTH.Min}
                            max={ENGINE_DEPTH.Max}
                        />

                        <Slider
                            label={t('linesLabel')}
                            value={multiPv}
                            setValue={setMultiPv}
                            min={ENGINE_LINE_COUNT.Min}
                            max={ENGINE_LINE_COUNT.Max}
                        />

                        <Slider
                            label={t('threadsLabel')}
                            value={threads}
                            setValue={setThreads}
                            min={ENGINE_THREADS.Min}
                            max={ENGINE_THREADS.Max || 4}
                        />

                        <Slider
                            label={t('memoryLabel')}
                            value={hash}
                            setValue={setHash}
                            min={ENGINE_HASH.Min}
                            max={ENGINE_HASH.Max}
                            valueLabel={(v) => t('memoryFormat', { value: Math.pow(2, v) })}
                        />
                    </Stack>

                    <Stack
                        sx={{
                            rowGap: { xs: 2, sm: 1 },
                            my: 3,
                        }}
                    >
                        <FormControl disabled={!showEngineEval}>
                            <FormLabel>{t('primaryEvalTypeLabel')}</FormLabel>
                            <RadioGroup
                                row
                                value={primaryEvalType}
                                onChange={(e) => setPrimaryEvalType(e.target.value)}
                            >
                                {ENGINE_PRIMARY_EVAL_TYPE.Options.map((opt) => (
                                    <FormControlLabel
                                        key={opt.value}
                                        value={opt.value}
                                        label={t(`evalType_${opt.value}`)}
                                        control={<Radio />}
                                    />
                                ))}
                            </RadioGroup>
                            {!showEngineEval && (
                                <Typography variant='caption' color='warning'>
                                    {t('evalHiddenWarning')}
                                </Typography>
                            )}
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={addEngineInfoOnEval}
                                    onChange={(e) => setAddEngineInfoOnEval(e.target.checked)}
                                />
                            }
                            label={t('addInfoEvalLabel')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={addEngineInfoOnMove}
                                    onChange={(e) => setAddEngineInfoOnMove(e.target.checked)}
                                />
                            }
                            label={t('addInfoMoveLabel')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={highlightEngineLines}
                                    onChange={(e) => setHighlightEngineLines(e.target.checked)}
                                />
                            }
                            label={t('highlightLinesLabel')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showEngineEval}
                                    onChange={(e) => setShowEngineEval(e.target.checked)}
                                />
                            }
                            label={t('showEvalLabel')}
                            sx={!showEngineEval ? { color: 'warning.main' } : undefined}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={persistEngineLines}
                                    onChange={(e) => setPersistEngineLines(e.target.checked)}
                                />
                            }
                            label={t('persistLinesLabel')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={cloudEvalEnabled}
                                    onChange={(e) => setCloudEvalEnabled(e.target.checked)}
                                />
                            }
                            label={t('showCloudDbLabel')}
                        />
                    </Stack>

                    <KeyboardShortcuts actions={[ShortcutAction.InsertEngineMove]} hideReset />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>{t('doneButton')}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
