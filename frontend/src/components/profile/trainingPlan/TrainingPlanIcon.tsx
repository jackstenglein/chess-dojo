import { RequirementCategory } from '@/database/requirement';
import {
    Biotech,
    CrisisAlert,
    LiveTv,
    MenuBook,
    PushPin,
    School,
    Speed,
    SportsScore,
    WavingHand,
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material';

interface TrainingPlanIconProps extends SvgIconProps {
    /** The category to render the icon for. */
    category: RequirementCategory;
}

/** Renders an icon for the given training plan category */
export function TrainingPlanIcon({ category, ...rest }: TrainingPlanIconProps) {
    switch (category) {
        case RequirementCategory.Welcome:
            return <WavingHand {...rest} />;
        case RequirementCategory.Games:
            return <Biotech {...rest} />;
        case RequirementCategory.Tactics:
            return <Speed {...rest} />;
        case RequirementCategory.Middlegames:
            return <MenuBook {...rest} />;
        case RequirementCategory.Endgame:
            return <SportsScore {...rest} />;
        case RequirementCategory.Opening:
            return <CrisisAlert {...rest} />;
        case RequirementCategory.NonDojo:
            return <LiveTv {...rest} />;
        case RequirementCategory.Graduation:
            return <School {...rest} />;
        case RequirementCategory.Pinned:
            return <PushPin {...rest} />;
    }
    return null;
}
