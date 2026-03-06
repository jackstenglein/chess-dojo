import { getTimeZonedDate } from '@/components/calendar/displayDate';
import {
    CustomTask,
    Requirement,
    RequirementCategory,
    RequirementProgress,
    getCurrentCount,
    getRemainingCategoryScorePercent,
    getRemainingScore,
    getTotalCount,
    getTotalScore,
    getUnitScore,
    isComplete,
    isRequirement,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import {
    ALL_COHORTS,
    GameScheduleEntry,
    User,
    WeeklyPlan,
    WorkGoalSettings,
    isFree,
} from '@/database/user';
import { DEFAULT_MINUTES_PER_TASK, DEFAULT_WORK_GOAL } from './workGoal';

export type Task = Requirement | CustomTask;

/** A suggestion to work on a task. */
export interface SuggestedTask {
    /** The suggested task. */
    task: Task;
    /** The suggested time to work on the task. */
    goalMinutes: number;
}

/** A week's worth of task suggestions. */
export interface WeeklySuggestedTasks {
    /**
     * The suggested tasks of the weekly plan indexed by day of the week.
     * Sunday is index 0; Saturday is index 6.
     */
    suggestionsByDay: SuggestedTask[][];
    /** The end date of the weekly plan. */
    endDate: string;
    /**
     * The date (in ISO 8601) of the user's most recent progress update at the time this
     * weekly plan was generated.
     */
    progressUpdatedAt: string;
    /**
     * The date (in ISO 8601) of the user's next scheduled game when the weekly plan
     * was last generated.
     */
    nextGame: string;
}

/** The id of the play classical games task. */
export const CLASSICAL_GAMES_TASK_ID = '38f46441-7a4e-4506-8632-166bcbe78baf';

/** The id of the annotate classical games task. */
export const ANNOTATE_GAMES_TASK_ID = '4d23d689-1284-46e6-b2a2-4b4bfdc37174';

/** The id of the review games with higher rated players task. */
const REVIEW_WITH_HIGHER_RATED_TASK_ID = '72241c06-5d06-4245-92da-9b294c6b736a';

/** The id of the schedule your next classical game task. */
export const SCHEDULE_CLASSICAL_GAME_TASK_ID = 'SCHEDULE_CLASSICAL_GAME';

/** Fake task for scheduling a classical game. */
export const SCHEDULE_CLASSICAL_GAME_TASK: Requirement = {
    id: SCHEDULE_CLASSICAL_GAME_TASK_ID,
} as Requirement;

/** The maximum number of suggested tasks returned by the suggestion algorithm. */
const MAX_SUGGESTED_TASKS = 3;

/**
 * The categories allowed in the suggested tasks algorithm. Their order here is used
 * for breaking ties in the algorithm if two categories have the same remaining Dojo
 * point percentage.
 */
const SUGGESTED_TASK_CATEGORIES = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
];

/** A list of IDs of tasks which cannot be suggested, unless the user has pinned them. */
const INELIGIBLE_SUGGESTED_TASKS = [
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
    '812adb60-d5fb-4655-8d22-d568a0dca547', // Postmortems
    '25230066-4eda-4886-a12c-39a5175ea632', // Online tactics tune up 0-1400
    'b55eda1d-11dc-4f6f-aa7b-b83a6339513f', // Online tactics tune up 1400-1800
    'b9ef52d2-795d-4005-b15a-437ee36a2c0a', // Online tactics tune up 1800+
    'b9b3e16b-613a-43a5-b5d5-77f827a0f5d0', // Dojo tactics lecture
    'd1688281-2bf0-4a70-9b0d-1f1484a0b9e5', // Dojo middlegame lecture
    '27d02505-64d7-4075-af02-769a54ca40df', // Dojo endgame lecture
    '7ceed525-82fd-4f2a-adbb-f6cbd7300979', // Dojo opening lecture
];

/**
 * Returns the remaining score of a task for the purposes of the suggested task algorithm.
 * If the task is atomic, the total score of the task is considered remaining. Otherwise,
 * the actual remaining score is returned.
 */
function getRemainingSuggestionScore(
    cohort: string,
    requirement: Requirement,
    progress: RequirementProgress,
    timeline: TimelineEntry[],
): number {
    if (requirement.atomic) {
        return getTotalScore(cohort, [requirement]);
    }
    return getRemainingScore(cohort, requirement, progress, timeline);
}

