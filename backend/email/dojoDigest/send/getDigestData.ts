import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { RequirementCategory } from '@jackstenglein/chess-dojo-common/src/database/requirement';
import { TimelineEntry } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import { User, WorkGoalHistory } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    Activity,
    calculateColor,
    calculateLevel,
    CLASSICAL_GAMES_REQUIREMENT_ID,
    getActivity,
    WeekSummary,
} from '@jackstenglein/chess-dojo-common/src/heatmap/heatmap';
import { dynamo, getUser } from '../../../directoryService/database';
import { BOX_SIZE, EMPTY_COLOR } from './heatmapStyle';
import { HEATMAP_LEGEND_MINIFIED } from './legend';

const weekHeaders = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

const CategoryColors: Record<RequirementCategory, string> = {
    [RequirementCategory.SuggestedTasks]: '#c27ba0',
    [RequirementCategory.Welcome]: '#c27ba0',
    [RequirementCategory.Games]: '#faa137',
    [RequirementCategory.Tactics]: '#82e356',
    [RequirementCategory.Middlegames]: '#5f5ffa',
    [RequirementCategory.Endgame]: '#916af7',
    [RequirementCategory.Opening]: '#f05b5b',
    [RequirementCategory.Graduation]: '#fc6156',
    [RequirementCategory.NonDojo]: '#dbdbdb',
    [RequirementCategory.Pinned]: '#c27ba0',
};

export interface DigestData {
    /** The formatted time string for the user. */
    time: string;
    /** The number of games the user has played. */
    games: number;
    /** The HTML of the heatmap for the user. */
    heatmapHtml: string;
}

/**
 * Returns the digest data for the given username.
 * @param year The year to get digest data for.
 * @param month The month to get digest data for. January is 1.
 * @param username The username to get digest data for.
 */
export async function getDigestData(
    year: number,
    month: number,
    username?: string,
): Promise<DigestData> {
    if (!username) {
        return { time: '', games: 0, heatmapHtml: '' };
    }

    const user = await getUser(username);
    const input = new QueryCommand({
        KeyConditionExpression: `#owner = :owner`,
        ExpressionAttributeNames: { '#owner': 'owner' },
        ExpressionAttributeValues: { ':owner': { S: username } },
        TableName: `${process.env.stage}-timeline`,
        ScanIndexForward: false,
    });
    const output = await dynamo.send(input);
    const timeline = (output.Items?.map((item) => unmarshall(item)) ?? []) as TimelineEntry[];
    timeline.sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));

    const weekStart = user.weekStart ?? 0;
    const weekEnd = (weekStart + 6) % 7;

    const minDate = `${year}-${`${month}`.padStart(2, '0')}-01`;
    const d = new Date(minDate);
    d.setDate(d.getDate() - 7);
    const activityMinDate = d.toISOString().slice(0, 10);

    const maxDate = `${year}-${`${month}`.padStart(2, '0')}-31`;

    const { activities, weekSummaries, totalMinutesSpent } = getActivity(
        timeline,
        activityMinDate,
        maxDate,
        weekEnd,
        user,
    );
    if (totalMinutesSpent === 0) {
        return { time: '', games: 0, heatmapHtml: '' };
    }

    const activityMap = activities.reduce(
        (sum, activity) => {
            sum[activity.date] = activity;
            return sum;
        },
        {} as Record<string, Activity>,
    );

    return {
        time: formatTime(totalMinutesSpent),
        games: getGamesPlayed(minDate, maxDate, timeline),
        heatmapHtml: generateMonthHeatmapHtml(
            year,
            month,
            weekStart,
            weekEnd,
            activityMap,
            weekSummaries,
            user,
        ),
    };
}

/**
 * Returns the number of games played within the given range (inclusive).
 * @param minDate The minimum allowed date to count entries for.
 * @param maxDate The maximum allowed date to count entries for.
 * @param timeline The timeline to count entries from.
 */
function getGamesPlayed(minDate: string, maxDate: string, timeline: TimelineEntry[]): number {
    let games = 0;
    for (const entry of timeline) {
        if ((entry.date || entry.createdAt).slice(0, 10) > maxDate) {
            continue;
        }
        if ((entry.date || entry.createdAt) < minDate) {
            break;
        }

        if (entry.requirementId === CLASSICAL_GAMES_REQUIREMENT_ID) {
            games += entry.newCount - entry.previousCount;
        }
    }
    return games;
}

