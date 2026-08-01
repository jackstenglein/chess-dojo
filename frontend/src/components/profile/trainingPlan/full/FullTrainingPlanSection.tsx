import { useFreeTier } from '@/auth/Auth';
import {
    CustomTask,
    CustomTaskCategory,
    isCustomTaskCategory,
    isRequirement,
    Requirement,
    RequirementCategory,
} from '@/database/requirement';
import { User } from '@/database/user';
import ScoreboardProgress, { ProgressText } from '@/scoreboard/ScoreboardProgress';
import { Checklist } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Divider,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import CustomTaskEditor from '../CustomTaskEditor';
import { ScheduleClassicalGame } from '../ScheduleClassicalGame';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID } from '../suggestedTasks';
import { TrainingPlanIcon } from '../TrainingPlanIcon';
import { FullTrainingPlanGraduationItem } from './FullTrainingPlanGraduationItem';
import { FullTrainingPlanItem } from './FullTrainingPlanItem';

/** Fake requirement id for the graduation task in the full training plan. */
export const GRADUATION_TASK_ID = 'GRADUATION_TASK';

/** A section in the training plan view. */
export interface Section {
    /** The category of the section. */
    category: RequirementCategory;
    /** The uncompleted tasks to display in the section. */
    uncompletedTasks: (Requirement | CustomTask)[];
    /** The completed tasks in the section. */
    completedTasks: (Requirement | CustomTask)[];
    /** The color of the icon in the section header and the progress bar. */
    color?: string;
    /** The value of the progress bar for the section. */
    progressBar?: number;
}

interface TrainingPlanSectionProps {
    /** The section of the training plan to render. */
    section: Section;
    /** Whether the section is expanded. */
    expanded?: boolean;
    /** A callback invoked when the section expansion is toggled. */
    toggleExpand: (category: RequirementCategory) => void;
    /** The user whose training plan is being displayed. */
    user: User;
    /** Whether the user being displayed is the current authenticated user. */
    isCurrentUser: boolean;
    /** The cohort being displayed. */
    cohort: string;
    /** A callback invoked when the user toggles a pinned task. */
    togglePin: (req: Requirement | CustomTask) => void;
    /** The set of pinned tasks. */
    pinnedTasks: (Requirement | CustomTask)[];
    /** Whether to show completed tasks */
    showCompleted: boolean;
    /** Callback to set whether to show completed tasks. */
    setShowCompleted: (v: boolean) => void;
}