enum SuggestedTaskGenerationReason {
    Init,
    ProgressUpdate,
    PinnedTaskUpdate,
    WorkGoalUpdate,
    ScheduledGamesUpdateToday,
    ScheduledGamesUpdateFuture,
    SkippedTaskUpdate,
}

export class TaskSuggestionAlgorithm {
    private readonly requirements: Requirement[];
    private readonly customTasks: CustomTask[];
    private readonly pinnedTasks: Task[];
    private readonly timeline: TimelineEntry[];
    private readonly skippedTaskIds: string[];

    private user: User;
    private timePerTask: Record<string, number> = {};
    private weeklyPlan?: WeeklyPlan;

    constructor(
        user: User,
        cohortRequirements: Requirement[],
        allRequirements: Requirement[],
        timeline: TimelineEntry[],
    ) {
        this.user = JSON.parse(JSON.stringify(user)) as User;
        this.requirements = cohortRequirements;
        this.timeline = timeline;
        this.customTasks = this.user.customTasks ?? [];
        this.pinnedTasks =
            this.user.pinnedTasks
                ?.map(
                    (id) =>
                        this.customTasks.find((task) => task.id === id) ||
                        allRequirements.find((task) => task.id === id),
                )
                .filter((t) => !!t) ?? [];
        this.skippedTaskIds = this.user.weeklyPlan?.skippedTasks ?? [];
    }

    /**
     * @returns The suggested tasks for the current week.
     */
    getWeeklySuggestions(): WeeklySuggestedTasks {
        const { today, start: current, end } = getDates(this.user.weekStart);
        const taskList: SuggestedTask[][] = new Array(7).fill(0).map(() => []);
        this.timePerTask = {};
        const progressUpdatedAt = lastProgressUpdate(this.user);

        this.weeklyPlan = this.user.weeklyPlan;
        if (this.weeklyPlan && new Date(this.weeklyPlan.endDate).getTime() < end.getTime()) {
            this.weeklyPlan = undefined;
        }

        const reason = this.getGenerationReason(today, this.weeklyPlan);

        for (; current.getTime() < end.getTime(); current.setDate(current.getDate() + 1)) {
            const suggestions = this.getTasksForDay(reason, current, today);
            this.assignTimeToTasks(suggestions, current);
            this.incrementSuggestionsProgress(suggestions);
            taskList[current.getDay()] = suggestions;
        }

        const result = {
            suggestionsByDay: taskList,
            endDate: end.toISOString(),
            progressUpdatedAt,
            nextGame: getUpcomingGameSchedule(this.user.gameSchedule)[0]?.date ?? '',
        };
        return result;
    }

    /**
     * Returns the reason for regenerating suggested tasks based on the current
     * existing plan.
     * @param today The current date.
     * @param existingPlan The existing weekly suggestions, which may be overridden in the regeneration.
     * @returns The reason for regenerating suggested tasks.
     */
    getGenerationReason(today: Date, existingPlan?: WeeklyPlan): SuggestedTaskGenerationReason {
        if (!existingPlan) {
            return SuggestedTaskGenerationReason.Init;
        }

        if (
            existingPlan.tasks
                .slice(today.getDay())
                .some((day) => day.some((t) => this.skippedTaskIds.includes(t.id)))
        ) {
            return SuggestedTaskGenerationReason.SkippedTaskUpdate;
        }

        if (!weeklyPlanMatchesPinnedTasks(existingPlan, this.user.pinnedTasks ?? [])) {
            return SuggestedTaskGenerationReason.PinnedTaskUpdate;
        }

        if (existingPlan.progressUpdatedAt !== lastProgressUpdate(this.user)) {
            return SuggestedTaskGenerationReason.ProgressUpdate;
        }

        const upcomingGames = getUpcomingGameSchedule(this.user.gameSchedule);
        if ((upcomingGames[0]?.date ?? '') !== existingPlan.nextGame) {
            if (
                upcomingGames[0]?.date === today.toISOString() ||
                existingPlan.nextGame === today.toISOString()
            ) {
                return SuggestedTaskGenerationReason.ScheduledGamesUpdateToday;
            }
            return SuggestedTaskGenerationReason.ScheduledGamesUpdateFuture;
        }

        if (!weeklyPlanMatchesWorkGoal(existingPlan, this.user.workGoal || DEFAULT_WORK_GOAL)) {
            return SuggestedTaskGenerationReason.WorkGoalUpdate;
        }

        return SuggestedTaskGenerationReason.Init;
    }

