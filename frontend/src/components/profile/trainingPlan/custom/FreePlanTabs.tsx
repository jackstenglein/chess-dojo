import { Stack, Tab, Tabs } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { PlanTypeIcon } from './PlanTypeIcon';
import { useFreePlanEditor } from './useFreePlanEditor';

/**
 * The Custom Plan / Dojo Plan tabs a free-tier user switches plans with. The
 * custom plan is made, with sample tasks, the first time its tab is opened.
 */
export function FreePlanTabs() {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const { activePlan } = use(TrainingPlanContext);
    const { openCustomPlan, openDojoPlan } = useFreePlanEditor();
    const value = activePlan ? 'custom' : 'dojo';

    return (
        <Stack
            direction='row'
            sx={{
                width: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                borderBottom: 1,
                borderColor: 'divider',
            }}
        >
            <Tabs
                value={value}
                onChange={(_, v: string) => (v === 'custom' ? openCustomPlan() : openDojoPlan())}
                data-testid='free-plan-tabs'
            >
                <Tab
                    value='custom'
                    icon={<PlanTypeIcon custom />}
                    iconPosition='start'
                    label={t('customTab')}
                    sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
                    data-testid='free-plan-tab-custom'
                />
                <Tab
                    value='dojo'
                    icon={<PlanTypeIcon />}
                    iconPosition='start'
                    label={t('dojoTab')}
                    sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
                    data-testid='free-plan-tab-dojo'
                />
            </Tabs>
        </Stack>
    );
}
