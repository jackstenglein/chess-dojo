import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { CohortSelect } from '@/components/ui/CohortSelect';
import {
    CustomTask,
    CustomTaskCategory,
    isCustomTaskCategory,
    RequirementCategory,
    ScoreboardDisplay,
} from '@/database/requirement';
import { ALL_COHORTS, dojoCohorts } from '@/database/user';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const OTHER_COUNT_TYPE = 'Other';
const MINUTES_COUNT_TYPE = 'Minutes';

const DEFAULT_COUNT_TYPES = [
    '',
    'Chapters',
    'Exercises',
    'Games',
    MINUTES_COUNT_TYPE,
    'Pages',
    'Problems',
];

interface CustomTaskEditorProps {
    task?: CustomTask;
    open: boolean;
    onClose: () => void;
    initialCategory: CustomTaskCategory;
}

const CustomTaskEditor: React.FC<CustomTaskEditorProps> = ({
    task,
    open,
    onClose,
    initialCategory,
}) => {
    const t = useTranslations('profile.trainingPlan.customTask');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const request = useRequest();
    const api = useApi();
    const { user } = useAuth();
    const { resetRequest: resetTimeline } = useTimelineContext();

    const [category, setCategory] = useState(task?.category ?? initialCategory);
    const [name, setName] = useState(task?.name ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [cohorts, setCohorts] = useState([ALL_COHORTS]);
    const [startCount, setStartCount] = useState(
        task?.scoreboardDisplay === ScoreboardDisplay.NonDojo ? '' : `${task?.startCount || ''}`,
    );
    const [count, setCount] = useState(
        task?.scoreboardDisplay === ScoreboardDisplay.NonDojo
            ? ''
            : `${Object.values(task?.counts || {})[0] || ''}`,
    );

    const isOtherCountType = !DEFAULT_COUNT_TYPES.includes(task?.progressBarSuffix || '');
    const [countType, setCountType] = useState(
        isOtherCountType ? OTHER_COUNT_TYPE : task?.progressBarSuffix || '',
    );
    const [otherType, setOtherType] = useState(
        isOtherCountType ? task?.progressBarSuffix || '' : '',
    );
    const [trackCountPerCohort, setTrackCountPerCohort] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!user) {
        return null;
    }

    const onCreate = () => {
        const newErrors: Record<string, string> = {};
        if (name.trim() === '') {
            newErrors.name = t('nameRequired');
        }
        if (cohorts.length === 0) {
            newErrors.cohorts = t('cohortsRequired');
        }
        const startCountInt = Number(startCount || '0');
        if (!Number.isInteger(startCountInt) || startCountInt < 0) {
            newErrors.startCount = t('startCountPositive');
        }
        const countInt = Number(count || '0');
        if (!Number.isInteger(countInt) || countInt < 0) {
            newErrors.count = t('countPositive');
        }
        if (startCountInt > 0 && startCountInt >= countInt) {
            newErrors.startCount = t('startCountLessThanGoal');
        }
        if (countType === OTHER_COUNT_TYPE && otherType.trim() === '') {
            newErrors.otherType = t('otherTypeRequired');
        }
        setErrors(newErrors);

        if (Object.values(newErrors).length > 0) {
            return;
        }

        const includedCohorts = cohorts[0] === ALL_COHORTS ? dojoCohorts : cohorts;
        const newCounts = includedCohorts.reduce<Record<string, number>>((map, c) => {
            map[c] = countInt;
            return map;
        }, {});

        let scoreboardDisplay: ScoreboardDisplay;
        if (countInt === 0) {
            scoreboardDisplay = ScoreboardDisplay.NonDojo;
        } else if (countInt === 1) {
            scoreboardDisplay = ScoreboardDisplay.Checkbox;
        } else if (countType === MINUTES_COUNT_TYPE) {
            scoreboardDisplay = ScoreboardDisplay.Minutes;
        } else {
            scoreboardDisplay = ScoreboardDisplay.ProgressBar;
        }

        const newTask: CustomTask = {
            id: task?.id || uuidv4(),
            owner: user.username,
            name,
            description,
            startCount: startCountInt,
            counts: newCounts,
            scoreboardDisplay,
            category,
            numberOfCohorts: trackCountPerCohort ? -1 : 1,
            progressBarSuffix: countType === OTHER_COUNT_TYPE ? otherType.trim() : countType,
            updatedAt: new Date().toISOString(),
        };

        let newTasks: CustomTask[] = [];
        if (task && user.customTasks) {
            const index = user.customTasks.findIndex((t) => t.id === task.id);
            newTasks = [
                ...user.customTasks.slice(0, index),
                newTask,
                ...user.customTasks.slice(index + 1),
            ];
        } else {
            newTasks = [...(user.customTasks || []), newTask];
        }

        request.onStart();
        api.updateUser({
            customTasks: newTasks,
        })
            .then(() => {
                const eventType = task ? EventType.EditNondojoTask : EventType.CreateNondojoTask;
                trackEvent(eventType, {
                    task_id: newTask.id,
                    task_name: name,
                });
                request.onSuccess();
                if (task && task.category !== category) {
                    resetTimeline();
                }
                onClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const title = task ? t('updateTitle', { name: task.name }) : t('createTitle');

    return (
        <Dialog
            open={open}
            onClose={request.isLoading() ? undefined : onClose}
            maxWidth='md'
            fullWidth
        >
            <RequestSnackbar request={request} />

            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack gap={3} mt={2}>
                    <TextField
                        label={t('category')}
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CustomTaskCategory)}
                        fullWidth
                        select
                    >
                        {Object.values(RequirementCategory).map((c) => {
                            if (!isCustomTaskCategory(c)) {
                                return null;
                            }
                            return (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            );
                        })}
                    </TextField>

                    <TextField
                        label={t('taskName')}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        fullWidth
                        data-testid='custom-task-name-input'
                    />

                    <TextField
                        label={t('description')}
                        multiline
                        minRows={3}
                        maxRows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        data-testid='custom-task-description-input'
                    />

                    <CohortSelect
                        multiple
                        label={t('cohorts')}
                        selected={cohorts}
                        setSelected={setCohorts}
                        error={!!errors.cohorts}
                        helperText={errors.cohorts || t('cohortsHelper')}
                    />

                    <TextField
                        label={t('startingPoint')}
                        value={startCount}
                        onChange={(e) => setStartCount(e.target.value)}
                        fullWidth
                        error={!!errors.startCount}
                        helperText={errors.startCount || t('startingPointHelper')}
                        data-testid='custom-task-starting-point-input'
                    />

                    <TextField
                        label={t('goal')}
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        fullWidth
                        error={!!errors.count}
                        helperText={errors.count || t('goalHelper')}
                        data-testid='custom-task-goal-input'
                    />

                    <TextField
                        select
                        label={t('goalType')}
                        value={countType}
                        onChange={(e) => setCountType(e.target.value)}
                        fullWidth
                        data-testid='custom-task-goal-type-select'
                    >
                        <MenuItem value=''>{t('goalTypeNone')}</MenuItem>
                        <MenuItem value='Chapters'>{t('goalTypeChapters')}</MenuItem>
                        <MenuItem value='Exercises'>{t('goalTypeExercises')}</MenuItem>
                        <MenuItem value='Games'>{t('goalTypeGames')}</MenuItem>
                        <MenuItem value='Minutes'>{t('goalTypeMinutes')}</MenuItem>
                        <MenuItem value='Pages'>{t('goalTypePages')}</MenuItem>
                        <MenuItem value='Problems'>{t('goalTypeProblems')}</MenuItem>
                        <MenuItem value='Other'>{t('goalTypeOther')}</MenuItem>
                    </TextField>

                    {countType === 'Other' && (
                        <TextField
                            label={t('otherGoalType')}
                            value={otherType}
                            onChange={(e) => setOtherType(e.target.value)}
                            fullWidth
                        />
                    )}

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={trackCountPerCohort}
                                onChange={(e) => setTrackCountPerCohort(e.target.checked)}
                            />
                        }
                        label={t('resetCount')}
                        data-testid='custom-task-reset-count-checkbox'
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    disabled={request.isLoading()}
                    data-testid='custom-task-cancel-button'
                >
                    {tCommon('cancel')}
                </Button>

                <Button
                    loading={request.isLoading()}
                    onClick={onCreate}
                    data-testid='custom-task-submit-button'
                >
                    {task ? t('update') : t('create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomTaskEditor;