    shouldRegenerateToday(reason: SuggestedTaskGenerationReason): boolean {
        return (
            reason === SuggestedTaskGenerationReason.PinnedTaskUpdate ||
            reason === SuggestedTaskGenerationReason.ScheduledGamesUpdateToday ||
            reason === SuggestedTaskGenerationReason.SkippedTaskUpdate
        );
    }

    shouldRegenerateFuture(reason: SuggestedTaskGenerationReason): boolean {
        return reason !== SuggestedTaskGenerationReason.Init;
    }

    /**
     * Adds the full task (if it exists) to the list of suggested tasks.
     * @param to The list to add the task to.
     * @param task The id and goal minutes to add to the list.
     */
    addTask(to: SuggestedTask[], task: { id: string; minutes: number }) {
        const { id, minutes } = task;

        if (id === SCHEDULE_CLASSICAL_GAME_TASK_ID) {
            to.push({
                task: SCHEDULE_CLASSICAL_GAME_TASK,
                goalMinutes: minutes,
            });
            return;
        }

        const fullTask =
            this.customTasks.find((t) => t.id === id) ?? this.requirements.find((t) => t.id === id);
        if (fullTask) {
            to.push({ task: fullTask, goalMinutes: minutes });
        }
    }

    /**
     * Increments progress in the mock user for the given list of suggestions.
     * @param suggestions The suggestions to increment progress for.
     */
    incrementSuggestionsProgress(suggestions: SuggestedTask[]) {
        for (const suggestion of suggestions) {
            if (suggestion.task.category === RequirementCategory.Welcome) {
                // All welcome tasks are 1 Dojo point regardless of length, so
                // we hard-code an hour's worth of time to mark the task as complete,
                // even if it only takes a few minutes.
                this.incrementProgress(suggestion.task, 60);
            } else {
                this.incrementProgress(suggestion.task, suggestion.goalMinutes);
            }
        }
    }

    /**
     * Increments progress in the mock user for the given task.
     * @param task The task to increment progress for.
     * @param time The number of minutes the mock user worked on the task.
     */
    incrementProgress(task: Task, time: number) {
        if (!isRequirement(task)) {
            return;
        }

        const totalTime = (this.timePerTask[task.id] ?? 0) + time;

        let progress = this.user.progress[task.id];
        if (!progress?.counts) {
            progress = {
                requirementId: task.id,
                counts: {
                    [this.user.dojoCohort]: task.startCount,
                    [ALL_COHORTS]: task.startCount,
                },
                minutesSpent: { [this.user.dojoCohort]: 0 },
                updatedAt: new Date().toISOString(),
            };
            this.user.progress[task.id] = progress;
        }

        const points = Math.floor(totalTime / 60);

        let increment = 1;
        const unitScore = getUnitScore(this.user.dojoCohort, task);
        if (unitScore > 0 && unitScore < 1) {
            increment = Math.ceil(1 / task.unitScore);
        } else if (unitScore === 0) {
            increment = getTotalCount(this.user.dojoCohort, task, true);
        }
        increment *= points;

        if (progress.counts) {
            if (task.numberOfCohorts === 0 || task.numberOfCohorts === 1) {
                progress.counts[ALL_COHORTS] += increment;
            } else {
                progress.counts[this.user.dojoCohort] += increment;
            }
        }

        this.timePerTask[task.id] = totalTime % 60;
    }

