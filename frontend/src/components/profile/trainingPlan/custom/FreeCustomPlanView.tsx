import {
    CustomTask,
    CustomTaskCategory,
    isCustomTaskCategory,
    RequirementCategory,
} from '@/database/requirement';
import { CustomPlan, CustomPlanBucket } from '@/database/user';
import { Add, LockOutlined } from '@mui/icons-material';
import { Box, Button, Card, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { PlanTask, resolvePlanTasks } from '../customPlan';
import { FullTrainingPlanItem } from '../full/FullTrainingPlanItem';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { getBucketCategory, getBucketColor } from './bucketColors';
import { getPlanProgress } from './bucketProgress';
import { ConfirmDialog } from './ConfirmDialog';
import { FREE_PLAN_MAX_TASKS_PER_BUCKET } from './freePlan';
import { FreeTaskEditor } from './FreeTaskEditor';
import { PlanTypeIcon } from './PlanTypeIcon';
import { useFreePlanEditor } from './useFreePlanEditor';

/**
 * The custom plan of a free-tier user: fixed category buckets of up to
 * FREE_PLAN_MAX_TASKS_PER_BUCKET of their own tasks each.
 */
export function FreeCustomPlanView({ plan }: { plan: CustomPlan }) {
    const { user, allRequirements } = use(TrainingPlanContext);
    const t = useTranslations('profile.trainingPlan.freePlan');

    const tasks = useMemo(
        () => resolvePlanTasks(plan, allRequirements, user.customTasks ?? []),
        [plan, allRequirements, user.customTasks],
    );

    return (
        <Stack spacing={2} sx={{ width: 1 }} data-testid='free-custom-plan-view'>
            <Stack spacing={0.5}>
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                    <PlanTypeIcon custom sx={{ color: 'primary.main' }} />
                    <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                        {plan.name}
                    </Typography>
                </Stack>
                <Typography sx={{ color: 'text.secondary' }}>
                    {t('subheading', { max: FREE_PLAN_MAX_TASKS_PER_BUCKET })}
                </Typography>
            </Stack>

            {plan.buckets.map((bucket, index) => (
                <BucketCard
                    key={bucket.id}
                    plan={plan}
                    bucket={bucket}
                    color={getBucketColor(bucket, index)}
                    tasks={tasks}
                />
            ))}
        </Stack>
    );
}

function BucketCard({
    plan,
    bucket,
    color,
    tasks,
}: {
    plan: CustomPlan;
    bucket: CustomPlanBucket;
    color: string;
    tasks: Map<string, PlanTask>;
}) {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const { user, isCurrentUser, pinnedTasks, openPinEditor, timeline } = use(TrainingPlanContext);
    const { addTask, editTask, deleteTask } = useFreePlanEditor();

    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<CustomTask>();
    const [deleting, setDeleting] = useState<PlanTask>();

    const category = getBucketCategory(bucket);
    const editorCategory: CustomTaskCategory = isCustomTaskCategory(category)
        ? category
        : RequirementCategory.Games;
    const bucketTasks = bucket.taskIds.map((id) => tasks.get(id)).filter((task) => !!task);
    const { percent } = getPlanProgress(bucketTasks, user, user.dojoCohort, timeline);
    const isFull = bucket.taskIds.length >= FREE_PLAN_MAX_TASKS_PER_BUCKET;

    return (
        <Card
            variant='outlined'
            sx={{ width: 1, borderRadius: 3, borderLeft: 4, borderLeftColor: color }}
            data-testid={`free-bucket-${bucket.id}`}
        >
            <Stack direction='row' sx={{ alignItems: 'center', gap: 2, px: 2, pt: 1.5, pb: 1 }}>
                <Typography sx={{ fontWeight: 600, flexShrink: 0 }}>{bucket.name}</Typography>
                <LinearProgress
                    variant='determinate'
                    value={percent}
                    sx={{
                        flexGrow: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundColor: color },
                    }}
                />
                <Typography
                    variant='body2'
                    sx={{
                        color: 'text.secondary',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                    }}
                >
                    {t('taskCount', {
                        count: bucket.taskIds.length,
                        max: FREE_PLAN_MAX_TASKS_PER_BUCKET,
                    })}
                </Typography>
            </Stack>

            <Box sx={{ px: 2 }}>
                {bucketTasks.length === 0 && (
                    <Typography variant='body2' sx={{ color: 'text.secondary', py: 1.5 }}>
                        {t('emptyBucket')}
                    </Typography>
                )}
                {bucketTasks.map((task) => (
                    <FullTrainingPlanItem
                        key={task.id}
                        requirement={task}
                        progress={user.progress[task.id]}
                        cohort={user.dojoCohort}
                        isCurrentUser={isCurrentUser}
                        user={user}
                        onPinClick={openPinEditor}
                        isPinned={pinnedTasks.some((p) => p.id === task.id)}
                        onEdit={
                            isCurrentUser && 'owner' in task ? () => setEditing(task) : undefined
                        }
                        onRemove={isCurrentUser ? () => setDeleting(task) : undefined}
                        removeLabel={t('deleteTask')}
                    />
                ))}
            </Box>

            {isCurrentUser && (
                <Box sx={{ px: 1, py: 1 }}>
                    {isFull ? (
                        <Tooltip title={t('limitReached', { max: FREE_PLAN_MAX_TASKS_PER_BUCKET })}>
                            <span>
                                <Button
                                    disabled
                                    startIcon={<LockOutlined />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {t('bucketFull')}
                                </Button>
                            </span>
                        </Tooltip>
                    ) : (
                        <Button
                            startIcon={<Add />}
                            onClick={() => setAdding(true)}
                            sx={{ textTransform: 'none' }}
                            data-testid={`free-add-task-${bucket.id}`}
                        >
                            {t('addTask')}
                        </Button>
                    )}
                </Box>
            )}

            {adding && (
                <FreeTaskEditor
                    bucketName={bucket.name}
                    category={editorCategory}
                    onClose={() => setAdding(false)}
                    onSave={(fields) => addTask(plan, bucket.id, fields)}
                />
            )}

            {editing && (
                <FreeTaskEditor
                    bucketName={bucket.name}
                    category={editing.category}
                    task={editing}
                    onClose={() => setEditing(undefined)}
                    onSave={(fields) => editTask(editing.id, fields)}
                />
            )}

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(undefined)}
                title={t('deleteTitle', { name: deleting?.name ?? '' })}
                content={t('deleteContent')}
                onConfirm={() => deleting && deleteTask(plan, deleting.id)}
            />
        </Card>
    );
}