/**
 * Generates an HTML string for an email heatmap.
 * @param year The year (e.g., 2026)
 * @param month The month index (1-12)
 * @param data An object mapping the day of the month to a numerical value
 */
function generateMonthHeatmapHtml(
    year: number,
    month: number,
    weekStart: number,
    weekEnd: number,
    activities: Record<string, Activity>,
    weekSummaries: Record<string, WeekSummary>,
    user: User,
): string {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)

    let html = `
    <table align="center" border="0" cellpadding="0" cellspacing="3" style="font-family: sans-serif; border-collapse: separate; padding-bottom: 10px;">
      <thead><tr style="font-size: 10px; color: #777; text-align: center;">${generateCalendarHeadersHtml(weekStart, weekEnd)}</tr>
      </thead><tbody><tr>`;

    // Add empty padding cells for the first week
    for (let i = weekStart; i < firstDayOfWeek; i = (i + 1) % 7) {
        html += `<td style="width: ${BOX_SIZE}px; height: ${BOX_SIZE}px;"></td>`;
    }

    // Add the actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
        html += generateBlockHtml(date, activities);

        // Start a new row on week end
        if ((day - 1 + firstDayOfWeek) % 7 === weekEnd) {
            html += generateWeekSummaryHtml(date, weekSummaries, user.workGoalHistory ?? []);
            html += `</tr>`;
            if (day !== daysInMonth) {
                html += `<tr>`;
            }
        }
    }

    // Close out the table
    html += `</tbody></table>`;
    html += HEATMAP_LEGEND_MINIFIED;

    return html;
}

function generateCalendarHeadersHtml(weekStart: number, weekEnd: number): string {
    let html = '';
    for (let i = weekStart; i !== weekEnd; i = (i + 1) % 7) {
        html += `<th width="${BOX_SIZE}">${weekHeaders[i]}</th>`;
    }
    html += `<th width="${BOX_SIZE}">${weekHeaders[weekEnd]}</th>`;
    html += `<th>Week Goal</th>`;
    return html;
}

function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    minutes = Math.round(minutes % 60);
    if (hours === 0) {
        return `${minutes}m`;
    }
    if (minutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
}

function generateBlockHtml(date: string, activities: Record<string, Activity>): string {
    const activity = activities[date];
    let html = `<td title="${formatTime(activity?.minutesSpent ?? 0)} on ${date}" class="heatmap-block`;

    if (activity?.gamePlayed) {
        html += ` swords"></td>`;
        return html;
    }

    if (!activity || activity.minutesSpent === 0) {
        html += `"></td>`;
        return html;
    }

    let maxCount: number | undefined = undefined;
    let maxCategory: RequirementCategory | undefined = undefined;
    for (const category of Object.values(RequirementCategory)) {
        const count = activity.categoryCounts?.[category as RequirementCategory];
        if (!count) {
            continue;
        }

        const currentCount = count.minutesSpent.custom + count.minutesSpent.trainingPlan;
        if (maxCount === undefined || currentCount > maxCount) {
            maxCategory = category as RequirementCategory;
            maxCount = currentCount;
        }
    }

    if (!maxCategory) {
        html += `"></td>`;
        return html;
    }

    const level = calculateLevel(activity.minutesSpent, 60);
    const color = calculateColor([EMPTY_COLOR, CategoryColors[maxCategory]], level);

    html += `" style="background-color: ${color};"></td>`;
    return html;
}

function generateWeekSummaryHtml(
    date: string,
    weekSummaries: Record<string, WeekSummary>,
    workGoalHistory: WorkGoalHistory[],
): string {
    const workGoal = workGoalHistory.findLast((history) => history.date.split('T')[0] <= date)
        ?.workGoal ?? { minutesPerDay: weekHeaders.map(() => 60) };
    const goalMinutes = workGoal.minutesPerDay.reduce((sum, value) => sum + value, 0);

    const summary = weekSummaries[date];
    const minutesSpent = summary?.minutesSpent ?? 0;
    if (minutesSpent < goalMinutes) {
        return `<td class="heatmap-block cross" title="Missed Weekly Goal (${formatTime(minutesSpent)} / ${formatTime(goalMinutes)})"></td>`;
    }

    return `<td class="heatmap-block checkmark" title="Met Weekly Goal (${formatTime(minutesSpent)} / ${formatTime(goalMinutes)})"></td>`;
}
