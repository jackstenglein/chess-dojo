import { useRequirements } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import {
    getCategoryScore,
    getCohortScore,
    getCurrentCount,
    getTotalCategoryScore,
    getTotalScore,
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
import ScoreboardProgress from '@/scoreboard/ScoreboardProgress';
import { CrossedSwordIcon } from '@/style/CrossedSwordIcon';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import { CategoryColors } from '@/style/ThemeProvider';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { MIN_GAMES_FOR_ELO } from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Card, CardContent, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useTimelineContext } from '../activity/useTimeline';
import { CLASSICAL_GAMES_TASK_ID } from '../trainingPlan/suggestedTasks';

const categories = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
] as const;

interface DojoScoreCardProgressBarProps {
    title: string;
    value: number;
    min: number;
    max: number;
    label?: string;
    color: string;
}

const DojoScoreCardProgressBar: React.FC<DojoScoreCardProgressBarProps> = ({
    title,
    value,
    min,
    max,
    label,
    color,
}) => {
    return (
        <Grid
            size={{ xs: 12 }}
            display='flex'
            justifyContent={{
                xs: 'start',
            }}
        >
            <Stack alignItems='start' width={{ xs: 1 }} color={color}>
                <Typography variant='subtitle2' color='text.secondary' sx={{ mb: -0.5 }}>
                    {title}
                </Typography>
                <ScoreboardProgress
                    value={value}
                    min={min}
                    max={max}
                    label={label}
                    color='inherit'
                />
            </Stack>
        </Grid>
    );
};

function ClassicalGamesProgressBar({
    color,
    max,
    value,
}: {
    color: string;
    max: number;
    value: number;
}) {
    const t = useTranslations('profile.info');
    return (
        <Grid
            size={{ xs: 12 }}
            display='flex'
            justifyContent={{
                xs: 'start',
            }}
        >
            <Stack alignItems='start' width={{ xs: 1 }} color={color}>
                <Typography variant='subtitle2' color='text.secondary' sx={{ mb: -0.5 }}>
                    <CrossedSwordIcon
                        sx={{ fontSize: 'inherit', position: 'relative', top: '2px' }}
                    />{' '}
                    {t('classicalGames')}
                </Typography>
                <ScoreboardProgress
                    value={value}
                    min={0}
                    max={max}
                    label={`${value} / ${max}`}
                    color='inherit'
                />
            </Stack>
        </Grid>
    );
}

interface DojoScoreCardProps {
    user: User;
    cohort: string;
}

const DojoScoreCard: React.FC<DojoScoreCardProps> = ({ user, cohort }) => {
    const { user: viewer } = useAuth();
    const { requirements } = useRequirements(cohort, false);
    const { entries: timeline } = useTimelineContext();
    const t = useTranslations('profile.info');
    const tCategory = useTranslations('enums.requirementCategory');
    const tRating = useTranslations('enums.ratingSystem');

    const totalScore = getTotalScore(cohort, requirements);
    const cohortScore = getCohortScore(user, cohort, requirements, timeline);
    const percentComplete = Math.round((100 * cohortScore) / totalScore);

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

    return (
        <Card id='cohort-score-card' sx={{ height: 1 }}>
            <CardContent>
                <Grid container rowGap={2} columnSpacing={3} alignItems='center'>
                    {showRatingProgress && (
                        <Grid size={12}>
                            <Stack width={1}>
                                <Stack direction='row' alignItems='center' gap={0.5}>
                                    <RatingSystemIcon system={user.ratingSystem} size='small' />
                                    <Typography
                                        variant='body2'
                                        color='text.secondary'
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        {formatRatingSystem(user.ratingSystem, tRating)}
                                        {isCustom(user.ratingSystem) &&
                                            ratingSystemName &&
                                            ` (${ratingSystemName})`}
                                    </Typography>
                                </Stack>

                                <Stack direction='row' alignItems='center' gap={0.5}>
                                    <ScoreboardProgress
                                        value={currentRating}
                                        min={minRatingBoundary}
                                        max={graduationBoundary}
                                        color='primary'
                                        sx={{ height: '8px', borderRadius: '2px' }}
                                        label={`${currentRating} / ${graduationBoundary}`}
                                    />

                                    <CohortIcon
                                        cohort={nextCohort}
                                        tooltip={t('nextGraduation', { cohort, nextCohort })}
                                        size={20}
                                        sx={{ marginTop: '-3px' }}
                                    />
                                </Stack>
                            </Stack>
                        </Grid>
                    )}

                    {classicalGamesTask && (
                        <ClassicalGamesProgressBar
                            value={classicalGamesPlayed}
                            max={classicalGamesGoal ?? 0}
                            color='secondary.main'
                        />
                    )}

                    <DojoScoreCardProgressBar
                        title={t('allTasks')}
                        value={percentComplete}
                        min={0}
                        max={100}
                        label={`${percentComplete}%`}
                        color='inherit'
                    />

                    {categories.map((c, idx) => {
                        const value = getCategoryScore(user, cohort, c, requirements, timeline);
                        const total = getTotalCategoryScore(cohort, c, requirements);
                        const percent = Math.round((100 * value) / total);
                        return (
                            <DojoScoreCardProgressBar
                                key={idx}
                                title={tCategory.has(c) ? tCategory(c) : c}
                                value={percent}
                                min={0}
                                max={100}
                                label={`${percent}%`}
                                color={CategoryColors[c]}
                            />
                        );
                    })}

                    {timeManagementRating && timeManagementRating.currentRating > 0 && (
                        <Grid size={12}>
                            <Tooltip title='Time Management Rating is calculated from the classical games in your My Games folder (and subfolders).'>
                                <Stack direction='row' alignItems='center' gap={0.5}>
                                    <AccessTimeIcon
                                        sx={{ fontSize: 15, color: 'text.secondary' }}
                                    />
                                    <Typography
                                        variant='body2'
                                        color='text.secondary'
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        Time Management
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        color='text.secondary'
                                        sx={{ ml: 'auto', fontWeight: 'bold' }}
                                    >
                                        {timeManagementRating.currentRating}
                                        {(timeManagementRating.numGames ?? 0) < MIN_GAMES_FOR_ELO &&
                                            '?'}
                                    </Typography>
                                </Stack>
                            </Tooltip>
                        </Grid>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default DojoScoreCard;
