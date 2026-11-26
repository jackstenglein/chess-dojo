import { RequestSnackbar, useRequest } from '@/api/Request';
import {
    CustomTask,
    CustomTaskCategory,
    isCustomTaskCategory,
    RequirementCategory,
} from '@/database/requirement';
import { CustomPlan, CustomPlanBucket } from '@/database/user';
import { Add, LockOutlined, RestartAlt } from '@mui/icons-material';
import { Box, Button, Card, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { PlanTask, resolvePlanTasks } from '../customPlan';
import { FullTrainingPlanItem } from '../full/FullTrainingPlanItem';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { getBucketCategory, getBucketColor } from './bucketColors';
import { getPlanProgress } from './bucketProgress';
import { ConfirmDialog } from './ConfirmDialog';
import {
    FREE_BUCKET_NAME_KEYS,
    FREE_PLAN_MAX_TASKS_PER_BUCKET,
    getProgressResets,
    sortFreePlanBuckets,
} from './freePlan';
import { FreeTaskEditor } from './FreeTaskEditor';
import { PlanTypeIcon } from './PlanTypeIcon';
import { useFreePlanEditor } from './useFreePlanEditor';

/**
 * The custom plan of a free-tier user: fixed category buckets of up to
 * FREE_PLAN_MAX_TASKS_PER_BUCKET of their own tasks each.
 */
export function FreeCustomPlanView({ plan }: { plan: CustomPlan }) {
    const { user, allRequirements, isCurrentUser } = use(TrainingPlanContext);
    const t = useTranslations('profile.trainingPlan.freePlan');

    const tasks = useMemo(
        () => resolvePlanTasks(plan, allRequirements, user.customTasks ?? []),
        [plan, allRequirements, user.customTasks],
    );

    return (
        <Stack spacing={2} sx={{ width: 1 }} data-testid='free-custom-plan-view'>
            <Stack spacing={0.5}>
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.5 }}
                >
                    <PlanTypeIcon custom sx={{ color: 'primary.main' }} />
                    <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                        {plan.name}
                    </Typography>
                    {isCurrentUser && <ResetProgressButton plan={plan} />}
                </Stack>
                <Typography sx={{ color: 'text.primary' }}>
                    {t('subheading', { max: FREE_PLAN_MAX_TASKS_PER_BUCKET })}
                </Typography>
            </Stack>

            {sortFreePlanBuckets(plan.buckets).map((bucket, index) => (
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

/**
 * Sets the progress of every task in the plan back to 0, after confirming.
 * The tasks stay. Disabled while there is nothing to reset.
 */
function ResetProgressButton({ plan }: { plan: CustomPlan }) {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const { user } = use(TrainingPlanContext);
    const { resetProgress } = useFreePlanEditor();
    const [confirming, setConfirming] = useState(false);
    const request = useRequest();

    const hasProgress = getProgressResets(plan, user.progress).length > 0;

    const onConfirm = () => {
        request.onStart();
        resetProgress(plan)
            .then(() => request.onSuccess())
            .catch((err: unknown) => request.onFailure(err));
    };

    return (
        <>
            <Tooltip title={hasProgress ? '' : t('resetNothing')}>
                <span style={{ marginLeft: 'auto' }}>
                    <Button
                        size='small'
                        startIcon={<RestartAlt />}
                        disabled={!hasProgress}
                        loading={request.isLoading()}
                        onClick={() => setConfirming(true)}
                        sx={{ textTransform: 'none' }}
                        data-testid='free-plan-reset-progress'
                    >
                        {t('resetProgress')}
                    </Button>
                </span>
            </Tooltip>
            <ConfirmDialog
                open={confirming}
                onClose={() => setConfirming(false)}
                title={t('resetTitle')}
                content={t('resetContent')}
                onConfirm={onConfirm}
                confirmLabel={t('resetConfirm')}
            />
            <RequestSnackbar request={request} />
        </>
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
    // Shown in the current language, whatever name the plan was saved with.
    const bucketName =
        category && category in FREE_BUCKET_NAME_KEYS
            ? t(FREE_BUCKET_NAME_KEYS[category as keyof typeof FREE_BUCKET_NAME_KEYS])
            : bucket.name;

    return (
        <Card
            variant='outlined'
            sx={{ width: 1, borderRadius: 3, borderLeft: 4, borderLeftColor: color }}
            data-testid={`free-bucket-${bucket.id}`}
        >
            <Stack direction='row' sx={{ alignItems: 'center', gap: 2, px: 2, pt: 1.5, pb: 1 }}>
                <Typography sx={{ fontWeight: 600, flexShrink: 0 }}>{bucketName}</Typography>
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
                    <Typography sx={{ color: 'text.primary', py: 1.5 }}>
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
                    bucketName={bucketName}
                    category={editorCategory}
                    onClose={() => setAdding(false)}
                    onSave={(fields) => addTask(plan, bucket.id, fields)}
                />
            )}

            {editing && (
                <FreeTaskEditor
                    bucketName={bucketName}
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
