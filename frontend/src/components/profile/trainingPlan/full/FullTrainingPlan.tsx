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
import { CategoryColors } from '@/style/ThemeProvider';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    CheckBox,
    CheckBoxOutlineBlank,
    KeyboardDoubleArrowDown,
    KeyboardDoubleArrowUp,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import {
    Button,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
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
}: {
    cohort: string;
    setCohort: (c: string) => void;
}) {
    const {
        user,
        timeline,
        request: requirementRequest,
        allRequirements,
        pinnedTasks,
        togglePin,
        isCurrentUser,
    } = use(TrainingPlanContext);

    const t = useTranslations('profile.trainingPlan.full');
    const [showCompleted, setShowCompleted] = useShowCompleted(isCurrentUser);
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));

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
            <Typography
                variant='h5'
                sx={{
                    fontWeight: 'bold',
                }}
            >
                {t('heading')}
            </Typography>

            <Stack
                sx={{
                    alignItems: 'start',
                    width: 1,
                }}
            >
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                        width: 1,
                        flexWrap: 'wrap',
                        alignItems: 'end',
                        mt: 1,
                        mb: 1.5,
                    }}
                >
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
                        }}
                    >
                        {isSmall ? (
                            <>
                                <Tooltip
                                    title={
                                        showCompleted
                                            ? t('hideCompletedTasksTooltip')
                                            : t('showCompletedTasksTooltip')
                                    }
                                >
                                    <IconButton
                                        onClick={() => setShowCompleted(!showCompleted)}
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {showCompleted ? <Visibility /> : <VisibilityOff />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('expandAll')}>
                                    <IconButton
                                        onClick={onExpandAll}
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        <KeyboardDoubleArrowDown />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('collapseAll')}>
                                    <IconButton
                                        onClick={onCollapseAll}
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        <KeyboardDoubleArrowUp />
                                    </IconButton>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    color='inherit'
                                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                                    startIcon={
                                        showCompleted ? <CheckBox /> : <CheckBoxOutlineBlank />
                                    }
                                >
                                    {t('showCompletedTasks')}
                                </Button>
                                <Button
                                    onClick={onExpandAll}
                                    color='inherit'
                                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                                    startIcon={<KeyboardDoubleArrowDown />}
                                >
                                    {t('expandAll')}
                                </Button>
                                <Button
                                    onClick={onCollapseAll}
                                    color='inherit'
                                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                                    startIcon={<KeyboardDoubleArrowUp />}
                                >
                                    {t('collapseAll')}
                                </Button>
                            </>
                        )}
                    </Stack>
                </Stack>

                {sections.map((section) => (
                    <FullTrainingPlanSection
                        key={section.category}
                        section={section}
                        expanded={expanded[section.category]}
                        toggleExpand={toggleExpand}
                        user={user}
                        isCurrentUser={isCurrentUser}
                        cohort={cohort}
                        togglePin={togglePin}
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
    const myProfile = useLocalStorage('showCompletedTasks', false);
    const otherProfile = useState(false);

    if (isCurrentUser) {
        return myProfile;
    }
    return otherProfile;
}
