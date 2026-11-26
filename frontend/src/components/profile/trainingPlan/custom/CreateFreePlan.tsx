import { CategoryColors } from '@/style/ThemeProvider';
import { Add } from '@mui/icons-material';
import { alpha, Box, Button, Card, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import {
    FREE_BUCKET_NAME_KEYS,
    FREE_PLAN_CATEGORIES,
    FREE_PLAN_MAX_TASKS_PER_BUCKET,
} from './freePlan';
import { FreePlanSwitch } from './FreePlanSwitch';
import { PlanTypeIcon } from './PlanTypeIcon';
import { useFreePlanEditor } from './useFreePlanEditor';

/**
 * Shown when a free-tier user without a custom plan picks Custom Plan: what a
 * plan holds, and a button that creates an empty one to fill from scratch.
 */
export function CreateFreePlan() {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const { createPlan } = useFreePlanEditor();

    return (
        <Card
            variant='outlined'
            sx={{ width: 1, borderRadius: 3, p: { xs: 2.5, sm: 4 } }}
            data-testid='create-free-plan'
        >
            <Stack spacing={2.5} sx={{ alignItems: 'start' }}>
                <Stack
                    direction='row'
                    sx={{ width: 1, alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
                >
                    <PlanTypeIcon custom sx={{ color: 'primary.main', fontSize: '2rem' }} />
                    <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                        {t('createTitle')}
                    </Typography>
                    <FreePlanSwitch />
                </Stack>

                <Typography sx={{ color: 'text.secondary', maxWidth: 640 }}>
                    {t('createBody', { max: FREE_PLAN_MAX_TASKS_PER_BUCKET })}
                </Typography>

                <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {FREE_PLAN_CATEGORIES.map((category) => {
                        const color = CategoryColors[category];
                        return (
                            <Box
                                key={category}
                                sx={{
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: 2,
                                    border: 1,
                                    borderColor: alpha(color, 0.5),
                                    borderLeft: 4,
                                    borderLeftColor: color,
                                    backgroundColor: alpha(color, 0.08),
                                }}
                            >
                                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                    {t(FREE_BUCKET_NAME_KEYS[category])}
                                </Typography>
                                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                    {t('taskCount', {
                                        count: 0,
                                        max: FREE_PLAN_MAX_TASKS_PER_BUCKET,
                                    })}
                                </Typography>
                            </Box>
                        );
                    })}
                </Stack>

                <Button
                    variant='contained'
                    size='large'
                    startIcon={<Add />}
                    onClick={createPlan}
                    data-testid='create-free-plan-button'
                >
                    {t('createCta')}
                </Button>
            </Stack>
        </Card>
    );
}
