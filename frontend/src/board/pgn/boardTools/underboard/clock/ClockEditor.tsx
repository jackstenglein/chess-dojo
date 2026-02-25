import { useChess } from '@/board/pgn/PgnBoard';
import { Chess, Move } from '@jackstenglein/chess';
import { Edit } from '@mui/icons-material';
import { Grid, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DateTime } from 'luxon';
import { useLocalStorage } from 'usehooks-ts';
import { ClockFieldFormat, ClockFieldFormatKey } from '../settings/EditorSettings';
import ClockTextField from './ClockTextField';
import { formatTime } from './ClockUsage';
import { TimeControlDescription } from './TimeControlDescription';

export function convertSecondsToDateTime(seconds: number | undefined): DateTime | null {
    if (!seconds) {
        return null;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const sec = Math.floor((seconds % 3600) % 60);
    const date = new Date();
    date.setHours(hours, minutes, sec);
    return DateTime.fromJSDate(date);
}

function convertDateTimeToClock(date: DateTime | null): string {
    if (!date?.isValid) {
        return '';
    }
    return formatTime(date.hour * 3600 + date.minute * 60 + date.second);
}

export function onChangeClock(chess: Chess, move: Move, value: DateTime | null) {
    const clk = convertDateTimeToClock(value);
    chess.setCommand('clk', clk, move);
}

const ClockEditor = ({
    setShowTimeControlEditor,
}: {
    setShowTimeControlEditor: (v: boolean) => void;
}) => {
    const { chess } = useChess();
    const [clockFieldFormat, setClockFieldFormat] = useLocalStorage<string>(
        ClockFieldFormatKey,
        ClockFieldFormat.SingleField,
    );

    if (!chess) {
        return null;
    }

    const moves = chess.history();
    const grid = [];
    const isThreeField = clockFieldFormat === ClockFieldFormat.ThreeField;

    for (let i = 0; i < moves.length; i += 2) {
        if (isThreeField) {
            grid.push(
                <Grid key={`${i}-white-label`} size={3}>
                    <Typography>
                        {i / 2 + 1}. {moves[i].san}
                    </Typography>
                </Grid>,
            );
        }

        grid.push(
            <Grid key={`${i}-white`} size={isThreeField ? 9 : 6}>
                <ClockTextField label={`${i / 2 + 1}. ${moves[i].san}`} move={moves[i]} />
            </Grid>,
        );

        if (moves[i + 1]) {
            if (isThreeField) {
                grid.push(
                    <Grid key={`${i}-black-label`} size={3}>
                        <Typography>
                            {i / 2 + 1}... {moves[i + 1].san}
                        </Typography>
                    </Grid>,
                );
            }

            grid.push(
                <Grid key={`${i}-black`} size={isThreeField ? 9 : 6}>
                    <ClockTextField
                        label={`${i / 2 + 1}... ${moves[i + 1].san}`}
                        move={moves[i + 1]}
                    />
                </Grid>,
            );
        }
    }

    return (
        <Grid container columnSpacing={1} rowGap={3} alignItems='center' pb={2}>
            <Grid size={12}>
                <Stack direction='row' alignItems='center' spacing={0.5}>
                    <Typography variant='subtitle1'>Time Control</Typography>

                    <Tooltip title='Edit time control'>
                        <IconButton
                            size='small'
                            sx={{ position: 'relative', top: '-2px' }}
                            onClick={() => setShowTimeControlEditor(true)}
                        >
                            <Edit fontSize='inherit' />
                        </IconButton>
                    </Tooltip>
                </Stack>
                <TimeControlDescription
                    timeControls={chess.header().tags.TimeControl?.items || []}
                />
            </Grid>
            <Grid pb={1} size={12}>
                <Typography component='p' variant='caption' textAlign='center'>
                    Set remaining clock time after each move below.
                    <br />
                    Moves left blank will use the last-set clock time.
                </Typography>
            </Grid>

            <Grid pb={1} size={12}>
                <TextField
                    select
                    label='Clock Field Format'
                    value={clockFieldFormat}
                    onChange={(e) => setClockFieldFormat(e.target.value)}
                    fullWidth
                >
                    <MenuItem value={ClockFieldFormat.SingleField}>Single Field</MenuItem>
                    <MenuItem value={ClockFieldFormat.ThreeField}>Three Fields</MenuItem>
                    <MenuItem value={ClockFieldFormat.SingleFieldInTotalMinutes}>
                        Total Minutes
                    </MenuItem>
                </TextField>
            </Grid>
            {grid}
        </Grid>
    );
};

export default ClockEditor;
