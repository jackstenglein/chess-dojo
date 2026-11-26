import { CustomTask, Requirement } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { CustomPlan, CustomPlanBucket, isFree, User } from '@/database/user';
import { v4 as uuidv4 } from 'uuid';

/** A task in a custom plan: either an official requirement or a user's custom task. */
export type PlanTask = Requirement | CustomTask;

/**
 * Returns the user's active custom plan, or undefined if the default Dojo plan
 * is active (or the active plan id no longer refers to an existing plan).
 * Custom plans are a free-tier feature, so subscribers always get the Dojo plan.
 * @param user The user to get the active plan for.
 */
export function getActivePlan(user: User): CustomPlan | undefined {
    if (!user.activePlanId || !isFree(user)) {
        return undefined;
    }
    return user.customPlans?.find((plan) => plan.id === user.activePlanId);
}

/**
 * Returns the set of all task ids in the given plan.
 * @param plan The plan to get the task ids for.
 */
export function getPlanTaskIds(plan: CustomPlan): Set<string> {
    return new Set(plan.buckets.flatMap((bucket) => bucket.taskIds));
}

/**
 * Creates a new custom plan with the given name and buckets.
 * @param name The name of the plan.
 * @param owner The username of the plan's owner.
 * @param buckets The buckets in the plan.
 */
export function createCustomPlan(
    name: string,
    owner: string,
    buckets: CustomPlanBucket[],
): CustomPlan {
    const now = new Date().toISOString();
    return {
        id: uuidv4(),
        owner,
        name,
        createdAt: now,
        updatedAt: now,
        buckets,
    };
}

/**
 * Resolves the task ids in the given plan to full tasks. Ids which no longer
 * refer to an existing task (e.g. a deleted custom task) are skipped.
 * @param plan The plan to resolve the tasks for.
 * @param allRequirements All requirements in the training plan.
 * @param customTasks The user's custom tasks.
 */
export function resolvePlanTasks(
    plan: CustomPlan,
    allRequirements: Requirement[],
    customTasks: CustomTask[],
): Map<string, PlanTask> {
    const tasks = new Map<string, PlanTask>();
    for (const id of getPlanTaskIds(plan)) {
        const task =
            customTasks.find((t) => t.id === id) || allRequirements.find((r) => r.id === id);
        if (task) {
            tasks.set(id, task);
        }
    }
    return tasks;
}

/**
 * Returns a copy of the given plans with the given plan replaced (matched by id)
 * and its updatedAt stamped.
 * @param plans The user's custom plans.
 * @param plan The updated plan.
 */
export function replacePlan(plans: CustomPlan[], plan: CustomPlan): CustomPlan[] {
    return plans.map((p) =>
        p.id === plan.id ? { ...plan, updatedAt: new Date().toISOString() } : p,
    );
}

/**
 * Returns a copy of the given plan with the given tasks appended to the bucket,
 * skipping ids already in the bucket.
 * @param plan The plan to update.
 * @param bucketId The id of the bucket to add the tasks to.
 * @param taskIds The ids of the tasks to add.
 */
export function addTasksToBucket(
    plan: CustomPlan,
    bucketId: string,
    taskIds: string[],
): CustomPlan {
    return {
        ...plan,
        buckets: plan.buckets.map((bucket) => {
            if (bucket.id !== bucketId) {
                return bucket;
            }
            const existing = new Set(bucket.taskIds);
            return {
                ...bucket,
                taskIds: [...bucket.taskIds, ...taskIds.filter((id) => !existing.has(id))],
            };
        }),
    };
}

/**
 * Returns a copy of the given plans with the given task id removed from every
 * bucket of every plan. Used when a custom task is deleted.
 * @param plans The user's custom plans.
 * @param taskId The id of the deleted task.
 */
