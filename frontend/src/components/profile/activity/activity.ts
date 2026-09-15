import {
    CustomTask,
    getCurrentCount,
    getCurrentScore,
    isRequirement,
    Requirement,
    RequirementCategory,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, dojoCohorts, User } from '@/database/user';
import { CategoryColors } from '@/style/ThemeProvider';
import { PieChartData } from './PieChart';

export const ScoreCategories = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
];

export const RequirementColors = Object.values(CategoryColors).filter(
    (v, i) => Object.values(CategoryColors).indexOf(v) === i,
);

/**
 * Timeframes that can be used as options when viewing a user's activity.
 */
export enum Timeframe {
    AllTime = 'ALL_TIME',
    Last7Days = 'LAST_7_DAYS',
    Last30Days = 'LAST_30_DAYS',
    Last90Days = 'LAST_90_DAYS',
    Last365Days = 'LAST_365_DAYS',
}

/**
 * Converts a Timeframe into a user-friendly display string.
 * @param t The Timeframe to convert.
 * @returns A user-friendly display string describing the Timeframe.
 */
export function displayTimeframe(t: Timeframe): string {
    switch (t) {
        case Timeframe.AllTime:
            return 'All Time';
        case Timeframe.Last7Days:
            return 'Last 7 Days';
        case Timeframe.Last30Days:
            return 'Last 30 Days';
        case Timeframe.Last90Days:
            return 'Last 90 Days';
        case Timeframe.Last365Days:
            return 'Last 365 Days';
    }
}

/**
 * The number of milliseconds in a single day.
 */
const DayInMilliseconds = 24 * 60 * 60 * 1000;

/**
 * Converts a Timeframe to an ISO string.
 * @param t The Timeframe to convert.
 * @returns An ISO string of the specified Timeframe, or an empty string if t is AllTime.
 */
function timeframeToISO(t: Timeframe): string {
    switch (t) {
        case Timeframe.AllTime:
            return '';
        case Timeframe.Last7Days:
            return new Date(Date.now() - 7 * DayInMilliseconds).toISOString();
        case Timeframe.Last30Days:
            return new Date(Date.now() - 30 * DayInMilliseconds).toISOString();
        case Timeframe.Last90Days:
            return new Date(Date.now() - 90 * DayInMilliseconds).toISOString();
        case Timeframe.Last365Days:
            return new Date(Date.now() - 365 * DayInMilliseconds).toISOString();
    }
}

/**
 * Calculates the Dojo score data for the provided parameters.
 * @param user The user to calculate data for.
 * @param cohorts The cohorts to use when calculating the data.
 * @param timeframe The Timeframe to use as a cut-off when calculating.
 * @param timeline The timeline entries to use for the score data.
 * @param category The category to calculate data for.
 * @param requirements The list of requirements to calculate data for.
 * @returns A list of PieChartData objects containing the Dojo score data.
 */
export function getScoreChartData(
    user: User,
    cohorts: string[],
    timeframe: Timeframe,
    timeline: TimelineEntry[],
    category: string,
    requirements: Requirement[],
): PieChartData[] {
    if (category) {
        return getCategoryScoreChartData(
            user,
            cohorts,
            timeframe,
            timeline,
            category,
            requirements,
        );
    }

    return getTimeframeScoreChartData(user, cohorts, timeframe, timeline, requirements);
}

/**
 * Returns the all-time Dojo score data for the given user, cohort and requirements.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to use when calculating the score chart data.
 * @param requirements The list of requirements to use when calculating the score chart data.
 * @returns A list of PieChartData objects containing the all time Dojo score data.
 */
function getAllTimeScoreChartData(
    user: User,
    cohorts: string[],
    requirements: Requirement[],
): PieChartData[] {
    const data: Record<string, PieChartData> = {};

    for (const requirement of requirements) {
        const category = requirement.category;

        let reqCohorts = cohorts;
        if (cohorts.includes(ALL_COHORTS)) {
            reqCohorts = Object.keys(requirement.counts);
        }

        let score = 0;
        for (const cohort of reqCohorts) {
            score = Math.max(
                score,
                getCurrentScore(cohort, requirement, user.progress[requirement.id]),
            );
        }

        if (data[category]) {
            data[category].value += score;
        } else if (score > 0) {
            data[category] = {
                name: category,
                value: score,
                color: CategoryColors[category],
            };
        }
    }

    return Object.values(data);
}

