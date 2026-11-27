import { useApi } from '@/api/Api';
import { useRequirements } from '@/api/cache/requirements';
import { Request } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { CustomTask, Requirement } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, CustomPlan, User, WeeklyPlan, WorkGoalSettings } from '@/database/user';
import { useEffect, useMemo, useState } from 'react';
import { useTimelineContext } from '../activity/useTimeline';
import { filterTimelineForPlan, getActivePlan, getPlanTaskIds } from './customPlan';
import { pinnedMinutesMatch } from './pinSchedule';
import { planTasksToSave } from './planTasksToSave';
import { restoreToToday, toggleSkippedIds } from './skippedTasks';
import { SuggestedTask, TaskSuggestionAlgorithm } from './suggestedTasks';
import { swapInPlan } from './swapTask';
import { DEFAULT_WORK_GOAL } from './workGoal';

export interface UseTrainingPlanResponse {
    /** The request for fetching requirements. */
    request: Request<never>;
    /** The requirements in the given cohort. */
    requirements: Requirement[];
    /** All the requirements in the training plan, across all cohorts. */
    allRequirements: Requirement[];
    /** The tasks the user has pinned. */
    pinnedTasks: (Requirement | CustomTask)[];
    /** A callback function to toggle whether a task is pinned. */
    togglePin: (task: Requirement | CustomTask) => void;
    /**
     * Pins the task (if it is not already) with the given minutes for each day of
     * the week. Sunday is index 0; Saturday is index 6.
     */
    savePin: (task: Requirement | CustomTask, minutesPerDay: number[]) => void;
    /** Replaces the minutes set aside for the pinned tasks. */
    savePinnedTaskMinutes: (pinnedTaskMinutes: Record<string, number[]>) => void;
    /** Sets the user's planned minutes for one day of the week. */
    saveDayGoal: (dayIndex: number, minutes: number) => void;
    /** The task whose pin is being edited, if any. */
    pinEditorTask?: Requirement | CustomTask;
    /** Opens the editor for the task's pin, to pin it or change its days and minutes. */
    openPinEditor: (task: Requirement | CustomTask) => void;
    /** Closes the pin editor. */
    closePinEditor: () => void;
    /** The user passed as a parameter, unchanged. */
    user: User;
    /** The user's active custom plan, if any. Undefined means the Dojo plan is active. */
    activePlan?: CustomPlan;
    /** Whether the provided user is the current logged in user. */
    isCurrentUser: boolean;
    /** The ids of tasks the user has skipped for the current week. */
    skippedTaskIds?: string[];
    /**
     * Toggles whether the given ids are skipped for the week. If all of them are
     * already skipped they are restored; otherwise they are skipped.
     */
    toggleSkip: (...ids: string[]) => void;
    /** The ids skipped most recently, while an undo is still on offer. */
    lastSkipped?: string[];
    /** Undoes the most recent skip, putting the week back exactly as it was. */
    undoSkip: () => void;
    /** Dismisses the undo for the most recent skip. */
    clearLastSkipped: () => void;
    /**
     * Replaces a task on today's plan with another, keeping its time. Returns false
     * when the task is not on today's saved plan, so there was nothing to swap.
     */
    swapTask: (fromId: string, toId: string) => boolean;
    /** The most recent swap, while an undo is still on offer. */
    lastSwap?: { fromId: string; toId: string };
    /** Undoes the most recent swap, putting today back exactly as it was. */
    undoSwap: () => void;
    /** Dismisses the undo for the most recent swap. */
    clearLastSwap: () => void;
}

/**
 * Returns common data and functions used across all Training Plan tabs.
 * @param user The user to display the training plan for.
 * @param cohort The cohort to display the training plan for.
 */
