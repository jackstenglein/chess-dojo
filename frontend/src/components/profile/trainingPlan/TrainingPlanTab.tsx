import { RequestSnackbar } from '@/api/Request';
import { isFree, User } from '@/database/user';
import { Box, Stack } from '@mui/material';
import { createContext, useEffect, useMemo, useState } from 'react';
import { CreateFreePlan } from './custom/CreateFreePlan';
import { getLockedTaskCount, isFreeStarterPlanDone } from './custom/freePlan';
import { FreePlanSwitch } from './custom/FreePlanSwitch';
import { StarterPlanComplete } from './custom/StarterPlanComplete';
import { FreePlanDraftContext } from './custom/useFreePlanEditor';
import { DailyTrainingPlan } from './daily/DailyTrainingPlan';
import { FullTrainingPlan } from './full/FullTrainingPlan';
import { MiniScoreboard } from './MiniScoreboard';
import { PinTaskDialog } from './PinTaskDialog';
import { PlanMenu, useTrainingPlanSections } from './PlanMenu';
import { isStarterPlanActive } from './starter/starterPlan';
import { StarterPlanSuggestion } from './starter/StarterPlanSuggestion';
import { StarterPreviewMode, useStarterPlanPreview } from './starter/starterPreview';
import { isStarterPlanFinished } from './starter/starterProgress';
import { StarterTrainingPlan } from './starter/StarterTrainingPlan';
import { useWeeklyTrainingPlan, UseWeeklyTrainingPlanResponse } from './useTrainingPlan';
import { WeeklyTrainingPlan } from './weekly/WeeklyTrainingPlan';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const TrainingPlanContext = createContext<UseWeeklyTrainingPlanResponse>(null!);

export function TrainingPlanTab({ user }: { user: User }) {
    const trainingPlan = useWeeklyTrainingPlan(user);
    const [cohort, setCohort] = useState(user.dojoCohort);
    const preview = useStarterPlanPreview();
    // New members work through the starter plan before the full training plan.
    // Its progress checks need the member's own data, so others see the usual plan.
    // On a local dev server, the preview shows it to any account for testing.
    const showStarterPlan =
        trainingPlan.isCurrentUser &&
        (isStarterPlanActive(user) ||
            preview === StarterPreviewMode.Reset ||
            (preview === StarterPreviewMode.On && !isStarterPlanFinished(user.tutorials)));

    // Past the starter plan, free-tier members choose between building their own
    // custom plan and the Dojo plan (FreePlanSwitch), which asks them to join once
    // they have done its free part.
    const isFreeMember = trainingPlan.isCurrentUser && isFree(user) && !showStarterPlan;
    const freeStarterDone = useMemo(
        () => isFreeStarterPlanDone(user, trainingPlan.allRequirements, trainingPlan.timeline),
        [user, trainingPlan.allRequirements, trainingPlan.timeline],
    );
    const showJoinPrompt = isFreeMember && !trainingPlan.activePlan && freeStarterDone;
    // Picking Custom Plan before having one offers to create it from scratch.
    const [creatingPlan, setCreatingPlan] = useState(false);
    const showCreatePlan = isFreeMember && !trainingPlan.activePlan && creatingPlan;
    const freePlanDraft = useMemo(
        () => ({ creating: creatingPlan, setCreating: setCreatingPlan }),
        [creatingPlan],
    );
    const sections = useTrainingPlanSections();

    useEffect(() => {
        setCohort(user.dojoCohort);
    }, [user.dojoCohort]);

    // The plan options belong to the plan itself, so the starter plan, the create
    // plan page and the join page go without them.
    const showPlan = !showStarterPlan && !showCreatePlan && !showJoinPrompt;
    const anySection = showPlan && (sections.showToday || sections.showWeek);
    const planMenu = (
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            {/* Free members switch between their custom plan and the Dojo plan here. */}
            {isFreeMember && (
                <TrainingPlanContext value={trainingPlan}>
                    <FreePlanDraftContext value={freePlanDraft}>
                        <FreePlanSwitch />
                    </FreePlanDraftContext>
                </TrainingPlanContext>
            )}
            <PlanMenu user={user} isCurrentUser={trainingPlan.isCurrentUser} sections={sections} />
        </Stack>
    );

    return (
        <Box sx={{ position: 'relative', mb: 6 }}>
            {/*
             * While Today or This Week is shown, the plan options sit at the right,
             * level with the first one's heading. They are placed here rather than in
             * that section so that they stay put (and the menu stays open) while
             * sections are shown and hidden. With both hidden, they join the Training
             * Plan heading row instead.
             */}
            {anySection && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        // The height of the Today / This Week headers, so it lines up with them.
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 1,
                    }}
                >
                    {planMenu}
                </Box>
            )}

            <Stack
                spacing={6}
                sx={{
                    alignItems: 'start',
                    // On phones the section headers are full width, so the plan options
                    // get their own row above them.
                    pt: anySection ? { xs: '60px', sm: 0 } : 0,
                }}
            >
                <RequestSnackbar request={trainingPlan.request} />

                <TrainingPlanContext value={trainingPlan}>
                    <FreePlanDraftContext value={freePlanDraft}>
                        {showStarterPlan ? (
                            // The full training plan stays locked until the starter plan is done.
                            <StarterTrainingPlan
                                preview={
                                    preview === StarterPreviewMode.Suggest ? undefined : preview
                                }
                            />
                        ) : showCreatePlan ? (
                            <>
                                <CreateFreePlan />
                                <MiniScoreboard cohort={cohort} />
                                <PinTaskDialog />
                            </>
                        ) : showJoinPrompt ? (
                            <>
                                <StarterPlanComplete
                                    cohort={user.dojoCohort}
                                    lockedCount={getLockedTaskCount(
                                        user,
                                        trainingPlan.allRequirements,
                                    )}
                                />
                                <MiniScoreboard cohort={cohort} />
                                <PinTaskDialog />
                            </>
                        ) : (
                            <>
                                {/* Inactive members who have done little are offered the starter plan. */}
                                {!trainingPlan.activePlan && (
                                    <StarterPlanSuggestion
                                        force={preview === StarterPreviewMode.Suggest}
                                    />
                                )}
                                {sections.showToday && <DailyTrainingPlan />}
                                {sections.showWeek && <WeeklyTrainingPlan />}
                                <FullTrainingPlan
                                    cohort={cohort}
                                    setCohort={setCohort}
                                    headerAction={anySection ? undefined : planMenu}
                                />
                                <MiniScoreboard cohort={cohort} />
                                <PinTaskDialog />
                            </>
                        )}
                    </FreePlanDraftContext>
                </TrainingPlanContext>
            </Stack>
        </Box>
    );
}
