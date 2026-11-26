import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { DashboardCustomize } from '@mui/icons-material';
import { SvgIconProps, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';

interface PlanTypeIconProps extends SvgIconProps {
    /** Whether the plan is a custom plan. Otherwise it is the official Dojo plan. */
    custom?: boolean;
    /** Whether to show a tooltip naming the plan type. */
    withTooltip?: boolean;
}

/**
 * The icon for a plan's type: the Dojo logo for the official plan, and a
 * build-your-own icon for custom plans.
 */
export function PlanTypeIcon({ custom, withTooltip, ...props }: PlanTypeIconProps) {
    const t = useTranslations('profile.trainingPlan.customPlan');
    const label = custom ? t('customPlanLabel') : t('officialPlan');
    const icon = custom ? (
        <DashboardCustomize aria-label={label} data-testid='custom-plan-icon' {...props} />
    ) : (
        <ChessDojoIcon aria-label={label} data-testid='dojo-plan-icon' {...props} />
    );
    return withTooltip ? <Tooltip title={label}>{icon}</Tooltip> : icon;
}
