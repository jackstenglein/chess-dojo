import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useOptionalTimelineContext } from '@/components/profile/activity/useTimeline';
import { CohortSelect } from '@/components/ui/CohortSelect';
import { canOpenCourse, Course, CourseType } from '@/database/course';
import {
    CustomTask,
    CustomTaskCategory,
    isCustomTaskCategory,
    RequirementCategory,
    ScoreboardDisplay,
    TaskMaterial,
} from '@/database/requirement';
import { ALL_COHORTS, dojoCohorts, User } from '@/database/user';
import {
    Directory,
    DirectoryItemTypes,
    HOME_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    ListSubheader,
    MenuItem,
    Stack,
    TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
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

/** A folder or course the task can point at, keyed by the select's value. */
interface MaterialOption {
    value: string;
    label: string;
    material: TaskMaterial;
}

function materialValue(material?: TaskMaterial): string {
    if (!material) {
        return '';
    }
    if (material.kind === 'COURSE') {
        return `course:${material.courseType}/${material.courseId}`;
    }
    return `directory:${material.owner}/${material.directoryId}`;
}

/** The subfolders of the directory, in the directory's own order. */
function folderOptions(directory: Directory): MaterialOption[] {
    return directory.itemIds.flatMap((id) => {
        const item = directory.items[id];
        if (item?.type !== DirectoryItemTypes.DIRECTORY) {
            return [];
        }
        const material: TaskMaterial = {
            kind: 'DIRECTORY',
            owner: directory.owner,
            directoryId: item.id,
        };
        return [{ value: materialValue(material), label: item.metadata.name, material }];
    });
}

/**
 * The courses the user can open, by name. Study courses are left out. They are
 * task material, not courses to the member.
 */
function courseOptions(courses: Course[], user: User): MaterialOption[] {
    return courses
        .filter((course) => course.type !== CourseType.Study && canOpenCourse(user, course))
        .sort(
            (a, b) =>
                a.name.localeCompare(b.name) ||
                a.cohortRange.localeCompare(b.cohortRange, undefined, { numeric: true }),
        )
        .map((course) => {
            const material: TaskMaterial = {
                kind: 'COURSE',
                courseType: course.type,
                courseId: course.id,
            };
            return {
                value: materialValue(material),
                label: `${course.name} (${course.cohortRange})`,
                material,
            };
        });
}

interface CustomTaskEditorProps {
    task?: CustomTask;
    open: boolean;
    onClose: () => void;
    initialCategory: CustomTaskCategory;
    /** Prefills a new task's material, for a course chosen elsewhere. Ignored when editing. */
    initialMaterial?: TaskMaterial;
    initialName?: string;
}

const CustomTaskEditor: React.FC<CustomTaskEditorProps> = ({
    task,
    open,
    onClose,
    initialCategory,
    initialMaterial,
    initialName,
}) => {
    const t = useTranslations('profile.trainingPlan.customTask');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const request = useRequest();
    const api = useApi();
    const { user } = useAuth();
    const resetTimeline = useOptionalTimelineContext()?.resetRequest;

    const [category, setCategory] = useState(task?.category ?? initialCategory);
    const [name, setName] = useState(task?.name ?? initialName ?? '');
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
    const [material, setMaterial] = useState<TaskMaterial | undefined>(
        task ? task.material?.[0] : initialMaterial,
    );
    const [homeDirectory, setHomeDirectory] = useState<Directory>();
    const [courses, setCourses] = useState<Course[]>([]);
    const materialRequest = useRequest();

    const [errors, setErrors] = useState<Record<string, string>>({});

    const username = user?.username;
    const { onFailure: onMaterialFailure } = materialRequest;
    useEffect(() => {
        if (!open || !username) {
            return;
        }
        let cancelled = false;
        api.getDirectory(username, HOME_DIRECTORY_ID)
            .then((response) => {
                if (!cancelled) {
                    setHomeDirectory(response.data.directory);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    onMaterialFailure(err);
                }
            });
        api.listAllCourses()
            .then((allCourses) => {
                if (!cancelled) {
                    setCourses(allCourses);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    onMaterialFailure(err);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, username, api, onMaterialFailure]);

    const materialOptions = useMemo(
        () => ({
            folders: homeDirectory ? folderOptions(homeDirectory) : [],
            courses: user ? courseOptions(courses, user) : [],
        }),
        [homeDirectory, courses, user],
    );

    if (!user) {
        return null;
    }

    const selectedMaterial = materialValue(material);
    const knownMaterial =
        selectedMaterial === '' ||
        [...materialOptions.folders, ...materialOptions.courses].some(
            (option) => option.value === selectedMaterial,
        );

    const onChangeMaterial = (value: string) => {
        if (value === selectedMaterial) {
            return;
        }
        const option = [...materialOptions.folders, ...materialOptions.courses].find(
            (o) => o.value === value,
        );
        setMaterial(option?.material);
    };

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
            // When the selection is unchanged, keep all of the task's entries, not only the first.
            material: !material
                ? undefined
                : task?.material && materialValue(material) === materialValue(task.material[0])
                  ? task.material
                  : [material],
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
                    resetTimeline?.();
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
            <RequestSnackbar request={materialRequest} />

            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack
                    sx={{
                        gap: 3,
                        mt: 2,
                    }}
                >
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

                    <TextField
                        select
                        label={t('material')}
                        value={selectedMaterial}
                        onChange={(e) => onChangeMaterial(e.target.value)}
                        fullWidth
                        helperText={t('materialHelper')}
                        data-testid='custom-task-material-select'
                    >
                        <MenuItem value=''>{t('materialNone')}</MenuItem>
                        {!knownMaterial && (
                            <MenuItem value={selectedMaterial}>{t('materialCurrent')}</MenuItem>
                        )}
                        {materialOptions.folders.length > 0 && (
                            <ListSubheader>{t('materialFolders')}</ListSubheader>
                        )}
                        {materialOptions.folders.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                        {materialOptions.courses.length > 0 && (
                            <ListSubheader>{t('materialCourses')}</ListSubheader>
                        )}
                        {materialOptions.courses.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

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
