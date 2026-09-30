import { useAuth } from '@/auth/Auth';
import { Settings, ZoomOutMap } from '@mui/icons-material';
import {
    Checkbox,
    FormControlLabel,
    IconButton,
    MenuItem,
    Popover,
    Stack,
    TextField,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
 * Renders a settings button for the heatmap. The options it opens (what to measure,
 * the daily goal that sets the colour scale, and single-colour mode) are rarely
 * changed, so they stay out of the way until asked for.
 */
export function HeatmapSettingsButton() {
    const {
        field,
        setField,
        maxPoints,
        setMaxPoints,
        maxMinutes,
        setMaxMinutes,
        colorMode,
        setColorMode,
    } = useHeatmapOptions();
    const t = useTranslations('profile.info');
    const tHeatmap = useTranslations('profile.info.heatmap');
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    return (
        <>
            <Tooltip title={tHeatmap('settings')}>
                <IconButton
                    size='small'
                    aria-label={tHeatmap('settings')}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ color: 'text.secondary' }}
                    data-testid='heatmap-settings-button'
                >
                    <Settings fontSize='small' />
                </IconButton>
            </Tooltip>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Stack spacing={2} sx={{ p: 2, minWidth: 220 }} data-testid='heatmap-settings'>
                    <TextField
                        label={t('type')}
                        size='small'
                        select
                        value={field}
                        onChange={(e) => setField(e.target.value as TimelineEntryField)}
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
                    <FormControlLabel
                        control={
                            <Checkbox
                                size='small'
                                checked={colorMode === 'monochrome'}
                                onChange={(e) =>
                                    setColorMode(e.target.checked ? 'monochrome' : 'standard')
                                }
                            />
                        }
                        label={tHeatmap('singleColorMode')}
                        slotProps={{ typography: { variant: 'body2' } }}
                    />
                </Stack>
            </Popover>
        </>
    );
}

/** Renders a button that opens the heatmap in a larger view. */
export function HeatmapPopOutButton({ onPopOut }: { onPopOut: () => void }) {
    const t = useTranslations('profile.info');
    return (
        <Tooltip title={t('popOutView')}>
            <IconButton
                size='small'
                aria-label={t('popOutView')}
                onClick={onPopOut}
                sx={{ color: 'text.secondary' }}
            >
                <ZoomOutMap fontSize='small' />
            </IconButton>
        </Tooltip>
    );
}
