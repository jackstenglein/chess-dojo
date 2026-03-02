import { Tags, TimeControl } from '@jackstenglein/chess';
import { Add, Delete } from '@mui/icons-material';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    IconButton,
    InputLabel,
    OutlinedInput,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { GridRenderEditCellParams, useGridApiContext } from '@mui/x-data-grid-pro';
import { TimeField } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { BlockBoardKeyboardShortcuts } from '../../../PgnBoard';
import { convertSecondsToDateTime } from '../clock/ClockEditor';
import { TagRow } from './Tags';

const DEFAULT_TIME_CONTROL_KEY = 'defaultTimeControl';

function parseTimeControlString(value: string): TimeControl[] {
    if (!value || value.trim() === '' || value === '?') {
        return [{}];
    }

    const parts = value.split(':');
    return parts.map((part) => {
        const tc: TimeControl = {};

        // Check for moves/time format: "40/5400" means 40 moves in 5400 seconds
        const movesMatch = /^(\d+)\/(.+)$/.exec(part);
        if (movesMatch) {
            tc.moves = parseInt(movesMatch[1]);
            part = movesMatch[2];
        }

        // Check for increment: "5400+30"
        const incrementMatch = /^(\d+)\+(\d+)$/.exec(part);
        if (incrementMatch) {
            tc.seconds = parseInt(incrementMatch[1]);
            tc.increment = parseInt(incrementMatch[2]);
            tc.kind = tc.moves
                ? TimeControlKind.MovesInSecondsWithIncrement
                : TimeControlKind.SecondsWithIncrement;
            return tc;
        }

        // Check for delay: "5400d30"
        const delayMatch = /^(\d+)d(\d+)$/.exec(part);
        if (delayMatch) {
            tc.seconds = parseInt(delayMatch[1]);
            tc.delay = parseInt(delayMatch[2]);
            tc.kind = tc.moves
                ? TimeControlKind.MovesInSecondsWithDelay
                : TimeControlKind.SecondsWithDelay;
            return tc;
        }

        // Just seconds: "5400"
        const seconds = parseInt(part);
        if (!isNaN(seconds)) {
            tc.seconds = seconds;
        }

        return tc;
    });
}

type TimeControlHeader = Tags['TimeControl'];

const d = new Date();
d.setHours(0, 0, 0);
const defaultDateTime = DateTime.fromJSDate(d);

interface TimeControlEditorProps {
    open: boolean;
    initialItems?: TimeControl[];
    onCancel: () => void;
    onSuccess: (value: string) => void;
}

