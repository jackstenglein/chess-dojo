import { RequestSnackbar } from '@/api/Request';
import { User } from '@/database/user';
import { Stack, useMediaQuery } from '@mui/material';
import { createContext, useEffect, useState } from 'react';
import { DailyTrainingPlan } from './daily/DailyTrainingPlan';
import { FullTrainingPlan } from './full/FullTrainingPlan';
import { MiniScoreboard } from './MiniScoreboard';
import { useWeeklyTrainingPlan, UseWeeklyTrainingPlanResponse } from './useTrainingPlan';
import { WeeklyTrainingPlan } from './weekly/WeeklyTrainingPlan';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const TrainingPlanContext = createContext<UseWeeklyTrainingPlanResponse>(null!);

export function TrainingPlanTab({ user }: { user: User }) {
    const hideWeekly = useMediaQuery((theme) => theme.breakpoints.down('sm'));
    const trainingPlan = useWeeklyTrainingPlan(user);
    const [cohort, setCohort] = useState(user.dojoCohort);

    useEffect(() => {
        setCohort(user.dojoCohort);
    }, [user.dojoCohort]);
    return (
        <Stack alignItems='start' mb={6} spacing={6}>
            <RequestSnackbar request={trainingPlan.request} />

            <TrainingPlanContext value={trainingPlan}>
                <DailyTrainingPlan />
                {!hideWeekly && <WeeklyTrainingPlan />}
                <FullTrainingPlan cohort={cohort} setCohort={setCohort} />
                <MiniScoreboard cohort={cohort} />
            </TrainingPlanContext>
        </Stack>
    );
}
