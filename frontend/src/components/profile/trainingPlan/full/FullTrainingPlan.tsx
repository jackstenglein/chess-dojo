import {
    CustomTask,
    getCategoryScore,
    getTotalCategoryScore,
    isComplete,
    isRequirementAvailableForSubscriptionTier,
    Requirement,
    RequirementCategory,
} from '@/database/requirement';
import { dojoCohorts } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import CohortIcon from '@/scoreboard/CohortIcon';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { CategoryColors } from '@/style/ThemeProvider';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { UnfoldLess, UnfoldMore } from '@mui/icons-material';
import { IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, use, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
    getUpcomingGameSchedule,
    MINIMUM_TASKS,
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
} from '../suggestedTasks';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { FullTrainingPlanSection, Section } from './FullTrainingPlanSection';

/** Renders the full training plan view of the training plan tab. */
export function FullTrainingPlan({
    cohort,
    setCohort,
    headerAction,
}: {
    cohort: string;
    setCohort: (c: string) => void;
    /** Shown on the heading row, just before the expand/collapse toggle. */
    headerAction?: ReactNode;
}) {
    const {
        user,
        timeline,
        request: requirementRequest,
        allRequirements,
        pinnedTasks,
        openPinEditor: onPinClick,
        isCurrentUser,
    } = use(TrainingPlanContext);

    const t = useTranslations('profile.trainingPlan.full');
    // Completed tasks are shown or hidden from each category's own link.
    const [showCompleted, setShowCompleted] = useShowCompleted(isCurrentUser);

    const [expanded, setExpanded] = useState<Partial<Record<RequirementCategory, boolean>>>({
        [RequirementCategory.Pinned]: true,
        [RequirementCategory.Welcome]: false,
        [RequirementCategory.Games]: false,
        [RequirementCategory.Tactics]: false,
        [RequirementCategory.Middlegames]: false,
        [RequirementCategory.Endgame]: false,
        [RequirementCategory.Opening]: false,
        [RequirementCategory.Graduation]: false,
        [RequirementCategory.NonDojo]: false,
    });

    const sections: Section[] = useMemo(() => {
        const sections: Section[] = [];
        const subscriptionTier = getSubscriptionTier(user);

        const requirements = allRequirements.filter(
            (r) =>
                r.counts[cohort] && isRequirementAvailableForSubscriptionTier(r, subscriptionTier),
        );
        const tasks = (requirements as (Requirement | CustomTask)[]).concat(user.customTasks ?? []);
        for (const task of tasks) {
            if (task.counts[cohort] === undefined) {
                continue;
            }

            const s = sections.find((s) => s.category === task.category);
            const complete = MINIMUM_TASKS.has(task.id)
                ? false
                : task.id !== SCHEDULE_CLASSICAL_GAME_TASK_ID
                  ? isComplete(cohort, task, user.progress[task.id], timeline, false)
                  : getUpcomingGameSchedule(user.gameSchedule).length > 0;

            if (s === undefined) {
                const value = getCategoryScore(user, cohort, task.category, requirements, timeline);
                const total = getTotalCategoryScore(cohort, task.category, requirements);
                const percent = Math.round((100 * value) / total);

                sections.push({
                    category: task.category,
                    uncompletedTasks: complete ? [] : [task],
                    completedTasks: complete ? [task] : [],
                    progressBar: percent,
                    color: CategoryColors[task.category],
                });
            } else if (complete) {
                s.completedTasks.push(task);
            } else {
                s.uncompletedTasks.push(task);
            }
        }

        // Graduating is prompted from Today and tracked in the sidebar's rating bar,
        // so it isn't a section of the full plan.
        return sections.filter((section) => section.category !== RequirementCategory.Graduation);
    }, [allRequirements, user, cohort, timeline, t]);

    if (requirementRequest.isLoading() || sections.length === 0) {
        return <LoadingPage />;
    }

    const onChangeCohort = (cohort: string) => {
        setCohort(cohort);
    };

    const toggleExpand = (category: RequirementCategory) => {
        setExpanded({
            ...expanded,
            [category]: !expanded[category],
        });
    };

    // The toggle collapses everything once every section shown is open, and
    // otherwise expands them all.
    const allExpanded = sections.every((section) => expanded[section.category]);

    const onExpandAll = () => {
        setExpanded((c) =>
            Object.keys(c).reduce<Record<string, boolean>>((acc, cat) => {
                acc[cat as RequirementCategory] = true;
                return acc;
            }, {}),
        );
    };

    const onCollapseAll = () => {
        setExpanded((c) =>
            Object.keys(c).reduce<Record<string, boolean>>((acc, cat) => {
                acc[cat as RequirementCategory] = false;
                return acc;
            }, {}),
        );
    };

    return (
        <Stack
            spacing={2}
            sx={{
                width: 1,
            }}
        >
            <Stack
                direction='row'
                sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1.5 }}
            >
                <Typography
                    variant='h5'
                    sx={{
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <ChessDojoIcon
                        sx={{ color: 'primary.main', fontSize: 'inherit' }}
                        titleAccess='ChessDojo'
                    />
                    {t('heading')}
                </Typography>

                <TextField
                    id='training-plan-cohort-select'
                    select
                    label={t('cohort')}
                    value={cohort}
                    onChange={(event) => onChangeCohort(event.target.value)}
                    size='small'
                    sx={{ borderBottom: 0 }}
                >
                    {dojoCohorts.map((option) => (
                        <MenuItem key={option} value={option}>
                            <CohortIcon
                                cohort={option}
                                sx={{ marginRight: '0.6rem', verticalAlign: 'middle' }}
                                tooltip=''
                                size={30}
                            />{' '}
                            {option}
                        </MenuItem>
                    ))}
                </TextField>

                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        justifyContent: 'end',
                        alignItems: 'center',
                        ml: 'auto',
                    }}
                >
                    {headerAction}
                    <Tooltip title={allExpanded ? t('collapseAll') : t('expandAll')}>
                        <IconButton
                            onClick={allExpanded ? onCollapseAll : onExpandAll}
                            aria-label={allExpanded ? t('collapseAll') : t('expandAll')}
                            sx={{ color: 'text.secondary' }}
                            data-testid='full-plan-expand-toggle'
                        >
                            {allExpanded ? <UnfoldLess /> : <UnfoldMore />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Stack
                sx={{
                    alignItems: 'start',
                    width: 1,
                }}
            >
                {sections.map((section) => (
                    <FullTrainingPlanSection
                        key={section.category}
                        section={section}
                        expanded={expanded[section.category]}
                        toggleExpand={toggleExpand}
                        user={user}
                        isCurrentUser={isCurrentUser}
                        cohort={cohort}
                        onPinClick={onPinClick}
                        pinnedTasks={pinnedTasks}
                        showCompleted={showCompleted}
                        setShowCompleted={setShowCompleted}
                    />
                ))}
            </Stack>
        </Stack>
    );
}

export function useShowCompleted(isCurrentUser: boolean) {
    // Completed tasks are shown by default; each category can hide them.
    const myProfile = useLocalStorage('showCompletedTasks', true);
    const otherProfile = useState(true);

    if (isCurrentUser) {
        return myProfile;
    }
    return otherProfile;
}
