import { Stack, Typography } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { ChessTitleBadge } from './ChessTitleBadge';

interface PlayerNameWithTitleProps {
    /** The player's name */
    name: string;
    /** The player's chess title (e.g., 'GM', 'IM') */
    title?: string;
    /** Typography variant for the name */
    variant?: 'body1' | 'body2' | 'caption' | 'h6';
    /** Optional custom styling */
    sx?: SxProps<Theme>;
    /** Whether to show the title before the name (default: true) */
    titleBeforeName?: boolean;
}

/**
 * Displays a player's name with their chess title badge.
 * The title badge appears before the name by default, but can be configured.
 */
export function PlayerNameWithTitle({
    name,
    title,
    variant = 'body2',
    sx,
    titleBeforeName = true,
}: PlayerNameWithTitleProps) {
    if (!title) {
        return (
            <Typography variant={variant} sx={sx}>
                {name}
            </Typography>
        );
    }

    const titleElement = <ChessTitleBadge title={title} />;
    const nameElement = (
        <Typography variant={variant} sx={sx}>
            {name}
        </Typography>
    );

    return (
        <Stack
            direction='row'
            spacing={0.5}
            sx={{
                alignItems: 'center',
                minHeight: 0,
            }}
        >
            {titleBeforeName ? (
                <>
                    {titleElement}
                    {nameElement}
                </>
            ) : (
                <>
                    {nameElement}
                    {titleElement}
                </>
            )}
        </Stack>
    );
}
