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
import { ProgressText } from '@/scoreboard/ScoreboardProgress';
import { Add, Checklist } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Divider,
    Grid,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import CustomTaskEditor from '../CustomTaskEditor';
import { CategoryLabel } from '../daily/DailyCard';
import { ScheduleClassicalGame } from '../ScheduleClassicalGame';
import { SectionLabel } from '../SectionLabel';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID } from '../suggestedTasks';
import { FullTrainingPlanItem } from './FullTrainingPlanItem';

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
            disableGutters
            elevation={0}
            sx={{
                width: 1,
                mb: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: '12px !important',
                backgroundColor: 'background.default',
                backgroundImage: 'none',
                overflow: 'hidden',
                '&:before': { display: 'none' },
            }}
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
                        <Box
                            component='span'
                            translate={preventCategoryTranslation ? 'no' : undefined}
                            className={preventCategoryTranslation ? 'notranslate' : undefined}
                        >
                            <CategoryLabel category={section.category} />
                        </Box>
                    </Grid>

                    <Grid
                        size={{ xs: 0, sm: 'grow' }}
                        sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}
                    >
                        {section.progressBar !== undefined && (
                            <>
                                <LinearProgress
                                    variant='determinate'
                                    value={section.progressBar}
                                    sx={{
                                        flexGrow: 1,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'action.hover',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                            backgroundColor: section.color || 'primary.main',
                                        },
                                    }}
                                />
                                <Typography
                                    variant='body2'
                                    sx={{
                                        width: 44,
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {section.progressBar}%
                                </Typography>
                            </>
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
            <AccordionDetails
                data-testid={`progress-category-${section.category}`}
                sx={{ pt: 0, borderTop: 1, borderColor: 'divider' }}
            >
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
                                    mt: 4,
                                    mb: 1,
                                }}
                            >
                                <Checklist sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                                <Box sx={{ ml: 0.75, flexGrow: 1 }}>
                                    <SectionLabel>{t('completedTasks')}</SectionLabel>
                                </Box>
                                <Button
                                    color='inherit'
                                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                                    onClick={() => setShowCompleted(false)}
                                >
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
                            <Button
                                color='inherit'
                                sx={{ my: 1.5, color: 'text.secondary', textTransform: 'none' }}
                                onClick={() => setShowCompleted(true)}
                            >
                                {t('showCompleted', { count: section.completedTasks.length })}
                            </Button>
                            <Divider />
                        </>
                    ))}

                {!isFreeTier && isCustomTaskCategory(section.category) && isCurrentUser && (
                    <Button
                        sx={{ mt: 2, textTransform: 'none' }}
                        startIcon={<Add />}
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