    /**
     * Returns an ordered list of suggested tasks for the given generation reason and day.
     * Note that some of the tasks may not have goal minutes assigned yet.
     * @param reason The reason the task list is being generated. This affects whether the
     * user's current task list is reused or invalidated.
     * @param day The day to generate the tasks for.
     * @param today The current date.
     * @returns A list of suggested tasks for the given reason and day. Some tasks may not
     * have goal minutes assigned yet.
     */
    getTasksForDay(reason: SuggestedTaskGenerationReason, day: Date, today: Date): SuggestedTask[] {
        const dayIdx = day.getDay();
        const suggestions: SuggestedTask[] = [];

        if (day.getTime() < today.getTime()) {
            if (!this.user.weeklyPlan) {
                // This is the user's first weekly plan, so we skip this day
                // and start them halfway through the week.
                return [];
            }

            if (this.weeklyPlan) {
                for (const task of this.weeklyPlan.tasks[dayIdx]) {
                    this.addTask(suggestions, task);
                }
                // We never update days in the past if the weekly plan is valid.
                return suggestions;
            }
        } else if (day.getTime() === today.getTime()) {
            if (!this.shouldRegenerateToday(reason)) {
                for (const task of this.weeklyPlan?.tasks[dayIdx] ?? []) {
                    this.addTask(suggestions, task);
                }
            }
        } else if (!this.shouldRegenerateFuture(reason)) {
            for (const task of this.weeklyPlan?.tasks[dayIdx] ?? []) {
                this.addTask(suggestions, task);
            }
        }

        if (suggestions.length < MAX_SUGGESTED_TASKS) {
            const algoSuggestions = this.getSuggestedTasks(day).map((t) => ({
                task: t,
                goalMinutes: 0,
            }));
            suggestions.push(
                ...algoSuggestions.filter(
                    (lhs) => !suggestions.some((rhs) => lhs.task.id === rhs.task.id),
                ),
            );
        }

        const welcomeTasks = this.getWelcomeTasks();
        return welcomeTasks.concat(
            suggestions.filter((lhs) => !welcomeTasks.some((rhs) => lhs.task.id === rhs.task.id)),
        );
    }

    /**
     * Assigns time to the given list of suggestions for the given day.
     * Welcome to the Dojo tasks are assumed to already have time assigned.
     * @param suggestions The list of suggestions to assign time to.
     * @param day The day to use when fetching the user's work goal.
     */
    assignTimeToTasks(suggestions: SuggestedTask[], day: Date) {
        if (suggestions.length === 0) {
            return;
        }

        const goalMinutes = (this.user.workGoal || DEFAULT_WORK_GOAL).minutesPerDay[day.getDay()];

        let tasksMissingTime = 0;
        let welcomeTaskMinutes = 0;

        for (const suggestion of suggestions) {
            if (suggestion.task.category === RequirementCategory.Welcome) {
                if (welcomeTaskMinutes < goalMinutes) {
                    suggestion.goalMinutes = suggestion.task.expectedMinutes;
                    welcomeTaskMinutes += suggestion.goalMinutes;
                }
            } else if (suggestion.task.id !== SCHEDULE_CLASSICAL_GAME_TASK_ID) {
                tasksMissingTime++;
            }
        }
        if (tasksMissingTime === 0) {
            return;
        }

        const otherTaskMinutes = goalMinutes - welcomeTaskMinutes;
        const maxTasksWithTime = Math.min(
            Math.max(1, Math.floor(otherTaskMinutes / DEFAULT_MINUTES_PER_TASK)),
            tasksMissingTime,
        );
        const minutesPerTask = Math.max(0, Math.floor(otherTaskMinutes / maxTasksWithTime));

        let tasksWithTime = 0;
        for (const suggestion of suggestions) {
            if (suggestion.task.category === RequirementCategory.Welcome) {
                continue;
            }
            if (
                tasksWithTime >= maxTasksWithTime ||
                suggestion.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID
            ) {
                suggestion.goalMinutes = 0;
            } else {
                suggestion.goalMinutes = minutesPerTask;
                tasksWithTime++;
            }
        }
    }

