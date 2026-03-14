import { RequestSnackbar } from '@/api/Request';
import { User } from '@/database/user';
import { Box, Stack, useMediaQuery } from '@mui/material';
import { createContext } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { DailyTrainingPlan } from './daily/DailyTrainingPlan';
import { FullTrainingPlan } from './full/FullTrainingPlan';
import { useWeeklyTrainingPlan, UseWeeklyTrainingPlanResponse } from './useTrainingPlan';
import { WeeklyTrainingPlan } from './weekly/WeeklyTrainingPlan';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const TrainingPlanContext = createContext<UseWeeklyTrainingPlanResponse>(null!);

export function TrainingPlanTab({ user }: { user: User }) {
    const hideWeekly = useMediaQuery((theme) => theme.breakpoints.down('sm'));
    const trainingPlan = useWeeklyTrainingPlan(user);

    const [dailyExpanded, setDailyExpanded] = useLocalStorage('training-plan-daily-expanded', true);
    const [weeklyExpanded, setWeeklyExpanded] = useLocalStorage(
        'training-plan-weekly-expanded',
        true,
    );

    return (
        <Stack alignItems='start' mb={6} spacing={6}>
            <RequestSnackbar request={trainingPlan.request} />

            <TrainingPlanContext value={trainingPlan}>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        rowGap: 6,
                        columnGap: 2,
                        width: 1,
                    }}
                >
                    <Box
                        sx={{
                            width: dailyExpanded ? 1 : { xs: 1, sm: 'calc(50% - 8px)' },
                        }}
                    >
                        <DailyTrainingPlan
                            expanded={dailyExpanded}
                            setExpanded={setDailyExpanded}
                        />
                    </Box>
                    {!hideWeekly && (
                        <Box
                            sx={{
                                width: weeklyExpanded ? 1 : { xs: 1, sm: 'calc(50% - 8px)' },
                            }}
                        >
                            <WeeklyTrainingPlan
                                expanded={weeklyExpanded}
                                setExpanded={setWeeklyExpanded}
                            />
                        </Box>
                    )}
                </Box>
                <FullTrainingPlan />
            </TrainingPlanContext>
        </Stack>
    );
}