export function removeTaskFromPlans(plans: CustomPlan[], taskId: string): CustomPlan[] {
    return plans.map((plan) => ({
        ...plan,
        buckets: plan.buckets.map((bucket) => ({
            ...bucket,
            taskIds: bucket.taskIds.filter((id) => id !== taskId),
        })),
    }));
}

/** The planPins key for the default Dojo plan. */
export const DOJO_PLAN_PINS_KEY = 'dojo';

/** Returns the planPins key of the given plan id ('' is the Dojo plan). */
function pinsKey(planId: string | undefined): string {
    return planId || DOJO_PLAN_PINS_KEY;
}

/** Returns the planPins key of the user's active plan. */
function activePinsKey(user: User): string {
    return pinsKey(getActivePlan(user)?.id);
}

/**
 * Returns the user update that switches the active plan. Pins belong to a plan:
 * the current plan's pins are saved in planPins, and the new plan's saved pins
 * (none for a new plan) become the active pins.
 * @param user The user switching plans.
 * @param toPlanId The id of the plan to switch to. '' is the Dojo plan.
 */
export function switchPlanUpdate(user: User, toPlanId: string): Partial<User> {
    const fromKey = activePinsKey(user);
    const toKey = pinsKey(toPlanId);
    if (fromKey === toKey) {
        return { activePlanId: toPlanId };
    }

    const restored = user.planPins?.[toKey];
    const planPins = {
        ...withoutKey(user.planPins, toKey),
        [fromKey]: {
            pinnedTasks: user.pinnedTasks ?? [],
            pinnedTaskMinutes: user.pinnedTaskMinutes ?? {},
        },
    };

    return {
        activePlanId: toPlanId,
        pinnedTasks: restored?.pinnedTasks ?? [],
        pinnedTaskMinutes: restored?.pinnedTaskMinutes ?? {},
        planPins,
    };
}

/**
 * Returns the user update that unpins the given tasks from the given plan,
 * whether it is active (pinnedTasks) or not (planPins). Returns an empty
 * update if none of the tasks are pinned there.
 * @param user The user to update.
 * @param planId The id of the plan to unpin from. '' is the Dojo plan.
 * @param taskIds The ids of the tasks to unpin.
 */
export function unpinTasksUpdate(user: User, planId: string, taskIds: Set<string>): Partial<User> {
    const key = pinsKey(planId);
    const isActive = key === activePinsKey(user);
    const pins = isActive
        ? { pinnedTasks: user.pinnedTasks, pinnedTaskMinutes: user.pinnedTaskMinutes }
        : user.planPins?.[key];
    if (!pins?.pinnedTasks?.some((id) => taskIds.has(id))) {
        return {};
    }

    const pinnedTasks = pins.pinnedTasks.filter((id) => !taskIds.has(id));
    const pinnedTaskMinutes = Object.fromEntries(
        Object.entries(pins.pinnedTaskMinutes ?? {}).filter(([id]) => !taskIds.has(id)),
    );
    if (isActive) {
        return { pinnedTasks, pinnedTaskMinutes };
    }
    return { planPins: { ...user.planPins, [key]: { pinnedTasks, pinnedTaskMinutes } } };
}

/**
 * Returns a copy of the given record without the given key.
 * @param record The record to copy. Undefined is treated as empty.
 * @param key The key to leave out.
 */
export function withoutKey<T>(
    record: Record<string, T> | undefined,
    key: string,
): Record<string, T> {
    return Object.fromEntries(Object.entries(record ?? {}).filter(([k]) => k !== key));
}

/**
 * Returns the timeline entries logged while the given plan was active. Entries
 * without a plan id (including everything logged before custom plans existed)
 * belong to the Dojo plan.
 * @param timeline The user's timeline.
 * @param planId The id of the plan. '' is the Dojo plan.
 */
export function filterTimelineForPlan(timeline: TimelineEntry[], planId: string): TimelineEntry[] {
    return timeline.filter((entry) => (entry.planId ?? '') === planId);
}