    /**
     * Returns a list of tasks to be shown to the user as suggested tasks.
     * We show at most MAX_SUGGESTED_TASKS tasks, in the following priority:
     *
     *   1. The user's pinned tasks.
     *   2. The unique task with the greatest remaining Dojo points in the unique category
     *      with the greatest remaining percentage of Dojo points.
     *
     * If play classical games would be suggested, then it is instead replaced with the
     * SCHEDULE_CLASSICAL_GAME pseudo-task. Play classical games will not be suggested if
     * the user already has an upcoming classical game scheduled. If the requested date
     * matches the date of the user's upcoming classical game, then play a classical game
     * is included as the first suggested task.
     *
     * Only categories in SUGGESTED_TASK_CATEGORIES are suggested (unless pinned by the user).
     * Categories are only repeated within the suggested tasks if it is not possible to
     * pick a unique category. Ties between categories are broken using the
     * SUGGESTED_TASK_CATEGORIES list.
     *
     * NOTE: some tasks (such as postmortems) are ineligible to be suggested and will not
     * be suggested unless the user has pinned them. These task IDs are listed in
     * INELIGIBLE_SUGGESTED_TASKS.
     *
     * @param date The date to get suggested tasks for.
     * @returns A list of at most MAX_SUGGESTED_TASKS suggested tasks.
     */
    getSuggestedTasks(date: Date): Task[] {
        const suggestedTasks: Task[] = [];

        const upcomingGames = getUpcomingGameSchedule(this.user.gameSchedule);
        for (const upcoming of upcomingGames) {
            if (toLocalDateString(new Date(upcoming.date)) === toLocalDateString(date)) {
                const playClassicalGames = this.requirements.find(
                    (r) => r.id === CLASSICAL_GAMES_TASK_ID,
                );
                if (playClassicalGames) {
                    suggestedTasks.push(playClassicalGames);
                }
                // We don't suggest other tasks if they are playing a classical game.
                return suggestedTasks;
            }
        }

        const pinnedTasks = this.pinnedTasks.filter(
            (t) =>
                !isComplete(
                    this.user.dojoCohort,
                    t,
                    this.user.progress[t.id],
                    this.timeline,
                    true,
                ) && !this.skippedTaskIds.includes(t.id),
        );
        suggestedTasks.push(...pinnedTasks);

        if (pinnedTasks.length >= MAX_SUGGESTED_TASKS) {
            return suggestedTasks;
        }

        const eligibleRequirements = getEligibleTasks({
            suggestedTasks,
            requirements: this.requirements,
            user: this.user,
            timeline: this.timeline,
            skippedTaskIds: this.skippedTaskIds,
        });
        if (eligibleRequirements.length === 0) {
            return suggestedTasks;
        }

        const categoryPercentages = SUGGESTED_TASK_CATEGORIES.map((category) => ({
            category,
            percent: getRemainingCategoryScorePercent(
                this.user,
                this.user.dojoCohort,
                category,
                this.requirements,
                this.timeline,
            ),
        })).sort((lhs, rhs) => rhs.percent - lhs.percent);

        let scheduleGame = false;

        while (suggestedTasks.length < MAX_SUGGESTED_TASKS) {
            const eligibleCategories = categoryPercentages.filter((item) =>
                eligibleRequirements.some((r) => r.category === item.category),
            );
            if (eligibleCategories.length === 0) {
                break;
            }

            let chosenCategories = eligibleCategories.filter(
                (item) => !suggestedTasks.some((r) => r.category === item.category),
            );
            if (chosenCategories.length === 0) {
                chosenCategories = eligibleCategories;
            }

            for (const { category } of chosenCategories) {
                const categoryRequirements = eligibleRequirements
                    .filter((r) => r.category === category)
                    .sort(
                        (lhs, rhs) =>
                            getRemainingSuggestionScore(
                                this.user.dojoCohort,
                                rhs,
                                this.user.progress[rhs.id],
                                this.timeline,
                            ) -
                            getRemainingSuggestionScore(
                                this.user.dojoCohort,
                                lhs,
                                this.user.progress[lhs.id],
                                this.timeline,
                            ),
                    );

                if (categoryRequirements[0].id === CLASSICAL_GAMES_TASK_ID) {
                    scheduleGame = true;
                    if (categoryRequirements[1]) {
                        suggestedTasks.push(categoryRequirements[1]);
                    }
                } else {
                    suggestedTasks.push(categoryRequirements[0]);
                }

                eligibleRequirements.splice(
                    eligibleRequirements.indexOf(categoryRequirements[0]),
                    1,
                );

                if (suggestedTasks.length >= MAX_SUGGESTED_TASKS) {
                    break;
                }
            }
        }

        if (scheduleGame) {
            suggestedTasks.unshift({
                id: SCHEDULE_CLASSICAL_GAME_TASK_ID,
            } as Requirement);
        }

        return suggestedTasks;
    }

