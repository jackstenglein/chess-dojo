import { formatTime } from '@/database/requirement';
import { Check } from '@mui/icons-material';
import { alpha, Box, ButtonBase, SxProps, Theme } from '@mui/material';
import { useTranslations } from 'next-intl';
import { getBarColor, useBarColor } from '../barColor';

/**
 * The frame shared by every card in Today: a soft rounded card with a quiet border
 * that brightens on hover, and takes the done color (the viewer's bar color, green
 * by default) when the task is done.
 */
export function dailyCardSx(isComplete: boolean, doneColor?: string): SxProps<Theme> {
    return (theme) => {
        const done = doneColor ?? theme.palette.success.main;
        return {
            height: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            borderRadius: 3,
            border: `1px solid ${
                isComplete ? alpha(done, 0.45) : (theme.vars ?? theme).palette.divider
            }`,
            backgroundColor: isComplete
                ? alpha(done, 0.04)
                : (theme.vars ?? theme).palette.background.paper,
            transition: 'border-color 150ms, background-color 150ms',
            '&:hover': {
                borderColor: isComplete
                    ? alpha(done, 0.7)
                    : theme.alpha((theme.vars ?? theme).palette.text.primary, 0.25),
            },
        };
    };
}

/**
 * Returns whether a Today task is done: either the task itself is finished (for
 * example a checkbox task that was checked off), or it had time planned today and
 * that time has been logged. Logging time on a task that wasn't planned for today
 * doesn't make it done.
 * @param workedMinutes The minutes logged on the task today.
 * @param goalMinutes The minutes planned for the task today.
 * @param taskFinished Whether the task itself is finished.
 */
export function isDailyTaskDone(
    workedMinutes: number,
    goalMinutes: number,
    taskFinished = false,
): boolean {
    return taskFinished || (goalMinutes > 0 && workedMinutes >= goalMinutes);
}

/**
 * The row of actions at the foot of a card. A fixed height keeps the main button
 * level across cards whether or not the row also holds the 40px timer button.
 */
export const dailyCardActionsSx: SxProps<Theme> = {
    // Longer translations of the button text wrap the time onto its own line
    // rather than pushing it past the card's edge.
    flexWrap: 'wrap',
    gap: 0.75,
    px: 2,
    pt: 0.25,
    pb: 1.5,
    minHeight: 52,
    alignItems: 'center',
};

/** The card's main action: a rounded, sentence-case button. */
export const dailyPrimaryButtonSx = {
    textTransform: 'none',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    borderRadius: 999,
    height: 32,
    px: 1.5,
} satisfies SxProps<Theme>;

/**
 * Today's time on a task as a small pill that fills in green as time is logged:
 * half full at 15m of 30m, and full for any time logged on a task with nothing
 * planned. A done task gets a check. Not having started yet is not an error, so it
 * is never red.
 */
export function DailyTimePill({
    worked,
    goal,
    done: doneOverride,
    label,
    onClick,
    'data-testid': dataTestId,
}: {
    worked: number;
    goal: number;
    /** Whether the task is done; by default worked out from the time. */
    done?: boolean;
    /** Overrides the "worked / goal" text. */
    label?: string;
    onClick?: () => void;
    'data-testid'?: string;
}) {
    const tTime = useTranslations('common');
    const [barColor] = useBarColor();
    const done = doneOverride ?? (goal > 0 ? worked >= goal : worked > 0);
    const logged = goal > 0 ? Math.min(100, (100 * worked) / goal) : worked > 0 ? 100 : 0;
    const percent = done ? 100 : logged;
    // A full pill is outlined and written in green, like a done one.
    const full = percent >= 100;
    // The pill follows the viewer's bar color: its fill shifts like the Today bar,
    // and a full pill takes the done color.
    const color = getBarColor(percent, barColor);

    return (
        <ButtonBase
            onClick={onClick}
            disabled={!onClick}
            data-testid={dataTestId}
            sx={(theme) => ({
                position: 'relative',
                overflow: 'hidden',
                gap: 0.5,
                px: 1.25,
                height: 28,
                borderRadius: 999,
                fontSize: '0.8rem',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: `1px solid ${
                    full ? alpha(color, 0.5) : (theme.vars ?? theme).palette.divider
                }`,
                color: full ? color : (theme.vars ?? theme).palette.text.secondary,
                '&.Mui-disabled': {
                    color: full ? color : (theme.vars ?? theme).palette.text.secondary,
                },
            })}
        >
            {percent > 0 && (
                <Box
                    data-testid='daily-time-pill-fill'
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        width: `${percent}%`,
                        backgroundColor: alpha(color, 0.2),
                    }}
                />
            )}
            {done && <Check sx={{ fontSize: '0.95rem', zIndex: 1 }} />}
            <Box component='span' sx={{ zIndex: 1 }}>
                {label ?? `${formatTime(worked, tTime)} / ${formatTime(goal, tTime)}`}
            </Box>
        </ButtonBase>
    );
}

/**
 * Styles for a finished check-off task's "Completed" button: green even though it's
 * disabled, so it reads as done rather than unavailable.
 * @param theme The theme.
 */
export function completedButtonStyles(theme: Theme, doneColor?: string) {
    const done = doneColor ?? theme.palette.success.main;
    return {
        '&.Mui-disabled': {
            color: done,
            borderColor: alpha(done, 0.5),
            backgroundColor: alpha(done, 0.12),
        },
    };
}
