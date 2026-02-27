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
import { LoadingButton } from '@mui/lab';
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
    const request = useRequest();
    const api = useApi();
    const { user } = useAuth();
    const { resetRequest: resetTimeline } = useTimelineContext();

    const [category, setCategory] = useState(task?.category ?? initialCategory);
    const [name, setName] = useState(task?.name ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [cohorts, setCohorts] = useState([ALL_COHORTS]);
    const [startCount, setStartCount] = useState(
        task?.scoreboardDisplay === ScoreboardDisplay.NonDojo
            ? ''
            : `${Object.values(task?.startCount || {})[0] || ''}`,
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
            newErrors.name = 'This field is required and must be non-empty';
        }
        if (cohorts.length === 0) {
            newErrors.cohorts = 'At least one cohort is required';
        }
        const startCountInt = parseInt(startCount || '0');
        if (isNaN(startCountInt) || startCountInt < 0) {
            newErrors.startCount = 'Must be a positive integer or empty';
        }
        const countInt = parseInt(count || '0');
        if (isNaN(countInt) || countInt < 0) {
            newErrors.count = 'Must be a positive integer or empty';
        }
        if (startCountInt > 0 && startCountInt >= countInt) {
            newErrors.startCount = 'Must be less than Goal';
        }
        if (countType === OTHER_COUNT_TYPE && otherType.trim() === '') {
            newErrors.otherType = 'This field is required';
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

    const title = task ? `Update ${task.name}?` : `Create Custom Task?`;

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
                        label='Category'
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
                        label='Task Name'
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        fullWidth
                    />

                    <TextField
                        label='Description (Optional)'
                        multiline
                        minRows={3}
                        maxRows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                    />

                    <CohortSelect
                        multiple
                        label='Cohorts'
                        selected={cohorts}
                        setSelected={setCohorts}
                        error={!!errors.cohorts}
                        helperText={
                            errors.cohorts ||
                            'Your time will be tracked individually across each cohort'
                        }
                    />

                    <TextField
                        label='Starting Point (Optional)'
                        value={startCount}
                        onChange={(e) => setStartCount(e.target.value)}
                        fullWidth
                        error={!!errors.startCount}
                        helperText={
                            errors.startCount ||
                            'Where you want to start for this task. Leave blank if you are only tracking time in this task.'
                        }
                    />

                    <TextField
                        label='Goal (Optional)'
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        fullWidth
                        error={!!errors.count}
                        helperText={
                            errors.count ||
                            'The final target you want to reach. Leave blank if you are only tracking time in this task.'
                        }
                    />

                    <TextField
                        select
                        label='Goal Type'
                        value={countType}
                        onChange={(e) => setCountType(e.target.value)}
                        fullWidth
                    >
                        <MenuItem value=''>None</MenuItem>
                        <MenuItem value='Chapters'>Chapters</MenuItem>
                        <MenuItem value='Exercises'>Exercises</MenuItem>
                        <MenuItem value='Games'>Games</MenuItem>
                        <MenuItem value='Minutes'>Minutes</MenuItem>
                        <MenuItem value='Pages'>Pages</MenuItem>
                        <MenuItem value='Problems'>Problems</MenuItem>
                        <MenuItem value='Other'>Other</MenuItem>
                    </TextField>

                    {countType === 'Other' && (
                        <TextField
                            label='Other Goal Type'
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
                        label='Reset count to 0 when switching cohorts'
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={request.isLoading()}>
                    Cancel
                </Button>

                <LoadingButton loading={request.isLoading()} onClick={onCreate}>
                    {task ? 'Update' : 'Create'}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};

export default CustomTaskEditor;