    /**
     * Returns a list of suggested tasks in the Welcome to the Dojo category
     * that match the user's goal. These tasks are always suggested first if
     * the user has not completed them.
     * @param goalMinutes The user's total work goal for the day.
     * @param currentSuggestions The user's currently suggested tasks for the
     * day. If any welcome tasks are already included, they are returned unchanged.
     * This allows keeping completed welcome tasks in the list of suggestions.
     * @returns A list of suggested tasks in the Welcome to the Dojo category
     * and the expected time to complete them.
     */
    getWelcomeTasks(): SuggestedTask[] {
        const eligibleRequirements = this.requirements.filter(
            (r) =>
                r.category === RequirementCategory.Welcome &&
                !isComplete(this.user.dojoCohort, r, this.user.progress[r.id]) &&
                !this.skippedTaskIds.includes(r.id),
        );
        return eligibleRequirements.map((t) => ({ task: t, goalMinutes: 0 }));
    }
}

/**
 * Returns the list of tasks that are eligible to be suggested to the user.
 * @param suggestedTasks The list of already suggested tasks.
 * @param requirements The list of all requirements.
 * @param user The user to suggest tasks for.
 * @param timeline The user's timeline entries.
 * @param skippedTaskIds The ids of tasks the user has skipped.
 * @returns A subset of requirements that are eligible to be suggested to the user.
 */
function getEligibleTasks({
    suggestedTasks,
    requirements,
    user,
    timeline,
    skippedTaskIds,
}: {
    suggestedTasks: Task[];
    requirements: Requirement[];
    user: User;
    timeline: TimelineEntry[];
    skippedTaskIds: string[];
}) {
    const isFreeUser = isFree(user);
    let eligibleRequirements = requirements.filter(
        (r) =>
            (!isFreeUser || r.isFree) &&
            !INELIGIBLE_SUGGESTED_TASKS.includes(r.id) &&
            !suggestedTasks.some((t) => r.id === t.id) &&
            SUGGESTED_TASK_CATEGORIES.includes(r.category) &&
            !isComplete(user.dojoCohort, r, user.progress[r.id], timeline, false) &&
            !skippedTaskIds.includes(r.id),
    );

    const classicalGamesTask = requirements.find((r) => r.id === CLASSICAL_GAMES_TASK_ID);
    const annotateTask = eligibleRequirements.find((r) => r.id === ANNOTATE_GAMES_TASK_ID);
    const reviewTask = eligibleRequirements.find((r) => r.id === REVIEW_WITH_HIGHER_RATED_TASK_ID);

    if (
        annotateTask &&
        classicalGamesTask &&
        getCurrentCount({
            cohort: user.dojoCohort,
            requirement: annotateTask,
            progress: user.progress[ANNOTATE_GAMES_TASK_ID],
            timeline,
        }) >=
            getCurrentCount({
                cohort: user.dojoCohort,
                requirement: classicalGamesTask,
                progress: user.progress[CLASSICAL_GAMES_TASK_ID],
                timeline,
            })
    ) {
        // If the user is already caught up on annotations, then do not suggest that
        // they annotate a game.
        eligibleRequirements = eligibleRequirements.filter((r) => r.id !== ANNOTATE_GAMES_TASK_ID);
    }

    if (
        reviewTask &&
        classicalGamesTask &&
        getCurrentCount({
            cohort: user.dojoCohort,
            requirement: reviewTask,
            progress: user.progress[REVIEW_WITH_HIGHER_RATED_TASK_ID],
        }) >=
            getCurrentCount({
                cohort: user.dojoCohort,
                requirement: classicalGamesTask,
                progress: user.progress[CLASSICAL_GAMES_TASK_ID],
                timeline,
            })
    ) {
        // If the user is already caught up on reviewing with higher rated players, then do not
        // suggest that task.
        eligibleRequirements = eligibleRequirements.filter(
            (r) => r.id !== REVIEW_WITH_HIGHER_RATED_TASK_ID,
        );
    }

    const upcomingGames = getUpcomingGameSchedule(user.gameSchedule);
    if (upcomingGames.length > 0) {
        // If the user already has a game scheduled, then do not suggest that they play
        // a game.
        eligibleRequirements = eligibleRequirements.filter((r) => r.id !== CLASSICAL_GAMES_TASK_ID);
    }

    return eligibleRequirements;
}

