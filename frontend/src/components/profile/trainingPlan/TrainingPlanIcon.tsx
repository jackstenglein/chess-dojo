import { RequirementCategory } from '@/database/requirement';
import {
    Biotech,
    CrisisAlert,
    LiveTv,
    PushPin,
    School,
    Speed,
    SportsScore,
    WavingHand,
} from '@mui/icons-material';
import { SvgIcon, SvgIconProps } from '@mui/material';
import { GiBookPile } from 'react-icons/gi';

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
            // A pile of books, so it isn't mistaken for the open book of a reading task.
            return <SvgIcon component={GiBookPile} viewBox='0 0 512 512' {...rest} />;
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
