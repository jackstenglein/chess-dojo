import {
    CustomTask,
    getCategoryScore,
    getTotalCategoryScore,
    isComplete,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import {
    dojoCohorts,
    getCurrentRating,
    getMinRatingBoundary,
    getRatingBoundary,
} from '@/database/user';
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
import { use, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { getUpcomingGameSchedule, SCHEDULE_CLASSICAL_GAME_TASK_ID } from '../suggestedTasks';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { FullTrainingPlanSection, GRADUATION_TASK_ID, Section } from './FullTrainingPlanSection';

/** Builds a minimal fake requirement for the "Graduate from {cohort}" task. */
function getGraduationFakeTask(cohort: string): Requirement {
    return {
        id: GRADUATION_TASK_ID,
        status: RequirementStatus.Active,
        category: RequirementCategory.Graduation,
        name: `Graduate from ${cohort}`,
        description: 'Move to the next cohort and get featured in the graduation show.',
        freeDescription: '',
        counts: { [cohort]: 1 },
        startCount: 0,
        numberOfCohorts: 1,
        unitScore: 0,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.Checkbox,
        progressBarSuffix: '',
        updatedAt: new Date().toISOString(),
        sortPriority: 'zz-graduation',
        expirationDays: -1,
        isFree: false,
        atomic: true,
        expectedMinutes: 0,
    };
}

/** Renders the full training plan view of the training plan tab. */
export function FullTrainingPlan() {
    const {
        user,
        timeline,
        request: requirementRequest,
        allRequirements,
        pinnedTasks,
        togglePin,
        isCurrentUser,
    } = use(TrainingPlanContext);

    const [cohort, setCohort] = useState(user.dojoCohort);
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

    useEffect(() => {
        setCohort(user.dojoCohort);
    }, [user.dojoCohort, setCohort]);

    const sections: Section[] = useMemo(() => {
        const sections: Section[] = [];
        const subscriptionTier = getSubscriptionTier(user);

        const requirements = allRequirements.filter(
            (r) => r.counts[cohort] && (r.subscriptionTiers?.includes(subscriptionTier) ?? true),
        );
        const tasks = (requirements as (Requirement | CustomTask)[]).concat(user.customTasks ?? []);
        for (const task of tasks) {
            if (task.counts[cohort] === undefined) {
                continue;
            }

            const s = sections.find((s) => s.category === task.category);
            const complete =
                task.id !== SCHEDULE_CLASSICAL_GAME_TASK_ID
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

        // Add a Graduation section when viewing the user's current cohort (they can only graduate from it).
        if (cohort === user.dojoCohort) {
            const graduationTask = getGraduationFakeTask(cohort);
            const gradComplete = user.graduationCohorts?.includes(cohort) ?? false;
            const minBoundary = getMinRatingBoundary(cohort, user.ratingSystem);
            const graduationBoundary = getRatingBoundary(cohort, user.ratingSystem);
            const currentRating = getCurrentRating(user);
            let graduationPercent = 0;
            if (gradComplete) {
                graduationPercent = 100;
            } else if (
                graduationBoundary != null &&
                graduationBoundary > 0 &&
                minBoundary != null &&
                graduationBoundary > minBoundary
            ) {
                const range = graduationBoundary - minBoundary;
                const progress = (currentRating - minBoundary) / range;
                graduationPercent = Math.round(100 * Math.min(1, Math.max(0, progress)));
            }
            const existing = sections.find((s) => s.category === RequirementCategory.Graduation);
            if (existing) {
                if (gradComplete) existing.completedTasks.push(graduationTask);
                else existing.uncompletedTasks.push(graduationTask);
                existing.progressBar = graduationPercent;
            } else {
                sections.push({
                    category: RequirementCategory.Graduation,
                    uncompletedTasks: gradComplete ? [] : [graduationTask],
                    completedTasks: gradComplete ? [graduationTask] : [],
                    progressBar: graduationPercent,
                    color: CategoryColors[RequirementCategory.Graduation],
                });
            }
        }

        return sections;
    }, [allRequirements, user, cohort, timeline]);

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
        <Stack spacing={2} width={1}>
            <Typography variant='h5' fontWeight='bold'>
                Full Training Plan
            </Typography>

            <Stack alignItems='start' width={1}>
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    width={1}
                    flexWrap='wrap'
                    alignItems='end'
                    mt={3}
                    mb={expanded[sections[0].category] ? -2 : 0}
                >
                    <TextField
                        id='training-plan-cohort-select'
                        select
                        label='Cohort'
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

                    <Stack direction='row' spacing={1} justifyContent='end' alignItems='center'>
                        {isSmall ? (
                            <>
                                <Tooltip
                                    title={
                                        showCompleted
                                            ? 'Hide Completed Tasks'
                                            : 'Show Completed Tasks'
                                    }
                                >
                                    <IconButton
                                        onClick={() => setShowCompleted(!showCompleted)}
                                        color='primary'
                                    >
                                        {showCompleted ? <Visibility /> : <VisibilityOff />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title='Expand All'>
                                    <IconButton onClick={onExpandAll} color='primary'>
                                        <KeyboardDoubleArrowDown />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title='Collapse All'>
                                    <IconButton onClick={onCollapseAll} color='primary'>
                                        <KeyboardDoubleArrowUp />
                                    </IconButton>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    startIcon={
                                        showCompleted ? <CheckBox /> : <CheckBoxOutlineBlank />
                                    }
                                >
                                    Show Completed Tasks
                                </Button>
                                <Button
                                    onClick={onExpandAll}
                                    startIcon={<KeyboardDoubleArrowDown />}
                                >
                                    Expand All
                                </Button>
                                <Button
                                    onClick={onCollapseAll}
                                    startIcon={<KeyboardDoubleArrowUp />}
                                >
                                    Collapse All
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