/**
 * Returns the Dojo score data within a specific timeframe for the given user, cohort and requirements.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to use when calculating the score chart data.
 * @param timeframe The Timeframe to use when calculating the data.
 * @param requirements The list of requirements to use when calculating the score chart data.
 * @returns A list of PieChartData objects containing the Dojo score data within the Timeframe.
 */
function getTimeframeScoreChartData(
    user: User,
    cohorts: string[],
    timeframe: Timeframe,
    timeline: TimelineEntry[],
    requirements: Requirement[],
): PieChartData[] {
    if (timeframe === Timeframe.AllTime) {
        return getAllTimeScoreChartData(user, cohorts, requirements);
    }

    const data: Record<string, PieChartData> = {};
    const timeCutoff = timeframeToISO(timeframe);
    const requirementMap = requirements.reduce<Record<string, Requirement>>((m, r) => {
        m[r.id] = r;
        return m;
    }, {});

    for (const entry of timeline) {
        if (
            (!cohorts.includes(ALL_COHORTS) && !cohorts.includes(entry.cohort)) ||
            entry.requirementCategory === 'Non-Dojo'
        ) {
            continue;
        }
        const requirement = requirementMap[entry.requirementId];
        if (!requirement) {
            continue;
        }
        if ((entry.date || entry.createdAt) < timeCutoff) {
            break;
        }

        const score = entry.dojoPoints;

        if (data[requirement.category]) {
            data[requirement.category].value += score;
        } else if (score > 0) {
            data[requirement.category] = {
                name: requirement.category,
                value: score,
                color: CategoryColors[requirement.category],
            };
        }
    }

    return Object.values(data);
}

/**
 * Calculates the Dojo score of a given category for the provided parameters.
 * @param user The user to calculate the dojo score for.
 * @param cohorts The cohorts to calculate the score for.
 * @param timeframe The Timeframe to use as a cut off when calculating the score.
 * @param timeline The timeline entries to use for the score data.
 * @param category The requirement category to calculate data for.
 * @param requirements The list of requirements to calculate data for.
 * @returns A list of PieChartData objects containing the Dojo score data.
 */
function getCategoryScoreChartData(
    user: User,
    cohorts: string[],
    timeframe: Timeframe,
    timeline: TimelineEntry[],
    category: string,
    requirements: Requirement[],
): PieChartData[] {
    if (timeframe === Timeframe.AllTime) {
        return getAllTimeCategoryScoreChartData(user, cohorts, category, requirements);
    }

    const data: Record<string, PieChartData> = {};
    const timeCutoff = timeframeToISO(timeframe);
    const requirementMap = requirements.reduce<Record<string, Requirement>>((m, r) => {
        m[r.id] = r;
        return m;
    }, {});

    for (const entry of timeline) {
        if (
            (!cohorts.includes(ALL_COHORTS) && !cohorts.includes(entry.cohort)) ||
            entry.requirementCategory !== category
        ) {
            continue;
        }
        const requirement = requirementMap[entry.requirementId];
        if (!requirement) {
            continue;
        }
        if ((entry.date || entry.createdAt) < timeCutoff) {
            break;
        }

        const score = entry.dojoPoints;
        if (score === 0) {
            continue;
        }

        const name = requirement.shortName || requirement.name;
        if (data[name]) {
            data[name].value += score;
            data[name].count =
                (data[name].count || 0) + Math.max(entry.newCount - entry.previousCount, 0);
        } else {
            data[name] = {
                name,
                value: score,
                color: RequirementColors[Object.values(data).length % RequirementColors.length],
                count: Math.max(entry.newCount - entry.previousCount, 0),
            };
        }
    }

    return Object.values(data);
}

/**
 * Returns the all-time Dojo score for the given user, cohort, category and requirements.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to use when calculating the data.
 * @param category The requirement category to calculate data on.
 * @param requirements The list of requirements to use.
 * @returns A list of PieChartData objects containing the all-time Dojo score data for the given category.
 */
