import { useAuth } from '@/auth/Auth';
import { ZoomOutMap } from '@mui/icons-material';
import { IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';

/**
 * The field of the TimelineEntry displayed by the heatmap.
 */
export type TimelineEntryField = 'dojoPoints' | 'minutesSpent';

/**
 * The color mode of the heatmap.
 */
export type HeatmapColorMode = 'standard' | 'monochrome';

const heatmapField = {
    key: 'activityHeatmap.field',
    default: 'minutesSpent',
} as const;

const heatmapMaxPoints = {
    key: 'activityHeatmap.maxPoints',
    default: 1,
} as const;

const heatmapMaxMinutes = {
    key: 'activityHeatmap.maxMinutes',
    default: 60,
} as const;

const heatmapColorMode = {
    key: 'activityHeatmap.colorMode',
    default: 'standard',
} as const;

/**
 * @returns Current options and setters for the Heatmap.
 */
export function useHeatmapOptions() {
    const { user } = useAuth();
    const [field, setField] = useLocalStorage<TimelineEntryField>(
        heatmapField.key,
        heatmapField.default,
    );
    const [maxPoints, setMaxPoints] = useLocalStorage<number>(
        heatmapMaxPoints.key,
        heatmapMaxPoints.default,
    );
    const [maxMinutes, setMaxMinutes] = useLocalStorage<number>(
        heatmapMaxMinutes.key,
        heatmapMaxMinutes.default,
    );
    const [colorMode, setColorMode] = useLocalStorage<HeatmapColorMode>(
        heatmapColorMode.key,
        heatmapColorMode.default,
    );
    const [originalWeekStartOn] = useLocalStorage('calendarFilters.weekStartOn', 0);

    const weekStartOn = user?.weekStart ?? originalWeekStartOn;
    const weekEndOn = (weekStartOn + 6) % 7;

    return {
        field,
        setField,
        maxPoints,
        setMaxPoints,
        maxMinutes,
        setMaxMinutes,
        colorMode,
        setColorMode,
        weekStartOn,
        weekEndOn,
    };
}

/**
 * Renders options for the heatmap.
 */
export function HeatmapOptions({ onPopOut }: { onPopOut?: () => void }) {
    const { field, setField, maxPoints, setMaxPoints, maxMinutes, setMaxMinutes } =
        useHeatmapOptions();
    const t = useTranslations('profile.info');

    return (
        <Stack
            direction='row'
            mb={3}
            alignItems='center'
            flexWrap='wrap'
            justifyContent='space-between'
        >
            <Stack direction='row' gap={2} alignItems='center' flexWrap='wrap' flexGrow={1}>
                <TextField
                    label={t('type')}
                    size='small'
                    select
                    value={field}
                    onChange={(e) => setField(e.target.value as TimelineEntryField)}
                    sx={{ ml: -0.6 }}
                >
                    <MenuItem value='dojoPoints'>{t('dojoPoints')}</MenuItem>
                    <MenuItem value='minutesSpent'>{t('hoursWorked')}</MenuItem>
                </TextField>
                <TextField
                    label={t('goal')}
                    size='small'
                    select
                    value={field === 'dojoPoints' ? maxPoints : maxMinutes / 60}
                    onChange={(e) =>
                        field === 'dojoPoints'
                            ? setMaxPoints(Number(e.target.value))
                            : setMaxMinutes(Number(e.target.value) * 60)
                    }
                >
                    {[1, 2, 3, 4].map((value) => (
                        <MenuItem key={value} value={value}>
                            {field === 'dojoPoints'
                                ? t('goalPoints', { value })
                                : t('goalHours', { value })}
                        </MenuItem>
                    ))}
                </TextField>
            </Stack>

            {onPopOut && (
                <Tooltip title={t('popOutView')}>
                    <IconButton color='primary' onClick={onPopOut}>
                        <ZoomOutMap />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
}
