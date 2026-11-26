import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { CustomTaskCategory } from '@/database/requirement';
import { CustomPlan, User } from '@/database/user';
import { useTranslations } from 'next-intl';
import { createContext, use } from 'react';
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
    FREE_BUCKET_NAME_KEYS,
    FREE_PLAN_CATEGORIES,
    FREE_PLAN_MAX_TASKS_PER_BUCKET,
    FreeTaskFields,
    getProgressResets,
} from './freePlan';

/**
 * Returns the free-tier user's custom plan: the first of their custom plans.
 * Free-tier users can only have one.
 */
export function getFreePlan(user: User): CustomPlan | undefined {
    return user.customPlans?.[0];
}

/**
 * Whether a free-tier user without a custom plan has picked Custom Plan, so
 * the page offers to create one. Provided by the training plan tab.
 */
export const FreePlanDraftContext = createContext<{
    creating: boolean;
    setCreating: (creating: boolean) => void;
}>({ creating: false, setCreating: () => undefined });

/**
 * Returns mutation functions for a free-tier user's custom plan. Tasks in the
 * plan are the user's own custom tasks, so adding or deleting a task changes
 * both the plan and the custom tasks in one update. Updates are optimistic.
 */
export function useFreePlanEditor() {
    const { user, updateUser } = useAuth();
    const api = useApi();
    const t = useTranslations('profile.trainingPlan.freePlan');
    const { setCreating } = use(FreePlanDraftContext);

    const save = (patch: Partial<User>) => {
        updateUser(patch);
        void api.updateUser(patch);
    };

    /** Switches to the user's existing custom plan. */
    const switchToPlan = (plan: CustomPlan) => {
        if (user && user.activePlanId !== plan.id) {
            save(switchPlanUpdate(user, plan.id));
            trackEvent(EventType.SwitchTrainingPlan, { plan_id: plan.id });
        }
    };

    /**
     * Switches to the custom plan. Without one yet, shows the page that offers
     * to create it.
     */
    const openCustomPlan = () => {
        if (!user) {
            return;
        }
        const existing = getFreePlan(user);
        if (existing) {
            switchToPlan(existing);
        } else {
            setCreating(true);
        }
    };

    /** Creates an empty custom plan and switches to it, or opens the existing one. */
    const createPlan = () => {
        if (!user) {
            return;
        }
        setCreating(false);
        const existing = getFreePlan(user);
        if (existing) {
            switchToPlan(existing);
            return;
        }

        const bucketNames = Object.fromEntries(
            FREE_PLAN_CATEGORIES.map((c) => [c, t(FREE_BUCKET_NAME_KEYS[c])]),
        ) as Record<CustomTaskCategory, string>;
        const plan = buildFreePlan(user.username, t('planName'), bucketNames);
        save({ customPlans: [plan], ...switchPlanUpdate(user, plan.id) });
        trackEvent(EventType.CreateCustomPlan, { plan_id: plan.id, start_from_dojo: false });
    };

    /** Switches back to the Dojo plan. */
    const openDojoPlan = () => {
        setCreating(false);
        if (!user?.activePlanId) {
            return;
        }
        save(switchPlanUpdate(user, ''));
        trackEvent(EventType.SwitchTrainingPlan, { plan_id: '' });
    };

    /**
     * Sets the progress of every task in the plan back to 0, one progress
     * update per task, so each reset shows on the timeline. The tasks and the
     * time logged on them are kept.
     */
    const resetProgress = async (plan: CustomPlan) => {
        if (!user) {
            return;
        }
        const resets = getProgressResets(plan, user.progress);
        for (const reset of resets) {
            await api.updateUserProgress({
                ...reset,
                cohort: user.dojoCohort,
                newCount: 0,
                incrementalMinutesSpent: 0,
                date: null,
                notes: t('resetNote'),
            });
        }
        trackEvent(EventType.ResetProgress, { plan_id: plan.id, task_count: resets.length });
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

    return {
        openCustomPlan,
        createPlan,
        openDojoPlan,
        resetProgress,
        addTask,
        editTask,
        deleteTask,
    };
}
