import { CustomTask, isComplete, Requirement, RequirementProgress } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { WeeklyPlan } from '@/database/user';

/**
 * Returns the tasks a task can be swapped for: others in the same category for the
 * cohort that are not finished, not already on today's plan, not skipped, and
 * available to the user's subscription. Ordered as the full training plan orders
 * them.
 */
export function getSwapCandidates({
    task,
    cohort,
    requirements,
    customTasks,
    progress,
    timeline,
    todayIds,
    skippedIds,
    subscriptionTier,
}: {
    task: Requirement | CustomTask;
    cohort: string;
    requirements: Requirement[];
    /** May be null: the server stores an empty list that way for some users. */
    customTasks?: CustomTask[] | null;
    progress: Record<string, RequirementProgress | undefined>;
    timeline: TimelineEntry[];
    todayIds: string[];
    skippedIds?: string[] | null;
    subscriptionTier: string;
}): (Requirement | CustomTask)[] {
    const candidates: (Requirement | CustomTask)[] = [
        ...requirements.filter(
            (r) => r.subscriptionTiers?.includes(subscriptionTier as never) ?? true,
        ),
        ...(customTasks ?? []),
    ];

    return candidates
        .filter(
            (t) =>
                t.id !== task.id &&
                t.category === task.category &&
                t.counts[cohort] !== undefined &&
                !todayIds.includes(t.id) &&
                !(skippedIds ?? []).includes(t.id) &&
                !isComplete(cohort, t, progress[t.id], timeline, false),
        )
        .sort((a, b) =>
            ('sortPriority' in a ? a.sortPriority : '').localeCompare(
                'sortPriority' in b ? b.sortPriority : '',
            ),
        );
}

/**
 * Returns the plan with one task on a day replaced by another, keeping its place in
 * the day and its time. A saved day is loaded as it is unless the plan has to be
 * rebuilt, so the swap sticks.
 * @param plan The saved weekly plan.
 * @param dayIndex The day of the week to change, where Sunday is 0.
 * @param fromId The task to take off the day.
 * @param toId The task to put in its place.
 */
export function swapInPlan(
    plan: WeeklyPlan,
    dayIndex: number,
    fromId: string,
    toId: string,
): WeeklyPlan {
    return {
        ...plan,
        tasks: plan.tasks.map((day, i) =>
            i === dayIndex ? day.map((t) => (t.id === fromId ? { ...t, id: toId } : t)) : day,
        ),
    };
}
