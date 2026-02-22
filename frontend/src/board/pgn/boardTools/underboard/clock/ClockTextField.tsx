import { BlockBoardKeyboardShortcuts, useChess } from '@/board/pgn/PgnBoard';
import { Chess, Move } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import { Stack, TextField } from '@mui/material';
import { TimeField } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useLocalStorage } from 'usehooks-ts';
import { ClockFieldFormat, ClockFieldFormatKey } from '../settings/EditorSettings';
import { convertSecondsToDateTime, onChangeClock } from './ClockEditor';
import { formatTime } from './ClockUsage';

const d = new Date();
d.setHours(0, 0, 0);

const defaultDateTime = DateTime.fromJSDate(d);

interface ClockTextFieldProps {
    move: Move;
    label?: string;
    forceSingleField?: boolean;
}

const ClockTextField: React.FC<ClockTextFieldProps> = ({ move, label, forceSingleField }) => {
    const { chess } = useChess();
    const [clockFieldFormat] = useLocalStorage<string>(
        ClockFieldFormatKey,
        ClockFieldFormat.SingleField,
    );

    if (!chess) {
        return null;
    }

    if (clockFieldFormat === ClockFieldFormat.SingleFieldInTotalMinutes) {
        const seconds = clockToSeconds(move.commentDiag?.clk) || 0;
        const displayValue = seconds > 0 ? String(Math.floor(seconds / 60)) : '';

        return (
            <TextField
                id={BlockBoardKeyboardShortcuts}
                label={label}
                placeholder='Total minutes'
                value={displayValue}
                disabled={!move}
                onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === '') {
                        chess.setCommand('clk', formatTime(0), move);
                        return;
                    }
                    let minutes = parseInt(raw);
                    if (isNaN(minutes) || minutes < 0) {
                        return;
                    }
                    if (minutes > 999) {
                        minutes = 999;
                    }
                    chess.setCommand('clk', formatTime(minutes * 60), move);
                }}
                fullWidth
                className={BlockBoardKeyboardShortcuts}
                slotProps={{
                    htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                }}
            />
        );
    }

    if (clockFieldFormat === ClockFieldFormat.SingleField || forceSingleField) {
        return (
            <TimeField
                id={BlockBoardKeyboardShortcuts}
                label={label}
                format='HH:mm:ss'
                value={
                    convertSecondsToDateTime(clockToSeconds(move.commentDiag?.clk)) ||
                    defaultDateTime
                }
                onChange={(value) => onChangeClock(chess, move, value)}
                fullWidth
                className={BlockBoardKeyboardShortcuts}
            />
        );
    }

    if (clockFieldFormat === ClockFieldFormat.ThreeField) {
        const timeSlots = getTimeSlotsFromMove(move);

        return (
            <Stack direction='row' spacing={1}>
                <TextField
                    label='Hours'
                    id={BlockBoardKeyboardShortcuts}
                    value={timeSlots.hours}
                    disabled={!move}
                    onChange={(event) =>
                        onChangeTimeSlot('hours', event.target.value, timeSlots, chess, move)
                    }
                    fullWidth
                />
                <TextField
                    label='Minutes'
                    id={BlockBoardKeyboardShortcuts}
                    value={timeSlots.minutes}
                    disabled={!move}
                    onChange={(event) =>
                        onChangeTimeSlot('minutes', event.target.value, timeSlots, chess, move)
                    }
                    fullWidth
                />
                <TextField
                    label='Seconds'
                    id={BlockBoardKeyboardShortcuts}
                    value={timeSlots.seconds}
                    disabled={!move}
                    onChange={(event) =>
                        onChangeTimeSlot('seconds', event.target.value, timeSlots, chess, move)
                    }
                    fullWidth
                />
            </Stack>
        );
    }

    return null;
};

export default ClockTextField;

interface TimeSlots {
    hours: number;
    minutes: number;
    seconds: number;
}

function getTimeSlotsFromMove(move: Move): TimeSlots {
    const clock = move.commentDiag?.clk;
    if (!clock) {
        return { hours: 0, minutes: 0, seconds: 0 };
    }

    const slots = clock.split(':');
    const seconds = parseFloat(slots[slots.length - 1] || '0');
    const minutes = parseInt(slots[slots.length - 2] || '0');
    const hours = parseInt(slots[slots.length - 3] || '0');

    return {
        hours,
        minutes,
        seconds,
    };
}

function onChangeTimeSlot(
    slot: 'hours' | 'minutes' | 'seconds',
    value: string,
    timeSlots: TimeSlots,
    chess: Chess,
    move: Move,
) {
    let numValue = slot === 'seconds' ? parseFloat(value) : parseInt(value);
    if (isNaN(numValue) || numValue < 0) {
        numValue = 0;
    }

    const newSlots: TimeSlots = {
        ...timeSlots,
        [slot]: numValue,
    };

    chess.setCommand('clk', getClockFromTimeSlots(newSlots), move);
}

function getClockFromTimeSlots(slots: TimeSlots): string {
    const seconds = slots.seconds % 60;
    let minutes = slots.minutes + Math.floor(slots.seconds / 60);
    const hours = slots.hours + Math.floor(minutes / 60);
    minutes = minutes % 60;

    return formatTime(hours * 3600 + minutes * 60 + seconds);
}