export function useTrainingPlan(user: User, cohort?: string): UseTrainingPlanResponse {
    const { user: currentUser, updateUser } = useAuth();
    const api = useApi();
    const { request, requirements: allRequirements } = useRequirements(ALL_COHORTS, false);
    const { requirements } = useRequirements(cohort || user.dojoCohort, false);
    const activePlan = useMemo(() => getActivePlan(user), [user]);
    const pinnedTasks = useMemo(() => {
        // Pins belong to a plan: with a custom plan active, only its tasks can be pinned.
        const planTaskIds = activePlan ? getPlanTaskIds(activePlan) : undefined;
        return (
            user.pinnedTasks
                ?.filter((id) => !planTaskIds || planTaskIds.has(id))
                .map(
                    (id) =>
                        user.customTasks?.find((task) => task.id === id) ||
                        allRequirements.find((task) => task.id === id),
                )
                .filter((t) => !!t) ?? []
        );
    }, [user, allRequirements, activePlan]);

    const togglePin = (task: Requirement | CustomTask) => {
        const isPinned = pinnedTasks.some((t) => t.id === task.id);
        const newPinnedTasks = isPinned
            ? pinnedTasks.filter((t) => t.id !== task.id)
            : [...pinnedTasks, task];
        const newIds = newPinnedTasks.map((t) => t.id);

        // Unpinning also forgets the task's days and minutes.
        const pinnedTaskMinutes =
            isPinned && user.pinnedTaskMinutes
                ? Object.fromEntries(
                      Object.entries(user.pinnedTaskMinutes).filter(([id]) => id !== task.id),
                  )
                : user.pinnedTaskMinutes;

        updateUser({ pinnedTasks: newIds, pinnedTaskMinutes });
        void api.updateUser({ pinnedTasks: newIds, pinnedTaskMinutes });
    };

    const savePin = (task: Requirement | CustomTask, minutesPerDay: number[]) => {
        const pinnedTaskIds = pinnedTasks.some((t) => t.id === task.id)
            ? pinnedTasks.map((t) => t.id)
            : [...pinnedTasks.map((t) => t.id), task.id];
        const pinnedTaskMinutes = { ...user.pinnedTaskMinutes, [task.id]: minutesPerDay };

        updateUser({ pinnedTasks: pinnedTaskIds, pinnedTaskMinutes });
        void api.updateUser({ pinnedTasks: pinnedTaskIds, pinnedTaskMinutes });
    };

    const savePinnedTaskMinutes = (pinnedTaskMinutes: Record<string, number[]>) => {
        updateUser({ pinnedTaskMinutes });
        void api.updateUser({ pinnedTaskMinutes });
    };

    const saveDayGoal = (dayIndex: number, minutes: number) => {
        const minutesPerDay = [...(user.workGoal || DEFAULT_WORK_GOAL).minutesPerDay];
        minutesPerDay[dayIndex] = minutes;
        const workGoal = { minutesPerDay };
        const workGoalHistory = (user.workGoalHistory ?? []).concat({
            date: new Date().toISOString(),
            workGoal,
        });

        updateUser({ workGoal, workGoalHistory });
        void api.updateUser({ workGoal, workGoalHistory });
    };

    const [pinEditorTask, setPinEditorTask] = useState<Requirement | CustomTask>();

    const [lastSkip, setLastSkip] = useState<{ ids: string[]; previousPlan: WeeklyPlan }>();

    const savePlan = (weeklyPlan: WeeklyPlan) => {
        updateUser({ weeklyPlan });
        void api.updateUser({ weeklyPlan });
    };

    const toggleSkip = (...ids: string[]) => {
        const plan = user.weeklyPlan;
        if (!plan) {
            return;
        }
        const current = plan.skippedTasks ?? [];
        const skippedTasks = toggleSkippedIds(current, ids);
        const isSkipping = skippedTasks.length > current.length;

        // A restore leaves today as planned (a task skipped from today shows again)
        // and clears the days after today so they get rebuilt with the task.
        savePlan(
            isSkipping
                ? { ...plan, skippedTasks }
                : { ...plan, skippedTasks, tasks: restoreToToday(plan) },
        );
        setLastSkip(isSkipping ? { ids, previousPlan: plan } : undefined);
    };

    const [lastSwap, setLastSwap] = useState<{
        fromId: string;
        toId: string;
        previousPlan: WeeklyPlan;
    }>();

    const swapTask = (fromId: string, toId: string) => {
        const plan = user.weeklyPlan;
        const dayIndex = new Date().getDay();
        if (!plan?.tasks[dayIndex]?.some((t) => t.id === fromId)) {
            return false;
        }
        savePlan(swapInPlan(plan, dayIndex, fromId, toId));
        setLastSwap({ fromId, toId, previousPlan: plan });
        return true;
    };

    const undoSwap = () => {
        if (lastSwap) {
            savePlan(lastSwap.previousPlan);
            setLastSwap(undefined);
        }
    };

    const undoSkip = () => {
        if (lastSkip) {
            savePlan(lastSkip.previousPlan);
            setLastSkip(undefined);
        }
    };

    return {
        user,
        request,
        requirements,
        allRequirements,
        activePlan,
        pinnedTasks,
        togglePin,
        savePin,
        savePinnedTaskMinutes,
        saveDayGoal,
        pinEditorTask,
        openPinEditor: setPinEditorTask,
        closePinEditor: () => setPinEditorTask(undefined),
        isCurrentUser: currentUser?.username === user.username,
        skippedTaskIds: user.weeklyPlan?.skippedTasks,
        toggleSkip,
        lastSkipped: lastSkip?.ids,
        undoSkip,
        clearLastSkipped: () => setLastSkip(undefined),
        swapTask,
        lastSwap: lastSwap && { fromId: lastSwap.fromId, toId: lastSwap.toId },
        undoSwap,
        clearLastSwap: () => setLastSwap(undefined),
    };
}

