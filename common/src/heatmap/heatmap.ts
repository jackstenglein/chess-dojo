import { RequirementCategory } from '../database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '../database/timeline';
import { User } from '../database/user';
import { getTimeZonedDate } from '../dates/dates';

const MAX_LEVEL = 4;

interface BaseActivity {
    date: string;
    count: number;
    level: number;
}

interface CategoryCount {
    /** The count of the category spent on custom tasks. */
    custom: number;

    /** The count of the category spent on training plan tasks. */
    trainingPlan: number;
}

interface ExtendedBaseActivity extends BaseActivity {
    /** The total number of Dojo points earned on the given day. */
    dojoPoints?: number;

    /** The total number of minutes spent on the given day. */
    minutesSpent?: number;

    /** The count of the activity by category and field. */
    categoryCounts?: Partial<
        Record<RequirementCategory, { dojoPoints: CategoryCount; minutesSpent: CategoryCount }>
    >;

    /** Whether a classical game was played on this date. */
    gamePlayed?: boolean;

    /** The highest cohort the user graduated from on this date. */
    graduation?: string;
}

export interface Activity extends ExtendedBaseActivity {
    /** The total number of Dojo points earned on the given day. */
    dojoPoints: number;

    /** The total number of minutes spent on the given day. */
    minutesSpent: number;

    /** The count of the activity by category and field. */
    categoryCounts: Partial<
        Record<RequirementCategory, { dojoPoints: CategoryCount; minutesSpent: CategoryCount }>
    >;
}

export interface WeekSummary {
    /** The date that the week summary ends on. */
    date: string;

    /** The total number of Dojo points earned in the given week. */
    dojoPoints: number;

    /** The total number of minutes spent in the given week. */
    minutesSpent: number;

    /** The count of the activity by category. */
    categoryCounts: Partial<
        Record<RequirementCategory, { dojoPoints: CategoryCount; minutesSpent: CategoryCount }>
    >;

    /** Whether a classical game was played on this date. */
    gamePlayed?: boolean;

    /** The highest cohort the user graduated from on this date. */
    graduation?: string;
}

/**
 * Classical game requirement ID used to render the classical game sword icon.
 */
export const CLASSICAL_GAMES_REQUIREMENT_ID = '38f46441-7a4e-4506-8632-166bcbe78baf';

/**
 * Valid categories for the heatmap to render.
 */
const VALID_CATEGORIES = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
    RequirementCategory.NonDojo,
    RequirementCategory.Graduation,
];

/**
 * Gets a list of activities and the total count for the given parameters.
 * @param entries The timeline entries to extract data from.
 * @param minDate The minimum allowed date for the heatmap.
 * @param maxDate The maximum allowed date for the heatmap.
 * @param weekEndOn The day index the week ends on in the heatmap.
 * @param viewer The user viewing the site. Used for calculating timezones.
 * @returns A list of activities and the total count.
 */
export function getActivity(
    entries: TimelineEntry[],
    minDate: string,
    maxDate: string,
    weekEndOn: number,
    viewer?: User,
): {
    activities: Activity[];
    weekSummaries: Record<string, WeekSummary>;
    totalDojoPoints: number;
    totalMinutesSpent: number;
} {
    const activities: Record<string, Activity> = {};
    let totalDojoPoints = 0;
    let totalMinutesSpent = 0;

    for (const entry of entries) {
        if (!VALID_CATEGORIES.includes(entry.requirementCategory)) {
            continue;
        }
        if (entry.dojoPoints < 0 || entry.minutesSpent < 0) {
            continue;
        }
        if ((entry.date || entry.createdAt).slice(0, 10) > maxDate) {
            continue;
        }
        if ((entry.date || entry.createdAt) < minDate) {
            break;
        }

        let date = new Date(entry.date || entry.createdAt);
        date = getTimeZonedDate(date, viewer?.timezoneOverride);

        const dateStr = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

        const activity = activities[dateStr] || {
            date: dateStr,
            count: 0,
            level: 0,
            dojoPoints: 0,
            minutesSpent: 0,
            categoryCounts: {},
        };

        if (entry.requirementId === CLASSICAL_GAMES_REQUIREMENT_ID) {
            activity.gamePlayed = true;
        }
        if (
            entry.requirementId === TimelineSpecialRequirementId.Graduation &&
            (!activity.graduation || parseInt(activity.graduation) < parseInt(entry.cohort))
        ) {
            activity.graduation = entry.cohort;
        }

        activity.dojoPoints += entry.dojoPoints;
        activity.minutesSpent += entry.minutesSpent;

        const category = activity.categoryCounts[entry.requirementCategory] || {
            dojoPoints: { custom: 0, trainingPlan: 0 },
            minutesSpent: { custom: 0, trainingPlan: 0 },
        };
        if (entry.isCustomRequirement) {
            category.dojoPoints.custom += entry.dojoPoints;
            category.minutesSpent.custom += entry.minutesSpent;
        } else {
            category.dojoPoints.trainingPlan += entry.dojoPoints;
            category.minutesSpent.trainingPlan += entry.minutesSpent;
        }
        activity.categoryCounts[entry.requirementCategory] = category;

        totalDojoPoints += entry.dojoPoints;
        totalMinutesSpent += entry.minutesSpent;
        activities[dateStr] = activity;
    }

    if (!activities[minDate]) {
        activities[minDate] = {
            date: minDate,
            count: 0,
            level: 0,
            dojoPoints: 0,
            minutesSpent: 0,
            categoryCounts: {},
        };
    }

    if (!activities[maxDate]) {
        activities[maxDate] = {
            date: maxDate,
            count: 0,
            level: 0,
            dojoPoints: 0,
            minutesSpent: 0,
            categoryCounts: {},
        };
    }

    const finalActivities = Object.values(activities).sort((lhs, rhs) =>
        lhs.date.localeCompare(rhs.date),
    );

    const date = new Date(minDate);
    date.setUTCDate(date.getUTCDate() - date.getUTCDay() + weekEndOn);
    const weekSummaries: Record<string, WeekSummary> = {
        [date.toISOString().split('T')[0]]: defaultWeekSummary(date.toISOString().split('T')[0]),
    };

    for (const activity of finalActivities) {
        if (activity.date > date.toISOString()) {
            while (activity.date > date.toISOString()) {
                date.setUTCDate(date.getUTCDate() + 7);
            }
            weekSummaries[date.toISOString().split('T')[0]] = defaultWeekSummary(
                date.toISOString().split('T')[0],
            );
        }

        mergeActivity(weekSummaries[date.toISOString().split('T')[0]], activity);
    }

    return {
        activities: finalActivities,
        totalDojoPoints,
        totalMinutesSpent,
        weekSummaries,
    };
}