function getAllTimeCategoryScoreChartData(
    user: User,
    cohorts: string[],
    category: string,
    requirements: Requirement[],
): PieChartData[] {
    const data: Record<string, PieChartData> = {};

    if (cohorts.includes(ALL_COHORTS)) {
        cohorts = dojoCohorts;
    }

    for (const requirement of requirements) {
        if (category !== requirement.category) {
            continue;
        }

        let score = 0;
        let count = 0;

        let reqCohorts = cohorts;
        if (cohorts.includes(ALL_COHORTS)) {
            reqCohorts = Object.keys(requirement.counts);
        }

        for (const cohort of reqCohorts) {
            const cohortScore = getCurrentScore(cohort, requirement, user.progress[requirement.id]);
            if (cohortScore > score) {
                score = cohortScore;
                count = getCurrentCount({
                    cohort,
                    requirement,
                    progress: user.progress[requirement.id],
                });
            }
        }

        if (score === 0) {
            continue;
        }

        const name = requirement.shortName || requirement.name;
        if (data[name]) {
            data[name].value += score;
            data[name].count = (data[name].count || 0) + count;
        } else {
            data[name] = {
                name,
                value: score,
                color: RequirementColors[Object.values(data).length % RequirementColors.length],
                count,
            };
        }
    }

    return Object.values(data);
}

/**
 * Calculates the time spent by the user for the specified parameters.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to calculate data for.
 * @param timeframe The Timeframe to use as a cut off when calculating data.
 * @param timeline The timeline entries to use for the time data.
 * @param category The requirement category to calculate data for.
 * @param requirements The list of requirements to calculate data for.
 * @returns A list of PieChartData objects containing the time data.
 */
export function getTimeChartData(
    user: User,
    cohorts: string[],
    timeframe: Timeframe,
    timeline: TimelineEntry[],
    category: string,
    requirements: Requirement[],
): PieChartData[] {
    if (category) {
        return getCategoryTimeChartData(user, cohorts, timeframe, timeline, category, requirements);
    }

    return getTimeframeTimeChartData(user, cohorts, timeframe, timeline, requirements);
}

/**
 * Calculates the time spent by the user in the specified cohort and timeframe.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to calculate data for.
 * @param timeframe The Timeframe to use as a cut off when calculating data.
 * @param timeline The timeline entries to use for the time data.
 * @param requirements The list of requirements to calculate data for.
 * @returns A list of PieChartData objects containing the time data.
 */
function getTimeframeTimeChartData(
    user: User,
    cohorts: string[],
    timeframe: Timeframe,
    timeline: TimelineEntry[],
    requirements: Requirement[],
): PieChartData[] {
    if (timeframe === Timeframe.AllTime) {
        return getAllTimeTimeChartData(user, cohorts, requirements);
    }

    const data: Record<string, PieChartData> = {};
    const timeCutoff = timeframeToISO(timeframe);

    for (const entry of timeline) {
        if (
            (!cohorts.includes(ALL_COHORTS) && !cohorts.includes(entry.cohort)) ||
            entry.minutesSpent === 0
        ) {
            continue;
        }
        if ((entry.date || entry.createdAt) < timeCutoff) {
            break;
        }

        const categoryName = entry.requirementCategory;
        if (data[categoryName]) {
            data[categoryName].value += entry.minutesSpent;
        } else {
            data[categoryName] = {
                name: categoryName,
                value: entry.minutesSpent,
                color: CategoryColors[categoryName],
            };
        }
    }

    return Object.values(data);
}

/**
 * Calculates the all-time time spent for the given user, cohort and requirements.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to calculate the data for.
 * @param requirements The list of requirements to calculate the data for.
 * @returns A list of PieChartData objects containing the all-time time data.
 */
