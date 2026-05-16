import { useAuth } from '@/auth/Auth';
import { TimelineProvider } from '@/components/profile/activity/useTimeline';
import { TaskDialog, TaskDialogView } from '@/components/profile/trainingPlan/TaskDialog';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Graduation, isGraduation } from '../database/graduation';
import {
    Requirement,
    ScoreboardDisplay,
    getCurrentCount,
    getCurrentScore,
    getTotalScore,
} from '../database/requirement';
import { ScoreboardSummary, isScoreboardSummary } from '../database/scoreboard';
import {
    MinutesSpentKey,
    User,
    formatRatingSystem,
    getNormalizedRating,
    getCurrentRating as getUserCurrentRating,
    getStartRating as getUserStartRating,
    isCustom,
} from '../database/user';
import ScoreboardCheck from './ScoreboardCheck';
import ScoreboardProgress from './ScoreboardProgress';

export type ScoreboardRow = User | Graduation | ScoreboardSummary;

interface HeaderProps {
    requirement: Requirement;
    cohort: string;
}

const Header: React.FC<HeaderProps> = ({ requirement, cohort }) => {
    const [showReqModal, setShowReqModal] = useState(false);
    const { user } = useAuth();

    const totalCount = requirement.counts[cohort] || 0;
    let headerName = requirement.name.replaceAll('{{count}}', `${totalCount}`);
    if (requirement.scoreboardDisplay === ScoreboardDisplay.Checkbox && totalCount > 1) {
        headerName += ` (${totalCount})`;
    }

    return (
        <>
            <div onClick={() => setShowReqModal(true)}>{headerName}</div>
            {user && (
                <TimelineProvider owner={user.username}>
                    <TaskDialog
                        open={showReqModal}
                        onClose={() => setShowReqModal(false)}
                        task={requirement}
                        initialView={TaskDialogView.Details}
                        cohort={cohort}
                        progress={user.progress[requirement.id]}
                    />
                </TimelineProvider>
            )}
        </>
    );
};

/**
 * Returns the progress object for the given ScoreboardRow or an empty
 * object if the row is a ScoreboardSummary.
 * @param row The ScoreboardRow to get the progress for.
 * @returns The progress for the row.
 */
function getProgress(row: ScoreboardRow) {
    if (isScoreboardSummary(row)) {
        return {};
    }
    return row.progress;
}

export function getColumnDefinition(
    requirement: Requirement,
    cohort: string,
): GridColDef<ScoreboardRow> {
    const totalCount = requirement.counts[cohort] || 0;

    const valueGetter = (_value: never, row: ScoreboardRow) => {
        return getCurrentCount({ cohort, requirement, progress: getProgress(row)[requirement.id] });
    };

    const renderCell = (params: GridRenderCellParams<ScoreboardRow>) => {
        const score = getCurrentCount({
            cohort,
            requirement,
            progress: getProgress(params.row)[requirement.id],
        });
        switch (requirement.scoreboardDisplay) {
            case ScoreboardDisplay.Checkbox:
                return (
                    <ScoreboardCheck
                        fullHeight
                        value={score}
                        total={totalCount}
                        username={params.row.username}
                        cohort={cohort}
                        requirement={requirement}
                    />
                );

            case ScoreboardDisplay.Unspecified:
            case ScoreboardDisplay.ProgressBar:
            case ScoreboardDisplay.Minutes:
            default:
                return (
                    <ScoreboardProgress
                        fullHeight
                        value={score}
                        max={totalCount}
                        min={requirement.startCount}
                        username={params.row.username}
                        cohort={cohort}
                        requirement={requirement}
                        suffix={requirement.progressBarSuffix}
                        isTime={requirement.scoreboardDisplay === ScoreboardDisplay.Minutes}
                    />
                );
        }
    };

    let headerName = requirement.name;
    if (requirement.scoreboardDisplay === ScoreboardDisplay.Checkbox && totalCount > 1) {
        headerName += ` (${totalCount})`;
    }

    return {
        field: requirement.id,
        headerName: headerName,
        renderHeader: () => <Header requirement={requirement} cohort={cohort} />,
        minWidth: 250,
        valueGetter,
        renderCell,
        headerAlign: 'center',
    };
}

export function getCohortScore(
    row: ScoreboardRow,
    cohort: string | undefined,
    requirements: Requirement[],
): number {
    if (!cohort) {
        return 0;
    }

    const progress = getProgress(row);
    let score = 0;
    for (const requirement of requirements) {
        score += getCurrentScore(cohort, requirement, progress[requirement.id]);
    }
    return Math.round(score * 100) / 100;
}

export function getTotalTime(
    row: ScoreboardRow,
    cohort: string | undefined,
    nonDojoOnly: boolean,
    requirements: Requirement[],
): number {
    if (!cohort) {
        return 0;
    }

    const requirementIds = new Set(
        requirements.filter((r) => (r.category === 'Non-Dojo') === nonDojoOnly).map((r) => r.id),
    );

    let result = 0;
    for (const progress of Object.values(getProgress(row))) {
        if (progress.minutesSpent[cohort] && requirementIds.has(progress.requirementId)) {
            result += progress.minutesSpent[cohort];
        }
    }
    return result;
}

export function getCategoryScore(
    row: ScoreboardRow,
    cohort: string | undefined,
    category: string,
    requirements: Requirement[],
): number {
    if (!cohort) {
        return 0;
    }

    const progress = getProgress(row);
    let score = 0;
    for (const requirement of requirements) {
        if (requirement.category === category) {
            score += getCurrentScore(cohort, requirement, progress[requirement.id]);
        }
    }
    return Math.round(score * 100) / 100;
}

export function getPercentComplete(
    row: ScoreboardRow,
    cohort: string | undefined,
    requirements: Requirement[],
): number {
    if (!cohort) {
        return 0;
    }

    const totalScore = getTotalScore(cohort, requirements);
    const userScore = getCohortScore(row, cohort, requirements);
    return (userScore / totalScore) * 100;
}

export function formatPercentComplete(value: number) {
    return `${Math.round(value)}%`;
}

export function getRatingSystem(
    row: ScoreboardRow,
    t: ReturnType<typeof useTranslations<'scoreboard'>>,
    tRating: ReturnType<typeof useTranslations<'enums.ratingSystem'>>,
) {
    if (isCustom(row.ratingSystem) && !isGraduation(row) && row.ratings[row.ratingSystem]?.name) {
        return t('customRating', { name: row.ratings[row.ratingSystem]?.name ?? '' });
    }
    return formatRatingSystem(row.ratingSystem, tRating);
}

export function getStartRating(row: ScoreboardRow): number {
    if (isGraduation(row)) {
        return row.startRating;
    }

    return getUserStartRating(row);
}

export function getCurrentRating(row: ScoreboardRow): number {
    if (isGraduation(row)) {
        return row.currentRating;
    }

    return getUserCurrentRating(row);
}

export function getRatingChange(row: ScoreboardRow) {
    const startRating = getStartRating(row);
    const currentRating = getCurrentRating(row);
    return currentRating - startRating;
}

export function getNormalizedRatingRow(row: ScoreboardRow): number {
    return getNormalizedRating(getCurrentRating(row), row.ratingSystem);
}

export function getMinutesSpent(row: ScoreboardRow, key: MinutesSpentKey): number {
    if (isGraduation(row)) {
        return 0;
    }
    return row.minutesSpent ? row.minutesSpent[key] || 0 : 0;
}
