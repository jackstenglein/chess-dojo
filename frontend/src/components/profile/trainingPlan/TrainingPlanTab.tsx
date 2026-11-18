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
    return (
        <Box sx={{ position: 'relative', mb: 6 }}>
            {/*
             * The plan options sit at the right, level with the heading of the first
             * section shown. They are placed here rather than in that section so that
             * they stay put (and the menu stays open) while sections are shown and
             * hidden.
             */}
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
                <PlanMenu
                    user={user}
                    isCurrentUser={trainingPlan.isCurrentUser}
                    sections={sections}
                />
            </Box>

            <Stack
                spacing={6}
                sx={{
                    alignItems: 'start',
                    // The plan options get their own row above the sections on phones
                    // (the section headers are full width there) and when Today and
                    // This Week are both hidden (the Training Plan heading has its own
                    // controls on the right).
                    pt: sections.showToday || sections.showWeek ? { xs: '60px', sm: 0 } : '60px',
                }}
            >
                <RequestSnackbar request={trainingPlan.request} />

                <TrainingPlanContext value={trainingPlan}>
                    {sections.showToday && <DailyTrainingPlan />}
                    {sections.showWeek && <WeeklyTrainingPlan />}
                    <FullTrainingPlan cohort={cohort} setCohort={setCohort} />
                    <MiniScoreboard cohort={cohort} />
                    <PinTaskDialog />
                </TrainingPlanContext>
            </Stack>
        </Box>
    );
}