function getAllTimeTimeChartData(
    user: User,
    cohorts: string[],
    requirements: Requirement[],
): PieChartData[] {
    const requirementMap =
        requirements.reduce<Record<string, Requirement | CustomTask>>((map, r) => {
            map[r.id] = r;
            return map;
        }, {}) ?? {};

    user.customTasks?.forEach((t) => {
        requirementMap[t.id] = t;
    });

    const data: Record<string, PieChartData> = {};
    Object.values(user.progress).forEach((progress) => {
        if (!progress.minutesSpent) {
            return;
        }

        const requirement = requirementMap[progress.requirementId];
        if (!requirement) {
            return;
        }

        let reqCohorts = cohorts;
        if (cohorts.includes(ALL_COHORTS)) {
            reqCohorts = Object.keys(progress.minutesSpent);
        }

        for (const cohort of reqCohorts) {
            if (!progress.minutesSpent[cohort]) {
                continue;
            }

            const categoryName = requirement.category;
            if (data[categoryName]) {
                data[categoryName].value += progress.minutesSpent[cohort];
            } else {
                data[categoryName] = {
                    name: categoryName,
                    value: progress.minutesSpent[cohort],
                    color: CategoryColors[requirement.category],
                };
            }
        }
    });

    return Object.values(data);
}

/**
 * Calculates the time spent on a given category for the provided parameters.
 * @param user The user to calculate the time spent for.
 * @param cohorts The cohorts to calculate the time spent for.
 * @param timeframe The Timeframe to use as a cut off when calculating the time spent.
 * @param timeline The timeline entries to use for the time data.
 * @param category The category to calculate data for.
 * @param requirements The list of requirements to calculate data for.
 * @returns A list of PieChartData objects containing the time data.
 */
function getCategoryTimeChartData(
    user: User,
    cohorts: string[],
    timeframe: Timeframe,
    timeline: TimelineEntry[],
    category: string,
    requirements: Requirement[],
): PieChartData[] {
    if (timeframe === Timeframe.AllTime) {
        return getAllTimeCategoryTimeChartData(user, cohorts, category, requirements);
    }

    const requirementMap =
        requirements.reduce<Record<string, Requirement>>((map, r) => {
            map[r.id] = r;
            return map;
        }, {}) ?? {};

    const data: Record<string, PieChartData> = {};
    const timeCutoff = timeframeToISO(timeframe);

    for (const entry of timeline) {
        if (
            (!cohorts.includes(ALL_COHORTS) && !cohorts.includes(entry.cohort)) ||
            entry.requirementCategory !== category ||
            entry.minutesSpent === 0 ||
            entry.requirementName === ''
        ) {
            continue;
        }

        if ((entry.date || entry.createdAt) < timeCutoff) {
            break;
        }

        const requirement = requirementMap[entry.requirementId];
        const name = requirement?.shortName || requirement?.name || entry.requirementName;

        if (data[name]) {
            data[name].value += entry.minutesSpent;
        } else {
            data[name] = {
                name,
                value: entry.minutesSpent,
                color: RequirementColors[Object.values(data).length % RequirementColors.length],
            };
        }
    }

    return Object.values(data);
}

/**
 * Calculates the all-time time spent by the given user in the provided cohort and category.
 * @param user The user to calculate the data for.
 * @param cohorts The cohorts to use when calculating the data.
 * @param category The requirement category to calculate data for.
 * @param requirements The list of requirements to use.
 * @returns A list of PieChartData objects containing the all-time time data for the given category.
 */
function getAllTimeCategoryTimeChartData(
    user: User,
    cohorts: string[],
    category: string,
    requirements: Requirement[],
): PieChartData[] {
    const data: Record<string, PieChartData> = {};

    for (const requirement of (requirements as (Requirement | CustomTask)[]).concat(
        user.customTasks || [],
    )) {
        if (category !== requirement.category) {
            continue;
        }
        const progress = user.progress[requirement.id];
        if (!progress?.minutesSpent) {
            continue;
        }

        let reqCohorts = cohorts;
        if (cohorts.includes(ALL_COHORTS)) {
            reqCohorts = Object.keys(progress.minutesSpent);
        }

        const name = isRequirement(requirement)
            ? requirement.shortName || requirement.name
            : requirement.name;

        for (const cohort of reqCohorts) {
            if (!progress.minutesSpent[cohort]) {
                continue;
            }

            if (data[name]) {
                data[name].value += progress.minutesSpent[cohort];
            } else {
                data[name] = {
                    name,
                    value: progress.minutesSpent[cohort],
                    color: RequirementColors[Object.values(data).length % RequirementColors.length],
                };
            }
        }
    }
    return Object.values(data);
}
