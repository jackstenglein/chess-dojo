import { RequestSnackbar } from '@/api/Request';
import { User } from '@/database/user';
import { Stack } from '@mui/material';
import { createContext, useEffect, useState } from 'react';
import { DailyTrainingPlan } from './daily/DailyTrainingPlan';
import { FullTrainingPlan } from './full/FullTrainingPlan';
import { MiniScoreboard } from './MiniScoreboard';
import { PinTaskDialog } from './PinTaskDialog';
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

    useEffect(() => {
        setCohort(user.dojoCohort);
    }, [user.dojoCohort]);
    return (
        <Stack
            spacing={6}
            sx={{
                alignItems: 'start',
                mb: 6,
            }}
        >
            <RequestSnackbar request={trainingPlan.request} />

            <TrainingPlanContext value={trainingPlan}>
                {showStarterPlan ? (
                    // The full training plan stays locked until the starter plan is done.
                    <StarterTrainingPlan
                        preview={preview === StarterPreviewMode.Suggest ? undefined : preview}
                    />
                ) : (
                    <>
                        {/* Inactive members who have done little are offered the starter plan. */}
                        <StarterPlanSuggestion force={preview === StarterPreviewMode.Suggest} />
                        <DailyTrainingPlan />
                        <WeeklyTrainingPlan />
                        <FullTrainingPlan cohort={cohort} setCohort={setCohort} />
                        <MiniScoreboard cohort={cohort} />
                        <PinTaskDialog />
                    </>
                )}
            </TrainingPlanContext>
        </Stack>
    );
}
