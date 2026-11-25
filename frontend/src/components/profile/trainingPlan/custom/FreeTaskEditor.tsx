import { CustomTask, CustomTaskCategory } from '@/database/requirement';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FreeTaskFields, getFreeTaskFields, TASK_UNITS, TaskUnit } from './freePlan';

const UNIT_KEYS: Record<TaskUnit, string> = {
    Games: 'unitGames',
    Minutes: 'unitMinutes',
    Puzzles: 'unitPuzzles',
    Pages: 'unitPages',
    Chapters: 'unitChapters',
    Exercises: 'unitExercises',
    Sessions: 'unitSessions',
    check: 'unitCheck',
};

interface FreeTaskEditorProps {
    /** The bucket's name, shown in the title of a new task. */
    bucketName: string;
    category: CustomTaskCategory;
    /** The task to edit. A new task is made if not set. */
    task?: CustomTask;
    onClose: () => void;
    onSave: (fields: FreeTaskFields) => void;
}

/** Edits a task of a free-tier custom plan: its name, goal and the unit it is measured in. */
export function FreeTaskEditor({
    bucketName,
    category,
    task,
    onClose,
    onSave,
}: FreeTaskEditorProps) {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const initial = task ? getFreeTaskFields(task) : undefined;

    const [name, setName] = useState(initial?.name ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [unit, setUnit] = useState<TaskUnit>(initial?.unit ?? 'Games');
    const [goal, setGoal] = useState(
        initial && initial.unit !== 'check' ? `${initial.goal}` : '10',
    );
    const [startCount, setStartCount] = useState(
        initial?.startCount ? `${initial.startCount}` : '',
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isCheck = unit === 'check';
    const unitLabel = t(UNIT_KEYS[unit]);

    const save = () => {
        const newErrors: Record<string, string> = {};
        const goalInt = Number(goal);
        const startInt = Number(startCount || '0');
        if (name.trim() === '') {
            newErrors.name = t('nameRequired');
        }
        if (!isCheck) {
            if (!Number.isInteger(goalInt) || goalInt < 1) {
                newErrors.goal = t('goalError');
            }
            if (!Number.isInteger(startInt) || startInt < 0) {
                newErrors.startCount = t('goalError');
            } else if (startInt > 0 && startInt >= goalInt) {
                newErrors.startCount = t('startCountError');
            }
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            return;
        }
        onSave({ name, description, category, goal: goalInt, startCount: startInt, unit });
        onClose();
    };

    return (
        <Dialog open onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>
                {task ? t('editTitle') : t('addTitle', { bucket: bucketName })}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label={t('taskName')}
                        required
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        data-testid='free-task-name'
                    />

                    <Stack spacing={1}>
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            {t('measuredIn')}
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            size='small'
                            value={unit}
                            onChange={(_, v: TaskUnit | null) => v && setUnit(v)}
                            sx={{
                                flexWrap: 'wrap',
                                gap: 1,
                                '& .MuiToggleButton-root': {
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: '8px !important',
                                    textTransform: 'none',
                                    px: 1.5,
                                },
                            }}
                            data-testid='free-task-unit'
                        >
                            {TASK_UNITS.map((u) => (
                                <ToggleButton key={u} value={u}>
                                    {t(UNIT_KEYS[u])}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Stack>

                    {!isCheck && (
                        <Stack direction='row' spacing={2}>
                            <TextField
                                label={t('goal', { unit: unitLabel })}
                                type='number'
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                error={!!errors.goal}
                                helperText={errors.goal}
                                sx={{ flex: 1 }}
                                data-testid='free-task-goal'
                            />
                            <TextField
                                label={t('startCount')}
                                type='number'
                                value={startCount}
                                placeholder='0'
                                onChange={(e) => setStartCount(e.target.value)}
                                error={!!errors.startCount}
                                helperText={errors.startCount || t('startCountHelper')}
                                sx={{ flex: 1 }}
                            />
                        </Stack>
                    )}

                    <TextField
                        label={t('description')}
                        multiline
                        minRows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{tCommon('cancel')}</Button>
                <Button variant='contained' onClick={save} data-testid='free-task-save'>
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
