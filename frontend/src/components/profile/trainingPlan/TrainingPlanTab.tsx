import { RequestSnackbar } from '@/api/Request';
import { User } from '@/database/user';
import { Box, Stack } from '@mui/material';
import { createContext, useEffect, useState } from 'react';
import { DailyTrainingPlan } from './daily/DailyTrainingPlan';
import { FullTrainingPlan } from './full/FullTrainingPlan';
import { MiniScoreboard } from './MiniScoreboard';
import { PinTaskDialog } from './PinTaskDialog';
import { PlanMenu, useTrainingPlanSections } from './PlanMenu';
import { useWeeklyTrainingPlan, UseWeeklyTrainingPlanResponse } from './useTrainingPlan';
import { WeeklyTrainingPlan } from './weekly/WeeklyTrainingPlan';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const TrainingPlanContext = createContext<UseWeeklyTrainingPlanResponse>(null!);

export function TrainingPlanTab({ user }: { user: User }) {
    const trainingPlan = useWeeklyTrainingPlan(user);
    const [cohort, setCohort] = useState(user.dojoCohort);
    const sections = useTrainingPlanSections();

    useEffect(() => {
        setCohort(user.dojoCohort);
    }, [user.dojoCohort]);

    const anySection = sections.showToday || sections.showWeek;
    const planMenu = (
        <PlanMenu user={user} isCurrentUser={trainingPlan.isCurrentUser} sections={sections} />
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
                    {sections.showToday && <DailyTrainingPlan />}
                    {sections.showWeek && <WeeklyTrainingPlan />}
                    <FullTrainingPlan
                        cohort={cohort}
                        setCohort={setCohort}
                        headerAction={anySection ? undefined : planMenu}
                    />
                    <MiniScoreboard cohort={cohort} />
                    <PinTaskDialog />
                </TrainingPlanContext>
            </Stack>
        </Box>
    );
}
