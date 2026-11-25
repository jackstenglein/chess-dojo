import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { CustomTaskCategory, RequirementCategory } from '@/database/requirement';
import { CustomPlan, User } from '@/database/user';
import { useTranslations } from 'next-intl';
import {
    addTasksToBucket,
    removeTaskFromPlans,
    replacePlan,
    switchPlanUpdate,
    unpinTasksUpdate,
} from '../customPlan';
import {
    buildFreePlan,
    buildFreeTask,
    FREE_PLAN_MAX_TASKS_PER_BUCKET,
    FreeTaskFields,
    SampleTasks,
} from './freePlan';

/**
 * Returns the free-tier user's custom plan: the first of their custom plans.
 * Free-tier users can only have one.
 */
export function getFreePlan(user: User): CustomPlan | undefined {
    return user.customPlans?.[0];
}

/**
 * Returns mutation functions for a free-tier user's custom plan. Tasks in the
 * plan are the user's own custom tasks, so adding or deleting a task changes
 * both the plan and the custom tasks in one update. Updates are optimistic.
 */
export function useFreePlanEditor() {
    const { user, updateUser } = useAuth();
    const api = useApi();
    const t = useTranslations('profile.trainingPlan.freePlan');

    const save = (patch: Partial<User>) => {
        updateUser(patch);
        void api.updateUser(patch);
    };

    /** Switches to the custom plan, creating it with sample tasks the first time. */
    const openCustomPlan = () => {
        if (!user) {
            return;
        }
        const existing = getFreePlan(user);
        if (existing) {
            if (user.activePlanId !== existing.id) {
                save(switchPlanUpdate(user, existing.id));
                trackEvent(EventType.SwitchTrainingPlan, { plan_id: existing.id });
            }
            return;
        }

        const bucketNames: Record<CustomTaskCategory, string> = {
            [RequirementCategory.Games]: t('bucketGames'),
            [RequirementCategory.Tactics]: t('bucketTactics'),
            [RequirementCategory.Middlegames]: t('bucketMiddlegames'),
            [RequirementCategory.Endgame]: t('bucketEndgames'),
            [RequirementCategory.Opening]: t('bucketOpenings'),
        };
        const samples: SampleTasks = {
            [RequirementCategory.Games]: {
                name: t('sampleGamesName'),
                description: t('sampleGamesDescription'),
                goal: 10,
                startCount: 0,
                unit: 'Games',
            },
            [RequirementCategory.Tactics]: {
                name: t('sampleTacticsName'),
                description: t('sampleTacticsDescription'),
                goal: 20,
                startCount: 0,
                unit: 'Sessions',
            },
            [RequirementCategory.Middlegames]: {
                name: t('sampleBookName'),
                description: t('sampleMiddlegamesDescription'),
                goal: 12,
                startCount: 0,
                unit: 'Chapters',
            },
            [RequirementCategory.Endgame]: {
                name: t('sampleBookName'),
                description: t('sampleEndgamesDescription'),
                goal: 200,
                startCount: 0,
                unit: 'Pages',
            },
            [RequirementCategory.Opening]: {
                name: t('sampleOpeningsName'),
                description: t('sampleOpeningsDescription'),
                goal: 300,
                startCount: 0,
                unit: 'Minutes',
            },
        };

        const { plan, tasks } = buildFreePlan(user.username, t('planName'), bucketNames, samples);
        save({
            customTasks: [...(user.customTasks ?? []), ...tasks],
            customPlans: [plan],
            ...switchPlanUpdate(user, plan.id),
        });
        trackEvent(EventType.CreateCustomPlan, { plan_id: plan.id, start_from_dojo: false });
    };

    /** Switches back to the Dojo plan. */
    const openDojoPlan = () => {
        if (!user?.activePlanId) {
            return;
        }
        save(switchPlanUpdate(user, ''));
        trackEvent(EventType.SwitchTrainingPlan, { plan_id: '' });
    };

    /** Creates a task and adds it to the bucket, if the bucket has room. */
    const addTask = (plan: CustomPlan, bucketId: string, fields: FreeTaskFields) => {
        const bucket = plan.buckets.find((b) => b.id === bucketId);
        if (!user || !bucket || bucket.taskIds.length >= FREE_PLAN_MAX_TASKS_PER_BUCKET) {
            return;
        }
        const task = buildFreeTask(fields, user.username);
        save({
            customTasks: [...(user.customTasks ?? []), task],
            customPlans: replacePlan(
                user.customPlans ?? [],
                addTasksToBucket(plan, bucketId, [task.id]),
            ),
        });
        trackEvent(EventType.CreateNondojoTask, { task_id: task.id, task_name: task.name });
    };

    /** Updates an existing task. */
    const editTask = (taskId: string, fields: FreeTaskFields) => {
        if (!user) {
            return;
        }
        const task = buildFreeTask(fields, user.username, taskId);
        save({
            customTasks: (user.customTasks ?? []).map((t) => (t.id === taskId ? task : t)),
        });
        trackEvent(EventType.EditNondojoTask, { task_id: task.id, task_name: task.name });
    };

    /** Deletes the task and removes it from the plan. Logged progress is kept. */
    const deleteTask = (plan: CustomPlan, taskId: string) => {
        if (!user) {
            return;
        }
        save({
            customTasks: (user.customTasks ?? []).filter((t) => t.id !== taskId),
            customPlans: removeTaskFromPlans(user.customPlans ?? [], taskId),
            ...unpinTasksUpdate(user, plan.id, new Set([taskId])),
        });
        trackEvent(EventType.DeleteNondojoTask, { task_id: taskId });
    };

    return { openCustomPlan, openDojoPlan, addTask, editTask, deleteTask };
}
