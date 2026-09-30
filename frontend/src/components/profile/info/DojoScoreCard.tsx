import { useRequirements } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import {
    getCategoryScore,
    getCohortScore,
    getCurrentCount,
    getTotalCategoryScore,
    getTotalScore,
    isRequirementAvailableForSubscriptionTier,
    RequirementCategory,
} from '@/database/requirement';
import {
    dojoCohorts,
    formatRatingSystem,
    getCurrentRating,
    getMinRatingBoundary,
    getRatingBoundary,
    User,
} from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import { CrossedSwordIcon } from '@/style/CrossedSwordIcon';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import { CategoryColors } from '@/style/ThemeProvider';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { BarChart, TaskAlt } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useTimelineContext } from '../activity/useTimeline';
import { CLASSICAL_GAMES_TASK_ID } from '../trainingPlan/suggestedTasks';
import { TrainingPlanIcon } from '../trainingPlan/TrainingPlanIcon';
import { CardTitle } from './CardTitle';
import { TimeManagementRatingRow } from './TimeManagementRatingRow';

const categories = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
] as const;

/**
 * One row of the progress panel, styled like the weekly plan's category bars: an
 * icon and label on the left, the value on the right, and a slim bar beneath.
 */
function ProgressRow({
    icon,
    label,
    value,
    percent,
    color,
    trailing,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    percent: number;
    color: string;
    /** Shown after the bar, e.g. the next cohort's badge. */
    trailing?: React.ReactNode;
}) {
    return (
        <Stack spacing={0.75} data-testid='progress-row'>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', color, '& svg': { fontSize: '1rem' } }}>{icon}</Box>
                    <Typography
                        variant='caption'
                        noWrap
                        sx={{
                            color,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            lineHeight: 1,
                        }}
                    >
                        {label}
                    </Typography>
                </Box>
                <Box sx={{ flexGrow: 1 }} />
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        color: 'text.secondary',
                    }}
                >
                    {value}
                </Typography>
            </Stack>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                <LinearProgress
                    variant='determinate'
                    value={Math.max(0, Math.min(100, percent))}
                    sx={{
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundColor: color },
                    }}
                />
                {trailing}
            </Stack>
        </Stack>
    );
}

interface DojoScoreCardProps {
    user: User;
    cohort: string;
}

const DojoScoreCard: React.FC<DojoScoreCardProps> = ({ user, cohort }) => {
    const { user: viewer } = useAuth();
    const { requirements: cohortRequirements } = useRequirements(cohort, false);
    const { entries: timeline } = useTimelineContext();
    const t = useTranslations('profile.info');
    const theme = useTheme();
    const tCategory = useTranslations('enums.requirementCategory');
    const tRating = useTranslations('enums.ratingSystem');
    const subscriptionTier = getSubscriptionTier(user);
    const requirements = cohortRequirements.filter((requirement) =>
        isRequirementAvailableForSubscriptionTier(requirement, subscriptionTier),
    );

    const totalScore = getTotalScore(cohort, requirements);
    const cohortScore = getCohortScore(user, cohort, requirements, timeline);
    // Zero until the cohort's tasks have loaded, rather than NaN.
    const percentComplete = totalScore > 0 ? Math.round((100 * cohortScore) / totalScore) : 0;

    const classicalGamesTask = requirements.find((r) => r.id === CLASSICAL_GAMES_TASK_ID);
    const classicalGamesPlayed = getCurrentCount({
        cohort: user.dojoCohort,
        requirement: classicalGamesTask,
        progress: user.progress[CLASSICAL_GAMES_TASK_ID],
        timeline,
    });
    const classicalGamesGoal = classicalGamesTask?.counts[user.dojoCohort];

    const minRatingBoundary = getMinRatingBoundary(cohort, user.ratingSystem);
    const graduationBoundary = getRatingBoundary(cohort, user.ratingSystem);
    const currentRating = getCurrentRating(user);
    const showRatingProgress =
        (!viewer?.enableZenMode || viewer.username !== user.username) &&
        graduationBoundary &&
        graduationBoundary > 0 &&
        currentRating > 0;
    const nextCohort = dojoCohorts[dojoCohorts.indexOf(cohort) + 1];
    const ratingSystemName = user.ratings[user.ratingSystem]?.name;

    const timeManagementRating = user.timeManagementRating;

    // A custom rating's own name is shown only when it adds something: a system
    // named "Custom" reads "Custom", not "Custom (Custom)".
    const ratingSystemLabel = formatRatingSystem(user.ratingSystem, tRating);
    const ratingLabel =
        isCustom(user.ratingSystem) &&
        ratingSystemName &&
        ratingSystemName.trim().toLowerCase() !== ratingSystemLabel.trim().toLowerCase()
            ? `${ratingSystemLabel} (${ratingSystemName})`
            : ratingSystemLabel;

    const ratingPercent =
        showRatingProgress && graduationBoundary > minRatingBoundary
            ? (100 * (currentRating - minRatingBoundary)) / (graduationBoundary - minRatingBoundary)
            : 0;

    return (
        <Card id='cohort-score-card' variant='outlined' sx={{ height: 1 }}>
            <CardContent>
                <Box sx={{ mb: 2 }}>
                    <CardTitle icon={<BarChart sx={{ color: 'primary.main' }} aria-hidden />}>
                        {t('progressTitle')}
                    </CardTitle>
                </Box>

                <Stack spacing={2}>
                    {showRatingProgress && (
                        <ProgressRow
                            icon={<RatingSystemIcon system={user.ratingSystem} size='small' />}
                            label={ratingLabel}
                            value={`${currentRating} / ${graduationBoundary}`}
                            percent={ratingPercent}
                            color={theme.palette.primary.main}
                            trailing={
                                <CohortIcon
                                    cohort={nextCohort}
                                    tooltip={t('nextGraduation', { cohort, nextCohort })}
                                    size={20}
                                />
                            }
                        />
                    )}

                    <ProgressRow
                        icon={<TaskAlt />}
                        label={t('allTasks')}
                        value={`${percentComplete}%`}
                        percent={percentComplete}
                        color={theme.palette.text.primary}
                    />

                    {classicalGamesTask && (
                        <ProgressRow
                            icon={<CrossedSwordIcon />}
                            label={t('classicalGames')}
                            value={`${classicalGamesPlayed} / ${classicalGamesGoal ?? 0}`}
                            percent={
                                classicalGamesGoal
                                    ? (100 * classicalGamesPlayed) / classicalGamesGoal
                                    : 0
                            }
                            color={theme.palette.secondary.main}
                        />
                    )}

                    {categories.map((c) => {
                        const value = getCategoryScore(user, cohort, c, requirements, timeline);
                        const total = getTotalCategoryScore(cohort, c, requirements);
                        const percent = total > 0 ? Math.round((100 * value) / total) : 0;
                        return (
                            <ProgressRow
                                key={c}
                                icon={<TrainingPlanIcon category={c} />}
                                label={tCategory.has(c) ? tCategory(c) : c}
                                value={`${percent}%`}
                                percent={percent}
                                color={CategoryColors[c]}
                            />
                        );
                    })}

                    {timeManagementRating && timeManagementRating.currentRating > 0 && (
                        <Grid container>
                            <TimeManagementRatingRow timeManagementRating={timeManagementRating} />
                        </Grid>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default DojoScoreCard;