/**
 * Returns a default week summary.
 * @param date The date the week summary ends on.
 */
function defaultWeekSummary(date: string): WeekSummary {
    return { date, dojoPoints: 0, minutesSpent: 0, categoryCounts: {} };
}

/**
 * Merges the given activity into the given week summary.
 * @param target The week summary to merge into.
 * @param source The activity to merge from.
 */
function mergeActivity(target: WeekSummary, source: Activity) {
    if (source.gamePlayed) {
        target.gamePlayed = true;
    }
    if (
        source.graduation &&
        (!target.graduation || parseInt(target.graduation) < parseInt(source.graduation))
    ) {
        target.graduation = source.graduation;
    }

    target.dojoPoints += source.dojoPoints;
    target.minutesSpent += source.minutesSpent;

    for (const [category, count] of Object.entries(source.categoryCounts || {})) {
        const categoryCount = target.categoryCounts[category as RequirementCategory] || {
            dojoPoints: { custom: 0, trainingPlan: 0 },
            minutesSpent: { custom: 0, trainingPlan: 0 },
        };
        categoryCount.dojoPoints.custom += count.dojoPoints.custom;
        categoryCount.dojoPoints.trainingPlan += count.dojoPoints.trainingPlan;
        categoryCount.minutesSpent.custom += count.minutesSpent.custom;
        categoryCount.minutesSpent.trainingPlan += count.minutesSpent.trainingPlan;
        target.categoryCounts[category as RequirementCategory] = categoryCount;
    }
}

/**
 * Returns the level of the given count for the given max count.
 * Level will be in the range [0, MAX_LEVEL].
 * @param count The count to get the level for.
 * @param maxCount The max count. Counts >= this value will return MAX_LEVEL.
 */
export function calculateLevel(count: number | undefined, maxCount: number): number {
    if (!count) {
        return 0;
    }
    for (let i = 1; i < MAX_LEVEL; i++) {
        if (count < (maxCount / (MAX_LEVEL - 1)) * i) {
            return i;
        }
    }
    return MAX_LEVEL;
}

/**
 * Returns a CSS color-mix for the given color scale and level.
 * @param colors The color scale to calculate.
 * @param level The level to get the color for.
 */
export function calculateColor(colors: [from: string, to: string], level: number): string {
    const [from, to] = colors;
    const mixFactor = level / MAX_LEVEL;
    return mixColors(from, to, mixFactor);
}

/**
 * Mixes two colors by the given proportion. Manually recreates CSS color-mix, as it
 * is unavailable in older browsers.
 * @param color1 The first color to mix in hex.
 * @param color2 The second color to mix in hex.
 * @param weight The proportion of color2 in the mix. Specified as a decimal.
 * @returns A new hex color representing the mix.
 */
export function mixColors(color1: string, color2: string, weight: number) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb2) {
        return color1;
    }
    if (!rgb1) {
        return color2;
    }
    const mixedRgb = {
        r: Math.round(rgb1?.r * (1 - weight) + rgb2.r * weight),
        g: Math.round(rgb1?.g * (1 - weight) + rgb2.g * weight),
        b: Math.round(rgb1?.b * (1 - weight) + rgb2.b * weight),
    };
    return rgbToHex(mixedRgb);
}

/**
 * Converts the given hex color to RGB.
 * @param hex The hex color to convert.
 * @returns The RGB components of the color.
 */
function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

/**
 * Converts the given RGB color to hex.
 * @param rgb The RGB color to convert.
 * @returns The hex code of the color.
 */
function rgbToHex(rgb: { r: number; g: number; b: number }) {
    return `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)}`;
}
