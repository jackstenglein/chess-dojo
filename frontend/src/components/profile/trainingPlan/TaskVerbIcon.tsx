import { PawnIcon } from '@/style/ChessIcons';
import {
    Article,
    EditNote,
    Extension,
    MenuBook,
    OndemandVideo,
    RateReview,
    School,
} from '@mui/icons-material';
import { Box, SvgIconProps, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ComponentType } from 'react';
import { GiCrossedSwords } from 'react-icons/gi';
import { TaskVerb } from './taskVerb';

/** Crossed swords, matching the icon the heatmap uses for classical games. */
function SwordsIcon({ sx }: SvgIconProps) {
    return (
        <Box component='span' sx={{ display: 'inline-flex', ...sx }}>
            <GiCrossedSwords />
        </Box>
    );
}

const ICONS: Record<TaskVerb, ComponentType<SvgIconProps>> = {
    read: MenuBook,
    watch: OndemandVideo,
    solve: Extension,
    study: School,
    play: PawnIcon,
    spar: SwordsIcon,
    annotate: EditNote,
    review: RateReview,
    guide: Article,
};

/**
 * Renders a task's leading verb as an icon, with the verb in a tooltip and as its
 * accessible name, so replacing the word loses nothing.
 */
export function TaskVerbIcon({ verb, size = '1.1em' }: { verb: TaskVerb; size?: string }) {
    const t = useTranslations('profile.trainingPlan.verbs');
    const Icon = ICONS[verb];

    return (
        <Tooltip title={t(verb)}>
            <Box
                component='span'
                role='img'
                aria-label={t(verb)}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    color: 'text.secondary',
                    fontSize: size,
                }}
                data-testid={`task-verb-${verb}`}
            >
                <Icon sx={{ fontSize: 'inherit' }} />
            </Box>
        </Tooltip>
    );
}