export interface UseWeeklyTrainingPlanResponse extends UseTrainingPlanResponse {
    /** The list of suggestions, indexed by the day of the week. */
    suggestionsByDay: SuggestedTask[][];
    /** The suggestions for the entire week, combined into a single flat list. */
    weekSuggestions: SuggestedTask[];
    /** The start date of the week. */
    startDate: string;
    /** The end date of the week. */
    endDate: string;
    /** Whether the weekly training plan is still loading. */
    isLoading: boolean;
    /** The user's timeline. */
    timeline: TimelineEntry[];
    /**
     * The user's timeline entries logged on the active plan only. Used for this
     * week's logged progress, so switching plans doesn't show other plans' work.
     */
    planTimeline: TimelineEntry[];
}

export function useWeeklyTrainingPlan(user: User): UseWeeklyTrainingPlanResponse {
    const api = useApi();
    const trainingPlan = useTrainingPlan(user);
    const { pinnedTasks, requirements, allRequirements, activePlan, isCurrentUser } = trainingPlan;
    const { entries: timeline } = useTimelineContext();

    const planTaskIds = useMemo(
        () => (activePlan ? getPlanTaskIds(activePlan) : undefined),
        [activePlan],
    );
    const planTimeline = useMemo(
        () => filterTimelineForPlan(timeline, activePlan?.id ?? ''),
        [timeline, activePlan],
    );

    const { suggestionsByDay, weekSuggestions, endDate, progressUpdatedAt, nextGame } =
        useMemo(() => {
            // When a custom plan is active, only its tasks are suggested. Pinned
            // tasks are resolved separately and stay available as explicit overrides.
            const algorithmUser = planTaskIds
                ? {
                      ...user,
                      customTasks: user.customTasks?.filter((t) => planTaskIds.has(t.id)),
                  }
                : user;
            // A custom plan can hold any task the user picked, including tasks
            // from other cohorts, so its tasks come from all requirements.
            const algorithmRequirements = planTaskIds
                ? allRequirements.filter((r) => planTaskIds.has(r.id))
                : requirements;

            const result = new TaskSuggestionAlgorithm(
                algorithmUser,
                algorithmRequirements,
                allRequirements,
                planTimeline,
                activePlan?.buckets.map((b) => b.taskIds),
            ).getWeeklySuggestions();

            const weekSuggestions: SuggestedTask[] = [];
            for (const day of result.suggestionsByDay) {
                for (const suggestion of day) {
                    const existing = weekSuggestions.find((s) => s.task.id === suggestion.task.id);
                    if (existing) {
                        existing.goalMinutes += suggestion.goalMinutes;
                    } else {
                        weekSuggestions.push({ ...suggestion });
                    }
                }
            }

            return { ...result, weekSuggestions };
        }, [user, requirements, allRequirements, planTimeline, planTaskIds, activePlan]);

    const savedPlan = user.weeklyPlan;
    const isLoading = requirements.length === 0;
    useEffect(() => {
        const tasks = planTasksToSave(savedPlan, suggestionsByDay, endDate);
        if (
            !isCurrentUser ||
            equalPlans(savedPlan, {
                tasks,
                endDate,
                progressUpdatedAt,
                pinnedTasks: pinnedTasks.map((t) => t.id),
                pinnedTaskMinutes: user.pinnedTaskMinutes,
                nextGame,
            }) ||
            isEmpty(suggestionsByDay) ||
            isLoading
        ) {
            return;
        }

        const newPlan = {
            endDate,
            tasks,
            progressUpdatedAt,
            pinnedTasks: pinnedTasks.map((t) => t.id),
            pinnedTaskMinutes: pickPinnedMinutes(
                pinnedTasks.map((t) => t.id),
                user.pinnedTaskMinutes,
            ),
            nextGame,
            skippedTasks:
                (savedPlan?.endDate ?? '') >= endDate ? savedPlan?.skippedTasks : undefined,
        };

        void api.updateUser({
            weeklyPlan: newPlan,
        });
    }, [
        isCurrentUser,
        savedPlan,
        suggestionsByDay,
        endDate,
        progressUpdatedAt,
        pinnedTasks,
        user.pinnedTaskMinutes,
        nextGame,
        api,
        isLoading,
    ]);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    return {
        ...trainingPlan,
        suggestionsByDay,
        weekSuggestions,
        endDate,
        startDate: startDate.toISOString(),
        isLoading,
        timeline,
        planTimeline,
    };
}

