import { BlockBoardKeyboardShortcuts, useChess } from '@/board/pgn/PgnBoard';
import { Chess, Move } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import { FormHelperText, Stack, TextField } from '@mui/material';
import { TimeField } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useRef } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { ClockFieldFormat, ClockFieldFormatKey } from '../settings/EditorSettings';
import { convertSecondsToDateTime, onChangeClock } from './ClockEditor';
import { formatTime } from './ClockUsage';

const d = new Date();
d.setHours(0, 0, 0);

const defaultDateTime = DateTime.fromJSDate(d);
const hasClockError = (seconds: number, maxSeconds?: number): boolean => {
    if (maxSeconds === undefined) return false;
    const effectiveMax = seconds % 60 === 0 ? maxSeconds + 59 : maxSeconds;
    return seconds > effectiveMax;
};

interface ClockTextFieldProps {
    move: Move;
    label?: string;
    /**
     * The maximum time in seconds this move's clock can have, based on the time control.
     * If not undefined, it will be used to validate the user's input.
     */
    maxSeconds?: number;
}

const ClockTextField = ({ move, label, maxSeconds }: ClockTextFieldProps) => {
    const { chess } = useChess();
    const [clockFieldFormat] = useLocalStorage<string>(
        ClockFieldFormatKey,
        ClockFieldFormat.SingleField,
    );

    const hoursRef = useRef<HTMLInputElement>(null);
    const minutesRef = useRef<HTMLInputElement>(null);
    const secondsRef = useRef<HTMLInputElement>(null);
    const hoursRedirected = useRef(false);

    if (!chess) {
        return null;
    }

    if (clockFieldFormat === ClockFieldFormat.SingleFieldInTotalMinutes) {
        const seconds = clockToSeconds(move.commentDiag?.clk) || 0;
        const displayValue = seconds > 0 ? String(Math.floor(seconds / 60)) : '';
        const error = hasClockError(seconds, maxSeconds);
        return (
            <TextField
                id={BlockBoardKeyboardShortcuts}
                label={label || 'Clock (total minutes)'}
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
                error={error}
                helperText={
                    error ? 'Gained more time than possible according to time control' : undefined
                }
            />
        );
    }

    if (clockFieldFormat === ClockFieldFormat.SingleField) {
        const seconds = clockToSeconds(move.commentDiag?.clk) ?? 0;
        const error = hasClockError(seconds, maxSeconds);
        return (
            <TimeField
                id={BlockBoardKeyboardShortcuts}
                label={label || 'Clock (hh:mm:ss)'}
                format='HH:mm:ss'
                value={convertSecondsToDateTime(seconds) || defaultDateTime}
                onChange={(value) => onChangeClock(chess, move, value)}
                fullWidth
                className={BlockBoardKeyboardShortcuts}
                error={error}
                helperText={
                    error ? 'Gained more time than possible according to time control' : undefined
                }
            />
        );
    }

    if (clockFieldFormat === ClockFieldFormat.ThreeField) {
        const timeSlots = getTimeSlotsFromMove(move);
        const seconds = timeSlots.hours * 3600 + timeSlots.minutes * 60 + timeSlots.seconds;
        const error = hasClockError(seconds, maxSeconds);
        const shouldAutoFocusMinutes = maxSeconds !== undefined && maxSeconds < 3600;

        const handleHoursFocus = () => {
            if (shouldAutoFocusMinutes && !hoursRedirected.current) {
                hoursRedirected.current = true;
                requestAnimationFrame(() => {
                    minutesRef.current?.focus();
                    minutesRef.current?.select();
                });
            }
        };

        const handleKeyDown = (
            e: React.KeyboardEvent<HTMLInputElement>,
            currentField: 'hours' | 'minutes' | 'seconds',
        ) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (currentField === 'hours') {
                    minutesRef.current?.focus();
                    minutesRef.current?.select();
                } else if (currentField === 'minutes') {
                    secondsRef.current?.focus();
                    secondsRef.current?.select();
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentField === 'seconds') {
                    minutesRef.current?.focus();
                    minutesRef.current?.select();
                } else if (currentField === 'minutes') {
                    hoursRef.current?.focus();
                    hoursRef.current?.select();
                }
            }
        };

        return (
            <Stack>
                <Stack direction='row' spacing={1}>
                    <TextField
                        label='Hours'
                        id={BlockBoardKeyboardShortcuts}
                        value={timeSlots.hours}
                        disabled={!move}
                        error={error}
                        onChange={(event) =>
                            onChangeTimeSlot('hours', event.target.value, timeSlots, chess, move)
                        }
                        onKeyDown={(e) =>
                            handleKeyDown(e as React.KeyboardEvent<HTMLInputElement>, 'hours')
                        }
                        onFocus={handleHoursFocus}
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                ref: hoursRef,
                                'data-testid': 'clock-hours-field',
                            },
                        }}
                    />
                    <TextField
                        label='Minutes'
                        id={BlockBoardKeyboardShortcuts}
                        value={timeSlots.minutes}
                        disabled={!move}
                        error={error}
                        onChange={(event) =>
                            onChangeTimeSlot('minutes', event.target.value, timeSlots, chess, move)
                        }
                        onKeyDown={(e) =>
                            handleKeyDown(e as React.KeyboardEvent<HTMLInputElement>, 'minutes')
                        }
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                ref: minutesRef,
                                'data-testid': 'clock-minutes-field',
                            },
                        }}
                    />
                    <TextField
                        label='Seconds'
                        id={BlockBoardKeyboardShortcuts}
                        value={timeSlots.seconds}
                        disabled={!move}
                        error={error}
                        onChange={(event) =>
                            onChangeTimeSlot('seconds', event.target.value, timeSlots, chess, move)
                        }
                        onKeyDown={(e) =>
                            handleKeyDown(e as React.KeyboardEvent<HTMLInputElement>, 'seconds')
                        }
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                ref: secondsRef,
                                'data-testid': 'clock-seconds-field',
                            },
                        }}
                    />
                </Stack>
                {error && (
                    <FormHelperText error>
                        Gained more time than possible according to time control
                    </FormHelperText>
                )}
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
