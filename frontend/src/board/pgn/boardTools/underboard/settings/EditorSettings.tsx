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
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('analysisBoard.underboard.settings');
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
            <Typography variant='h5'>{t('editorSettingsTitle')}</Typography>
            <TextField
                select
                label={t('clockFieldFormatLabel')}
                value={clockFieldFormat}
                onChange={(e) => setClockFieldFormat(e.target.value)}
            >
                <MenuItem value={ClockFieldFormat.SingleField}>
                    {t('clockFieldFormatSingleField')}
                </MenuItem>
                <MenuItem value={ClockFieldFormat.ThreeField}>
                    {t('clockFieldFormatThreeFields')}
                </MenuItem>
                <MenuItem value={ClockFieldFormat.SingleFieldInTotalMinutes}>
                    {t('clockFieldFormatTotalMinutes')}
                </MenuItem>
            </TextField>

            <FormGroup sx={{ px: 1 }}>
                <FormLabel>
                    {t('warnBeforeDeletingLabel', { threshold: warnBeforeDelete })}
                </FormLabel>
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
