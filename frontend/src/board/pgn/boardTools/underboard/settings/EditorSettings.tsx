import { UnsavedGameBanner } from '@/components/games/edit/UnsavedGameBanner';
import useGame from '@/context/useGame';
import {
    FormGroup,
    FormLabel,
    MenuItem,
    Slider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useLocalStorage } from 'usehooks-ts';

export const ClockFieldFormatKey = 'clockFieldFormat';

export enum ClockFieldFormat {
    SingleField = 'SINGLE_FIELD',
    ThreeField = 'THREE_FIELD',
    SingleFieldInTotalMinutes = 'SINGLE_FIELD_IN_TOTAL_MINUTES',
}

export const WarnBeforeDelete = {
    key: 'pgn-editor/warn-before-delete',
    default: 8,
} as const;

const EditorSettings = () => {
    const [clockFieldFormat, setClockFieldFormat] = useLocalStorage<string>(
        ClockFieldFormatKey,
        ClockFieldFormat.SingleField,
    );

    const { unsaved } = useGame();
    const [warnBeforeDelete, setWarnBeforeDelete] = useLocalStorage<number>(
        WarnBeforeDelete.key,
        WarnBeforeDelete.default,
    );

    return (
        <Stack spacing={3}>
            {unsaved && <UnsavedGameBanner />}
            <Typography variant='h5'>Editor Settings</Typography>
            <TextField
                select
                label='Clock Field Format'
                value={clockFieldFormat}
                onChange={(e) => setClockFieldFormat(e.target.value)}
            >
                <MenuItem value={ClockFieldFormat.SingleField}>Single Field</MenuItem>
                <MenuItem value={ClockFieldFormat.ThreeField}>Three Fields</MenuItem>
                <MenuItem value={ClockFieldFormat.SingleFieldInTotalMinutes}>
                    Total Minutes
                </MenuItem>
            </TextField>

            <FormGroup sx={{ px: 1 }}>
                <FormLabel>Warn Before Deleting {warnBeforeDelete} or More Moves</FormLabel>
                <Slider
                    value={warnBeforeDelete}
                    onChange={(_, value) => setWarnBeforeDelete(value)}
                    step={1}
                    min={1}
                    max={30}
                    valueLabelFormat={(value) => {
                        return value;
                    }}
                    valueLabelDisplay='auto'
                />
            </FormGroup>
        </Stack>
    );
};

export default EditorSettings;