/**
 * Returns the number of minutes the user is expected to work today.
 * @param workGoal The work goal settings of the user.
 */
export function getTodaysWorkGoal(workGoal: WorkGoalSettings): number {
    const dayIndex = new Date().getDay();
    return workGoal.minutesPerDay[dayIndex];
}

/**
 * Returns true if the given saved plan is equivalent to the given new plan.
 * @param savedPlan The saved weekly plan to check.
 * @param newPlan The new plan to check.
 */
function equalPlans(
    savedPlan: WeeklyPlan | undefined,
    newPlan: {
        tasks: WeeklyPlan['tasks'];
        endDate: string;
        progressUpdatedAt: string;
        pinnedTasks: string[];
        pinnedTaskMinutes?: Record<string, number[]>;
        nextGame: string;
    },
) {
    if (!savedPlan) {
        return false;
    }
    if (savedPlan.endDate !== newPlan.endDate) {
        return false;
    }
    if (savedPlan.progressUpdatedAt !== newPlan.progressUpdatedAt) {
        return false;
    }
    if (savedPlan.nextGame !== newPlan.nextGame) {
        return false;
    }
    if (
        !pinnedMinutesMatch(
            newPlan.pinnedTasks,
            savedPlan.pinnedTaskMinutes,
            newPlan.pinnedTaskMinutes,
        )
    ) {
        return false;
    }
    for (let i = 0; i < newPlan.pinnedTasks.length; i++) {
        if (savedPlan.pinnedTasks?.[i] !== newPlan.pinnedTasks[i]) {
            return false;
        }
    }
    for (let i = 0; i < savedPlan.tasks.length; i++) {
        const savedTasks = savedPlan.tasks[i];
        const newTasks = newPlan.tasks[i];
        if (savedTasks.length !== newTasks.length) {
            return false;
        }
        for (let j = 0; j < savedTasks.length; j++) {
            if (
                savedTasks[j].id !== newTasks[j].id ||
                savedTasks[j].minutes !== newTasks[j].minutes
            ) {
                return false;
            }
        }
    }
    return true;
}

/** Returns only the minutes of tasks that are still pinned, or undefined if there are none. */
function pickPinnedMinutes(
    pinnedTaskIds: string[],
    pinnedTaskMinutes?: Record<string, number[]>,
): Record<string, number[]> | undefined {
    const result: Record<string, number[]> = {};
    for (const id of pinnedTaskIds) {
        if (pinnedTaskMinutes?.[id]) {
            result[id] = pinnedTaskMinutes[id];
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function isEmpty(suggestionsByDay: SuggestedTask[][]) {
    return suggestionsByDay.every((day) => day.length === 0);
}

/**
 * Returns the progress on the training plan based on the given parameters.
 * @param startDate The start date of the timeframe to calculate progress for.
 * @param endDate The end date of the timeframe to calculate progress for.
 * @param tasks The suggested tasks for the given timeframe.
 * @param timeline The user's timeline to use when calculating progress.
 * @returns The goal, the time worked on the suggested tasks, the total time worked
 * including extra tasks, the ids of any extra tasks worked on, and whether the suggested tasks have been worked on.
 */
export function useTrainingPlanProgress({
    startDate,
    endDate,
    tasks,
    timeline,
}: {
    startDate: string;
    endDate: string;
    tasks?: SuggestedTask[];
    timeline: TimelineEntry[];
}): [number, number, number, Set<string>, boolean] {
    return useMemo(() => {
        const goalMinutes = tasks?.reduce((sum, { goalMinutes }) => sum + goalMinutes, 0) ?? 0;
        const extraTaskIds = new Set<string>();

        let suggestedTimeWorked = 0;
        let totalTimeWorked = 0;
        let hasWorked = false;
        for (const entry of timeline) {
            const date = entry.date || entry.createdAt;
            const isSuggestedTask = tasks?.some(({ task }) => task.id === entry.requirementId);
            if (date >= startDate && date < endDate) {
                totalTimeWorked += entry.minutesSpent;
                if (!isSuggestedTask) {
                    extraTaskIds.add(entry.requirementId);
                } else {
                    suggestedTimeWorked += entry.minutesSpent;
                    hasWorked = true;
                }
            }
        }

        return [goalMinutes, suggestedTimeWorked, totalTimeWorked, extraTaskIds, hasWorked];
    }, [tasks, startDate, endDate, timeline]);
}
