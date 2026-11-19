import { RequestSnackbar } from '@/api/Request';
import { User } from '@/database/user';
import { Stack } from '@mui/material';
import { createContext, useEffect, useState } from 'react';
import { DailyTrainingPlan } from './daily/DailyTrainingPlan';
import { FullTrainingPlan } from './full/FullTrainingPlan';
import { MiniScoreboard } from './MiniScoreboard';
import { PinTaskDialog } from './PinTaskDialog';
import { isStarterPlanActive } from './starter/starterPlan';
import { StarterTrainingPlan } from './starter/StarterTrainingPlan';
import { useWeeklyTrainingPlan, UseWeeklyTrainingPlanResponse } from './useTrainingPlan';
import { WeeklyTrainingPlan } from './weekly/WeeklyTrainingPlan';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const TrainingPlanContext = createContext<UseWeeklyTrainingPlanResponse>(null!);

export function TrainingPlanTab({ user }: { user: User }) {
    const trainingPlan = useWeeklyTrainingPlan(user);
    const [cohort, setCohort] = useState(user.dojoCohort);
    // New members work through the starter plan before the full training plan.
    // Its progress checks need the member's own data, so others see the usual plan.
    const showStarterPlan = trainingPlan.isCurrentUser && isStarterPlanActive(user);

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
                    <StarterTrainingPlan />
                ) : (
                    <>
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