export function TimeControlEditor({
    open,
    initialItems,
    onCancel,
    onSuccess,
}: TimeControlEditorProps) {
    const [defaultTimeControl, setDefaultTimeControl] = useLocalStorage<string>(
        DEFAULT_TIME_CONTROL_KEY,
        '',
    );

    // Use initialItems if provided, otherwise try to use the default from localStorage
    const getInitialTimeControls = (): TimeControl[] => {
        if (initialItems && initialItems.length > 0) {
            return initialItems;
        }
        if (defaultTimeControl) {
            return parseTimeControlString(defaultTimeControl);
        }
        return [{}];
    };

    const [timeControls, setTimeControls] = useState<TimeControl[]>(getInitialTimeControls);
    const [errors, setErrors] = useState<TimeControlErrors>({});

    const onSave = () => {
        const newErrors = validateTimeControls(timeControls);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            return;
        }

        const newValue = timeControls.map((tc) => getTimeControlValue(tc)).join(':');
        setDefaultTimeControl(newValue);
        onSuccess(newValue);
    };

    const setTimeControl = (i: number, value: TimeControl) => {
        setTimeControls([...timeControls.slice(0, i), value, ...timeControls.slice(i + 1)]);
    };

    const onChangeNumMoves = (i: number, value: string) => {
        const moves = parseInt(value || '0');
        if (isNaN(moves)) {
            return;
        }

        setTimeControl(i, {
            ...timeControls[i],
            moves,
        });
    };

    const onChangeInitialTime = (i: number, value: DateTime | null) => {
        const seconds = value ? value.hour * 3600 + value.minute * 60 + value.second : 0;
        setTimeControl(i, {
            ...timeControls[i],
            seconds,
        });
    };

    const onChangeBonusTime = (i: number, value: string) => {
        const bonus = parseInt(value);
        const bonusType = getBonusType(timeControls[i]);

        setTimeControl(i, {
            ...timeControls[i],
            [bonusType]: bonus,
            kind: bonusType as TimeControlKind,
        });
    };

    const onChangeBonusType = (i: number, value: string) => {
        setTimeControl(i, {
            ...timeControls[i],
            kind:
                value === 'delay'
                    ? TimeControlKind.SecondsWithDelay
                    : TimeControlKind.SecondsWithIncrement,
            delay: value === 'delay' ? timeControls[i].increment : undefined,
            increment: value === 'increment' ? timeControls[i].delay : undefined,
        });
    };

    const onAddTimeControl = () => {
        setTimeControls((tc) => tc.concat({}));
    };

    const onDeleteTimeControl = (i: number) => {
        setTimeControls((tc) => [...tc.slice(0, i), ...tc.slice(i + 1)]);
    };

    return (
        <Dialog
            maxWidth='md'
            fullWidth
            open={open}
            onClose={onCancel}
            classes={{
                container: BlockBoardKeyboardShortcuts,
            }}
            className={BlockBoardKeyboardShortcuts}
        >
            <DialogTitle>Update Time Control</DialogTitle>
            <DialogContent>
                <Stack pt={1}>
                    {timeControls.map((item, i) => (
                        <Stack
                            mt={i ? 3 : undefined}
                            key={i}
                            direction='row'
                            alignItems='center'
                            spacing={1}
                        >
                            <Stack flexGrow={1}>
                                <Typography variant='h6'>Time Control {i + 1}</Typography>

                                <FormControl sx={{ width: 1, mt: 3 }} error={!!errors[i]?.moves}>
                                    <InputLabel shrink>Number of Moves</InputLabel>
                                    <OutlinedInput
                                        value={`${item.moves || ''}`}
                                        onChange={(e) => onChangeNumMoves(i, e.target.value)}
                                        inputProps={{
                                            step: 1,
                                            min: 1,
                                            type: 'number',
                                            style: { width: '100%' },
                                        }}
                                        label='Number of Moves'
                                        placeholder={i ? 'Rest of Game' : 'Entire Game'}
                                        notched
                                    />
                                    <FormHelperText>{errors[i]?.moves}</FormHelperText>
                                </FormControl>

                                <TimeField
                                    label={`${i ? 'Additional Time' : 'Initial Time'} (hh:mm:ss)`}
                                    format='HH:mm:ss'
                                    value={
                                        convertSecondsToDateTime(item.seconds) || defaultDateTime
                                    }
                                    onChange={(value) => onChangeInitialTime(i, value)}
                                    fullWidth
                                    sx={{ mt: 3, mb: 3 }}
                                    slotProps={{
                                        textField: {
                                            error: !!errors[i]?.initialTime,
                                            helperText: errors[i]?.initialTime,
                                        },
                                    }}
                                />

                                <TextField
                                    label='Bonus Time (Sec)'
                                    value={getBonus(item)}
                                    onChange={(e) => onChangeBonusTime(i, e.target.value)}
                                    fullWidth
                                    sx={{ mb: 3 }}
                                    error={!!errors[i]?.bonusTime}
                                    helperText={errors[i]?.bonusTime}
                                />

                                <FormControl>
                                    <FormLabel>Bonus Type</FormLabel>
                                    <RadioGroup
                                        row
                                        value={getBonusType(item)}
                                        onChange={(_, value) => onChangeBonusType(i, value)}
                                    >
                                        <FormControlLabel
                                            value='increment'
                                            control={<Radio />}
                                            label='Increment'
                                        />
                                        <FormControlLabel
                                            value='delay'
                                            control={<Radio />}
                                            label='Delay'
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </Stack>

                            <Tooltip title='Delete time control'>
                                <span>
                                    <IconButton
                                        disabled={timeControls.length <= 1}
                                        onClick={() => onDeleteTimeControl(i)}
                                    >
                                        <Delete />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    ))}

                    <Divider sx={{ my: 3 }} />

                    <Button
                        sx={{ alignSelf: 'start' }}
                        startIcon={<Add />}
                        onClick={onAddTimeControl}
                    >
                        Add Time Control
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave}>Update</Button>
            </DialogActions>
        </Dialog>
    );
}