/**
 * Returns the start date, the end date and today's date for generating weekly
 * suggested tasks. All dates are set to 00:00 in the current user's local time.
 * @param weekStart The index of the day the week starts on.
 * @returns The start date, the end date and today's date.
 */
function getDates(weekStart = 0) {
    const weekEnd = (weekStart + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff =
        weekEnd >= today.getDay() ? weekEnd - today.getDay() : 7 - today.getDay() + weekEnd;

    const end = new Date();
    end.setDate(end.getDate() + diff + 1);
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setDate(start.getDate() - 7);

    return { today, start, end };
}

/**
 * Returns the date in ISO 8601 of the user's most recent progress update,
 * or the empty string if the user has never updated their progress.
 * @param user The user to get the last progress update for.
 */
function lastProgressUpdate(user: User): string {
    let lastUpdate = '';
    for (const progress of Object.values(user.progress)) {
        if (progress.updatedAt > lastUpdate) {
            lastUpdate = progress.updatedAt;
        }
    }
    return lastUpdate;
}

/**
 * Returns a boolean indicating whether the given weekly plan matches the given
 * work goal. A weekly plan matches a work goal if for every day in the weekly
 * plan either there are no tasks or the total goal minutes for the day matches
 * the expected goal for the day based on the work goal settings.
 * @param weeklyPlan The weekly plan to check.
 * @param workGoal The work goal to check.
 * @returns True if the weekly plan matches the work goal.
 */
function weeklyPlanMatchesWorkGoal(weeklyPlan: WeeklyPlan, workGoal: WorkGoalSettings): boolean {
    for (let i = 0; i < weeklyPlan.tasks.length; i++) {
        const day = weeklyPlan.tasks[i];
        if (day.length === 0) {
            continue;
        }

        const maxTasks = Math.max(
            1,
            Math.floor(workGoal.minutesPerDay[i] / DEFAULT_MINUTES_PER_TASK),
        );
        const expectedTasksWithTime = day
            .filter(({ id }) => id !== SCHEDULE_CLASSICAL_GAME_TASK_ID)
            .slice(0, maxTasks).length;
        const expectedTime =
            expectedTasksWithTime * Math.floor(workGoal.minutesPerDay[i] / expectedTasksWithTime);

        let total = 0;
        for (const { minutes } of day) {
            total += minutes;
        }

        if (total !== expectedTime) {
            return false;
        }
    }
    return true;
}

/**
 * Returns a boolean indicating whether the given weekly plan matches the given pinned tasks.
 * A weekly plan matches pinned tasks if the plan has the same task ids in the same order as
 * the given pinned tasks.
 * @param weeklyPlan The weekly plan to check.
 * @param pinnedTasks The pinned tasks to check.
 * @returns True if the weekly plan matches the pinned tasks.
 */
function weeklyPlanMatchesPinnedTasks(weeklyPlan: WeeklyPlan, pinnedTasks: string[]): boolean {
    if (!weeklyPlan.pinnedTasks?.length && !pinnedTasks.length) {
        return true;
    }
    if (weeklyPlan.pinnedTasks?.length !== pinnedTasks.length) {
        return false;
    }
    for (let i = 0; i < weeklyPlan.pinnedTasks.length; i++) {
        if (weeklyPlan.pinnedTasks[i] !== pinnedTasks[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Returns a subset of the give game schedule, only including entries that are on or
 * after the current day, in the user's local timezone.
 * @param gameSchedule
 * @returns
 */
export function getUpcomingGameSchedule(gameSchedule?: GameScheduleEntry[]): GameScheduleEntry[] {
    const today = toLocalDateString(new Date());
    return (
        gameSchedule
            ?.filter((e) => toLocalDateString(new Date(e.date)) >= today)
            .sort((lhs, rhs) => lhs.date.localeCompare(rhs.date)) ?? []
    );
}

/**
 * Returns a date in the format 2025-12-31 in the user's local timezone.
 * @param date The date to convert.
 */
export function toLocalDateString(date: Date, timezone?: string): string {
    date = getTimeZonedDate(date, timezone);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}
