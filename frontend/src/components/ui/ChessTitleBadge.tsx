import { Chip, Tooltip } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface ChessTitleBadgeProps {
    /** The chess title abbreviation (e.g., 'GM', 'IM') */
    title: string;
    /** Optional custom styling */
    sx?: SxProps<Theme>;
    /** Size of the chip - defaults to 'small' for compact display */
    size?: 'small' | 'medium';
}

/**
 * Displays a chess title as a small badge with a tooltip showing the full title name.
 * Only displays if the title is a recognized chess title.
 */
export function ChessTitleBadge({ title, sx = [], size = 'small' }: ChessTitleBadgeProps) {
    const t = useTranslations('ui.chessTitleBadge');

    // * Standard chess titles recognized by FIDE
    const chessTitles = useMemo<Record<string, string>>(
        () => ({
            GM: t('GM'),
            WGM: t('WGM'),
            IM: t('IM'),
            WIM: t('WIM'),
            FM: t('FM'),
            WFM: t('WFM'),
            CM: t('CM'),
            WCM: t('WCM'),
            NM: t('NM'),
            WNM: t('WNM'),
            LM: t('LM'),
        }),
        [t],
    );

    // * Only render if this is a recognized chess title
    if (!title || !chessTitles[title]) {
        return null;
    }

    const fullTitle = chessTitles[title];

    return (
        <Tooltip title={fullTitle} arrow>
            <Chip
                label={title}
                size={size}
                variant='outlined'
                color='primary'
                sx={[
                    {
                        fontSize: '0.75rem',
                        height: size === 'small' ? '20px' : '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        '& .MuiChip-label': {
                            px: 0.5,
                            fontWeight: 'bold',
                            lineHeight: size === 'small' ? '20px' : '24px',
                        },
                    },
                    sx,
                ].flat()}
            />
        </Tooltip>
    );
}
