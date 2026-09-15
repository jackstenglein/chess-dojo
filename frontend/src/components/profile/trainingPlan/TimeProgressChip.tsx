import { formatTime } from '@/database/requirement';
import { alpha, Box, BoxProps, Chip, ChipProps } from '@mui/material';
import { useTranslations } from 'next-intl';
import { RefObject } from 'react';

interface TimeProgressChipProps {
    /** The total goal in minutes. */
    goal: number;
    /** The current value completed in minutes. */
    value: number;
    /** Props passed to slots. */
    slotProps?: {
        /** Props passed to the main container. */
        container?: BoxProps;
        /** Props passed to the background. */
        background?: BoxProps;
        /** Props passed to the chip. */
        chip?: ChipProps;
    };
    /** The ref for the container. */
    ref?: RefObject<HTMLDivElement>;
}

/**
 * Renders a MUI chip with a progress bar in the background for the given goal
 * of time and current value.
 * @param goal The time goal for the chip.
 * @param value The current time completed for the chip.
 */
export function TimeProgressChip({ goal, value, slotProps, ref, ...rest }: TimeProgressChipProps) {
    const tCommon = useTranslations('common');
    const percentage = Math.min(100, goal > 0 ? (100 * value) / goal : 100);
    const color = percentage < 50 ? 'error' : percentage < 100 ? 'warning' : 'success';
    const { sx: containerSx, ...containerProps } = slotProps?.container ?? {};
    const { sx: backgroundSx, ...backgroundProps } = slotProps?.background ?? {};

    return (
        <Box
            ref={ref}
            {...rest}
            {...containerProps}
            sx={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                ...containerSx,
            }}
        >
            <Box
                {...backgroundProps}
                sx={{
                    position: 'absolute',
                    top: 1,
                    bottom: 1,
                    width: `${percentage}%`,
                    backgroundColor: (theme) => alpha(theme.palette[color].main, 0.2),
                    ...backgroundSx,
                }}
            />
            <Chip
                variant='outlined'
                label={`${formatTime(value, tCommon)} / ${formatTime(goal, tCommon)}`}
                {...slotProps?.chip}
                sx={{
                    borderColor: (theme) => alpha(theme.palette[color].main, 0.6),
                    ...slotProps?.chip?.sx,
                }}
            />
        </Box>
    );
}
