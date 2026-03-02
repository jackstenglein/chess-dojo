import { Chip, Tooltip } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

// * Standard chess titles recognized by FIDE
const CHESS_TITLES: Record<string, string> = {
    GM: 'Grandmaster',
    WGM: 'Woman Grandmaster',
    IM: 'International Master',
    WIM: 'Woman International Master',
    FM: 'FIDE Master',
    WFM: 'Woman FIDE Master',
    CM: 'Candidate Master',
    WCM: 'Woman Candidate Master',
    NM: 'National Master',
    WNM: 'Woman National Master',
    LM: 'Lifetime Master',
};

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
    // * Only render if this is a recognized chess title
    if (!title || !CHESS_TITLES[title]) {
        return null;
    }

    const fullTitle = CHESS_TITLES[title];

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
