import { Add, Remove } from '@mui/icons-material';
import { Box, IconButton, InputBase, Theme, Typography } from '@mui/material';
import { useState } from 'react';

/**
 * A number with − and + buttons either side, in one outlined box. The unit sits
 * inside the box, after the number.
 */
export function Stepper({
    value,
    onChange,
    onDecrement,
    onIncrement,
    decrementDisabled,
    incrementDisabled,
    unit,
    label,
    decrementLabel,
    incrementLabel,
    warning,
    primary,
    'data-testid': dataTestId,
}: {
    value: string;
    onChange: (text: string) => void;
    onDecrement: () => void;
    onIncrement: () => void;
    decrementDisabled?: boolean;
    incrementDisabled?: boolean;
    unit?: string;
    /** The accessible name of the number box. */
    label: string;
    decrementLabel: string;
    incrementLabel: string;
    /** Shows the number in the warning colour, e.g. when removing time. */
    warning?: boolean;
    /** Marks this as the main value to update: taller, with a blue outline and tinted buttons. */
    primary?: boolean;
    'data-testid'?: string;
}) {
    // What's being typed is kept as is and only applied when the field is left or
    // Enter is pressed, so a number can be typed digit by digit without each digit
    // being corrected to fit the allowed range.
    const [draft, setDraft] = useState<string>();
    const shown = draft ?? value;
    const commit = () => {
        if (draft !== undefined) {
            onChange(draft);
            setDraft(undefined);
        }
    };

    const size = primary ? 48 : 40;
    const buttonSx = {
        width: size,
        height: size,
        borderRadius: 0,
        flexShrink: 0,
        ...(primary && {
            color: 'primary.main',
            backgroundColor: (theme: Theme) =>
                theme.alpha((theme.vars ?? theme).palette.primary.main, 0.12),
            '&:hover': {
                backgroundColor: (theme: Theme) =>
                    theme.alpha((theme.vars ?? theme).palette.primary.main, 0.22),
            },
        }),
    };
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                width: 1,
                height: size,
                border: primary ? 1.5 : 1,
                borderColor: primary ? 'primary.main' : 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
                '&:focus-within': { borderColor: 'primary.main' },
            }}
        >
            <IconButton
                aria-label={decrementLabel}
                disabled={decrementDisabled}
                onClick={onDecrement}
                sx={{
                    ...buttonSx,
                    borderRight: 1,
                    borderColor: primary ? 'primary.main' : 'divider',
                }}
                data-testid={dataTestId && `${dataTestId}-decrement`}
            >
                <Remove fontSize='small' />
            </IconButton>
            <Box
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    gap: 0.5,
                    minWidth: 0,
                }}
            >
                <InputBase
                    value={shown}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            commit();
                        }
                    }}
                    inputProps={{
                        inputMode: 'numeric',
                        'aria-label': label,
                        size: Math.max(shown.length, 1),
                        style: { textAlign: 'center', padding: 0 },
                    }}
                    sx={{
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: primary ? '1.15rem' : undefined,
                        fontWeight: primary ? 600 : undefined,
                        color: warning ? 'warning.main' : undefined,
                        '& input': { width: `${Math.max(shown.length, 1) + 0.5}ch` },
                    }}
                    data-testid={dataTestId}
                />
                {unit && (
                    <Typography
                        sx={{ fontSize: 'inherit', color: 'text.primary', whiteSpace: 'nowrap' }}
                    >
                        {unit}
                    </Typography>
                )}
            </Box>
            <IconButton
                aria-label={incrementLabel}
                disabled={incrementDisabled}
                onClick={onIncrement}
                sx={{
                    ...buttonSx,
                    borderLeft: 1,
                    borderColor: primary ? 'primary.main' : 'divider',
                }}
                data-testid={dataTestId && `${dataTestId}-increment`}
            >
                <Add fontSize='small' />
            </IconButton>
        </Box>
    );
}
