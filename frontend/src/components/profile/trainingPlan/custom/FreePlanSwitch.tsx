import { isFree } from '@/database/user';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { PlanTypeIcon } from './PlanTypeIcon';
import { FreePlanDraftContext, useFreePlanEditor } from './useFreePlanEditor';

/**
 * The Custom Plan / Dojo Plan switch a free-tier member changes plans with,
 * shown at the right of the plan's header. Picking Custom Plan before having
 * one offers to create it. Renders nothing for others.
 */
export function FreePlanSwitch() {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const { user, isCurrentUser, activePlan } = use(TrainingPlanContext);
    const { creating } = use(FreePlanDraftContext);
    const { openCustomPlan, openDojoPlan } = useFreePlanEditor();

    if (!isCurrentUser || !isFree(user)) {
        return null;
    }

    return (
        <ToggleButtonGroup
            exclusive
            size='small'
            value={activePlan || creating ? 'custom' : 'dojo'}
            onChange={(_, v: string | null) => {
                if (v === 'custom') {
                    openCustomPlan();
                } else if (v === 'dojo') {
                    openDojoPlan();
                }
            }}
            sx={{
                ml: 'auto',
                '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    gap: 0.75,
                    px: 1.5,
                    '& svg': { fontSize: '1.1rem' },
                },
            }}
            data-testid='free-plan-switch'
        >
            <ToggleButton value='custom' data-testid='free-plan-switch-custom'>
                <PlanTypeIcon custom />
                {t('customTab')}
            </ToggleButton>
            <ToggleButton value='dojo' data-testid='free-plan-switch-dojo'>
                <PlanTypeIcon />
                {t('dojoTab')}
            </ToggleButton>
        </ToggleButtonGroup>
    );
}
