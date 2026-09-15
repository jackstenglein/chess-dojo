import { useAuth } from '@/auth/Auth';
import { CustomTask, Requirement, ScoreboardDisplay } from '@/database/requirement';
import { ALL_COHORTS, compareCohorts, dojoCohorts, TimeFormat } from '@/database/user';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Box,
    Chip,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useState } from 'react';
import { type HistoryItem, type HistoryItemError } from './progressHistoryEditor';

interface ProgressHistoryItemProps {
    requirement: Requirement | CustomTask;
    item: HistoryItem;
    error: HistoryItemError;
    itemIndex: number;
    updateItem: (index: number, item: HistoryItem) => void;
    updateDraftItem: (index: number, item: HistoryItem) => void;
    deleteItem: (index: number) => void;
}

export const ProgressHistoryItem = memo(function ProgressHistoryItem({
    requirement,
    item,
    error,
    itemIndex,
    updateItem,
    updateDraftItem,
    deleteItem,
}: ProgressHistoryItemProps) {
    const t = useTranslations('profile.trainingPlan.progressHistory');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const { user } = useAuth();
    const [draftItem, setDraftItem] = useState(item);

    useEffect(() => {
        setDraftItem(item);
    }, [item]);

    const updateDraft = useCallback(
        (
            key: 'date' | 'count' | 'hours' | 'minutes' | 'notes' | 'cohort',
            value: string | DateTime | null,
        ) => {
            setDraftItem((item) => {
                const updatedItem = { ...item, [key]: value };
                updateDraftItem(itemIndex, updatedItem);
                return updatedItem;
            });
        },
        [itemIndex, updateDraftItem],
    );

    const updateAndCommit = (
        key: 'date' | 'count' | 'hours' | 'minutes' | 'notes' | 'cohort',
        value: string | DateTime | null,
    ) => {
        const updatedItem = { ...draftItem, [key]: value };
        setDraftItem(updatedItem);
        updateItem(itemIndex, updatedItem);
    };

    const commitDraft = () => {
        updateItem(itemIndex, draftItem);
    };

    if (item.deleted) {
        return null;
    }

    const cohortOptions = requirement.counts[ALL_COHORTS]
        ? dojoCohorts
        : Object.keys(requirement.counts).sort(compareCohorts);

    const isTimeOnly =
        draftItem.entry.scoreboardDisplay === ScoreboardDisplay.NonDojo ||
        draftItem.entry.scoreboardDisplay === ScoreboardDisplay.Minutes;
    const useTwelveHourClock = user?.timeFormat !== TimeFormat.TwentyFourHour;

    const rawSuffix = requirement.progressBarSuffix?.trim();
    const countLabel = rawSuffix ? rawSuffix.charAt(0).toUpperCase() + rawSuffix.slice(1) : 'Count';

    return (
        <Box sx={{ pb: 3 }}>
            <Stack
                direction='row'
                spacing={{ sm: 1 }}
                sx={{
                    width: 1,
                    alignItems: 'center',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    rowGap: 2,
                }}
            >
                <Grid
                    container
                    sx={{
                        columnGap: 2,
                        rowGap: 3,
                        alignItems: 'center',
                    }}
                >
                    {item.isNew && (
                        <Grid size={12}>
                            <Stack
                                direction='row'
                                spacing={1}
                                sx={{
                                    alignItems: 'center',
                                }}
                            >
                                <Chip
                                    label={t('newEntryLabel')}
                                    size='small'
                                    color='primary'
                                    variant='outlined'
                                />
                                <Typography
                                    variant='body2'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
                                    {t('fillInDetails')}
                                </Typography>
                            </Stack>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField
                            label={t('cohort')}
                            select
                            value={draftItem.cohort}
                            onChange={(e) => updateAndCommit('cohort', e.target.value)}
                            fullWidth
                        >
                            {cohortOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 'grow' }} sx={{ minWidth: '145px' }}>
                        <DateTimePicker
                            label={tCommon('date')}
                            value={draftItem.date}
                            onChange={(v) => updateAndCommit('date', v)}
                            slotProps={{
                                textField: {
                                    error: !!error.date,
                                    helperText: error.date,
                                    fullWidth: true,
                                },
                            }}
                            ampm={useTwelveHourClock}
                        />
                    </Grid>

                    {!isTimeOnly && (
                        <Grid size={{ xs: 12, sm: 'grow' }}>
                            <TextField
                                data-testid='task-history-count'
                                label={countLabel}
                                value={draftItem.count}
                                onChange={(event) => updateDraft('count', event.target.value)}
                                onBlur={commitDraft}
                                fullWidth
                                error={!!error.count}
                                helperText={error.count}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField
                            label={tCommon('hours')}
                            value={draftItem.hours}
                            slotProps={{
                                htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                            }}
                            onChange={(event) => updateDraft('hours', event.target.value)}
                            onBlur={commitDraft}
                            fullWidth
                            error={!!error.hours}
                            helperText={error.hours}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField
                            label={tCommon('minutes')}
                            value={draftItem.minutes}
                            slotProps={{
                                htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                            }}
                            onChange={(event) => updateDraft('minutes', event.target.value)}
                            onBlur={commitDraft}
                            fullWidth
                            error={!!error.minutes}
                            helperText={error.minutes}
                        />
                    </Grid>

                    <Grid size={12}>
                        <TextField
                            label={tCommon('comments')}
                            placeholder={tCommon('commentsPlaceholder')}
                            multiline={true}
                            maxRows={3}
                            value={draftItem.notes}
                            onChange={(e) => updateDraft('notes', e.target.value)}
                            onBlur={commitDraft}
                            fullWidth
                        />
                    </Grid>
                </Grid>

                <Tooltip title={t('deleteEntry')}>
                    <IconButton
                        data-testid='task-history-delete-button'
                        aria-label={t('deleteAriaLabel')}
                        onClick={() => deleteItem(itemIndex)}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Divider sx={{ mt: 3 }} />
        </Box>
    );
});