export function FullTrainingPlanSection({
    section,
    expanded,
    toggleExpand,
    user,
    isCurrentUser,
    cohort,
    togglePin,
    pinnedTasks,
    showCompleted,
    setShowCompleted,
}: TrainingPlanSectionProps) {
    const t = useTranslations('profile.trainingPlan.full');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tCategory = useTranslations('enums.requirementCategory');
    const isFreeTier = useFreeTier();
    const [showCustomTaskEditor, setShowCustomTaskEditor] = useState(false);
    const preventCategoryTranslation =
        section.category === RequirementCategory.Opening ||
        section.category === RequirementCategory.Middlegames ||
        section.category === RequirementCategory.Endgame ||
        section.category === RequirementCategory.Graduation;

    const hiddenTaskCount = useMemo(() => {
        if (!isFreeTier) {
            return 0;
        }
        return section.uncompletedTasks.filter((r) => isRequirement(r) && !r.isFree).length;
    }, [section.uncompletedTasks, isFreeTier]);

    return (
        <Accordion
            key={section.category}
            expanded={expanded}
            onChange={() => toggleExpand(section.category)}
            sx={{ width: 1 }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${section.category.replaceAll(' ', '-')}-content`}
                id={`${section.category.replaceAll(' ', '-')}-header`}
                data-testid={`${section.category.replaceAll(' ', '-')}-header`}
            >
                <Grid
                    container
                    sx={{
                        width: 1,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        columnGap: 3,
                        mr: 2,
                    }}
                >
                    <Grid size={{ xs: 'auto', sm: 5.5, lg: 5, xl: 3 }}>
                        <Typography
                            sx={{
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <TrainingPlanIcon
                                category={section.category}
                                sx={{
                                    color: section.color || 'primary.main',
                                    marginRight: '0.6rem',
                                    verticalAlign: 'middle',
                                }}
                            />
                            <span
                                translate={preventCategoryTranslation ? 'no' : undefined}
                                className={preventCategoryTranslation ? 'notranslate' : undefined}
                            >
                                {tCategory.has(section.category)
                                    ? tCategory(section.category)
                                    : section.category}
                            </span>
                        </Typography>
                    </Grid>

                    <Grid
                        size={{ xs: 0, sm: 'grow' }}
                        sx={{
                            color: section.color,
                            display: { xs: 'none', sm: 'initial' },
                        }}
                    >
                        {section.progressBar !== undefined && (
                            <ScoreboardProgress
                                value={section.progressBar}
                                min={0}
                                max={100}
                                color={'inherit'}
                                label={`${section.progressBar}%`}
                            />
                        )}
                    </Grid>

                    <Grid
                        size={{ xs: 'auto', sm: 0 }}
                        sx={{ display: { xs: 'initial', sm: 'none' } }}
                    >
                        <ProgressText
                            value={section.completedTasks.length}
                            max={section.completedTasks.length + section.uncompletedTasks.length}
                            min={0}
                        />
                    </Grid>
                </Grid>
            </AccordionSummary>
            <AccordionDetails data-testid={`progress-category-${section.category}`}>
                <Divider />

                <TaskList
                    tasks={section.uncompletedTasks}
                    user={user}
                    cohort={cohort}
                    isFreeTier={isFreeTier}
                    isCurrentUser={isCurrentUser}
                    togglePin={togglePin}
                    pinnedTasks={pinnedTasks}
                />

                {section.completedTasks.length > 0 &&
                    (showCompleted ? (
                        <>
                            <Stack
                                direction='row'
                                sx={{
                                    alignItems: 'center',
                                    mt: 6,
                                    mb: 1,
                                }}
                            >
                                <Checklist color='primary' />
                                <Typography
                                    variant='body1'
                                    sx={{
                                        fontWeight: 700,
                                        ml: 1,
                                        flexGrow: 1,
                                    }}
                                >
                                    {t('completedTasks')}
                                </Typography>
                                <Button onClick={() => setShowCompleted(false)}>
                                    {tCommon('hide')}
                                </Button>
                            </Stack>

                            <Divider sx={{ mb: 2 }} />
                            <TaskList
                                tasks={section.completedTasks}
                                user={user}
                                cohort={cohort}
                                isFreeTier={isFreeTier}
                                isCurrentUser={isCurrentUser}
                                togglePin={togglePin}
                                pinnedTasks={pinnedTasks}
                            />
                        </>
                    ) : (
                        <>
                            <Button sx={{ my: 2 }} onClick={() => setShowCompleted(true)}>
                                {t('showCompleted', { count: section.completedTasks.length })}
                            </Button>
                            <Divider />
                        </>
                    ))}

                {!isFreeTier && isCustomTaskCategory(section.category) && isCurrentUser && (
                    <Button
                        sx={{ mt: 2 }}
                        onClick={() => setShowCustomTaskEditor(true)}
                        data-testid={`add-custom-task-button-${section.category.replaceAll(' ', '-')}`}
                    >
                        {t('addCustomTask')}
                    </Button>
                )}

                {isFreeTier &&
                    section.category !== RequirementCategory.NonDojo &&
                    hiddenTaskCount > 0 && (
                        <Stack
                            spacing={2}
                            sx={{
                                mt: 2,
                                alignItems: 'center',
                            }}
                        >
                            <Typography>{t('unlockTasks', { count: hiddenTaskCount })}</Typography>
                            <Button variant='outlined' href='/prices'>
                                {t('viewPrices')}
                            </Button>
                        </Stack>
                    )}
            </AccordionDetails>

            <CustomTaskEditor
                open={showCustomTaskEditor}
                onClose={() => setShowCustomTaskEditor(false)}
                initialCategory={section.category as unknown as CustomTaskCategory}
            />
        </Accordion>
    );
}

function TaskList({
    tasks,
    isFreeTier,
    user,
    cohort,
    isCurrentUser,
    togglePin,
    pinnedTasks,
}: {
    tasks: (Requirement | CustomTask)[];
    isFreeTier: boolean;
    user: User;
    cohort: string;
    isCurrentUser: boolean;
    /** A callback invoked when the user toggles a pinned task. */
    togglePin: (req: Requirement | CustomTask) => void;
    /** The set of pinned tasks. */
    pinnedTasks: (Requirement | CustomTask)[];
}) {
    return (
        <>
            {tasks.map((r) => {
                if (r.id === SCHEDULE_CLASSICAL_GAME_TASK_ID) {
                    return <ScheduleClassicalGame key={r.id} hideChip />;
                }
                if (r.id === GRADUATION_TASK_ID) {
                    return (
                        <FullTrainingPlanGraduationItem
                            key={r.id}
                            requirement={r as Requirement}
                            user={user}
                            cohort={cohort}
                            isCurrentUser={isCurrentUser}
                        />
                    );
                }
                if (isFreeTier && isRequirement(r) && !r.isFree) {
                    return null;
                }
                return (
                    <FullTrainingPlanItem
                        key={r.id}
                        requirement={r}
                        progress={user.progress[r.id]}
                        cohort={cohort}
                        isCurrentUser={isCurrentUser}
                        user={user}
                        togglePin={togglePin}
                        isPinned={pinnedTasks.some((t) => t.id === r.id)}
                    />
                );
            })}
        </>
    );
}