export function TimeControlGridEditor(props: GridRenderEditCellParams<TagRow, TimeControlHeader>) {
    const { id, field, value } = props;
    const apiRef = useGridApiContext();

    const onClose = () => {
        apiRef.current.stopCellEditMode({ id, field, ignoreModifications: true });
    };

    const onSuccess = async (value: string) => {
        await apiRef.current.setEditCellValue({ id, field, value });
        apiRef.current.stopCellEditMode({ id, field });
    };

    return (
        <TimeControlEditor
            open
            initialItems={value?.items}
            onCancel={onClose}
            onSuccess={onSuccess}
        />
    );
}

enum TimeControlKind {
    /** The time control is unknown. */
    Unknown = 'unknown',
    /** There was unlimited time for the time control. */
    Unlimited = 'unlimited',
    /** The time control specifies a certain amount of time for a certain number of moves. */
    MovesInSeconds = 'movesInSeconds',
    /** The time control specifies a certain amount of time plus an increment for a certain number of moves. */
    MovesInSecondsWithIncrement = 'movesInSecondsIncrement',
    /** The time control specifies a certain amount of time plus a delay for a certain number of moves. */
    MovesInSecondsWithDelay = 'movesInSecondsDelay',
    /** The time control specifies a starting amount of time plus an increment. */
    SecondsWithIncrement = 'increment',
    /** The time control specifies a starting amount of time plus a delay. */
    SecondsWithDelay = 'delay',
    /** The time control specifies a single amount of time in the period. */
    SuddenDeath = 'suddenDeath',
    /** The time control specifies an hourglass type control. */
    Hourglass = 'hourglass',
}

function getBonus(timeControl: TimeControl): string {
    switch (timeControl.kind) {
        case TimeControlKind.MovesInSecondsWithDelay:
        case TimeControlKind.SecondsWithDelay:
            return `${timeControl.delay || 0}`;

        case TimeControlKind.MovesInSecondsWithIncrement:
        case TimeControlKind.SecondsWithIncrement:
            return `${timeControl.increment || 0}`;

        default:
            return '0';
    }
}

function getBonusType(timeControl: TimeControl): 'increment' | 'delay' {
    switch (timeControl.kind) {
        case TimeControlKind.MovesInSecondsWithDelay:
        case TimeControlKind.SecondsWithDelay:
            return 'delay';

        default:
            return 'increment';
    }
}

interface TimeControlError {
    moves?: string;
    initialTime?: string;
    bonusTime?: string;
}

type TimeControlErrors = Record<number, TimeControlError>;

function validateTimeControls(timeControls: TimeControl[]): TimeControlErrors {
    const errors: Record<number, TimeControlError> = {};

    timeControls.forEach((timeControl, i) => {
        if (isNaN(timeControl.moves || 0) || (timeControl.moves ?? 0) < 0) {
            errors[i] = {
                ...errors[i],
                moves: 'Number of moves must be a non-negative integer',
            };
        } else if (i + 1 < timeControls.length && !timeControl.moves) {
            errors[i] = {
                ...errors[i],
                moves: 'Number of moves must be specified if not the last time control',
            };
        }

        if (i === 0 && !timeControl.seconds) {
            errors[i] = {
                ...errors[i],
                initialTime: 'First time control must specify a non-zero amount of initial time',
            };
        }

        if (i > 0 && !timeControl.seconds && !timeControl.increment && !timeControl.delay) {
            errors[i] = {
                ...errors[i],
                initialTime: 'Time control must specify either additional time or bonus time',
                bonusTime: 'Time control must specify either additional time or bonus time',
            };
        }

        if (
            isNaN(timeControl.delay || 0) ||
            isNaN(timeControl.increment || 0) ||
            (timeControl.delay ?? 0) < 0 ||
            (timeControl.increment ?? 0) < 0
        ) {
            errors[i] = {
                ...errors[i],
                bonusTime: 'Bonus time must be a non-negative integer',
            };
        }
    });

    return errors;
}

function getTimeControlValue(timeControl: TimeControl): string {
    let result = '';
    if (timeControl.moves) {
        result += `${timeControl.moves}/`;
    }
    result += `${timeControl.seconds || 0}`;
    if (timeControl.increment) {
        result += `+${timeControl.increment}`;
    } else if (timeControl.delay) {
        result += `d${timeControl.delay}`;
    }
    return result;
}
