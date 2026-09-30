import { formatTime, RequirementCategory } from '@/database/requirement';
import { CategoryColors } from '@/style/ThemeProvider';
import { Check } from '@mui/icons-material';
import { alpha, Box, ButtonBase, SxProps, Theme, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { TrainingPlanIcon } from '../TrainingPlanIcon';

/**
 * The frame shared by every card in Today: a soft rounded card with a quiet border
 * that brightens on hover, and turns green when the task is done.
 */
export function dailyCardSx(isComplete: boolean): SxProps<Theme> {
    return (theme) => ({
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3,
        border: `1px solid ${
            isComplete ? alpha(theme.palette.success.main, 0.45) : theme.palette.divider
        }`,
        backgroundColor: isComplete
            ? alpha(theme.palette.success.main, 0.04)
            : theme.palette.background.paper,
        transition: 'border-color 150ms, background-color 150ms',
        '&:hover': {
            borderColor: isComplete
                ? alpha(theme.palette.success.main, 0.7)
                : alpha(theme.palette.text.primary, 0.25),
        },
    });
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
    px: 2.5,
    pt: 0.5,
    pb: 2,
    minHeight: 60,
    alignItems: 'center',
};

/** The card's main action: a rounded, sentence-case button. */
export const dailyPrimaryButtonSx: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    borderRadius: 999,
    height: 34,
    px: 1.75,
};

/**
 * A task's category as a small label, led by the category's icon from the full
 * training plan.
 */
export function CategoryLabel({ category }: { category: RequirementCategory }) {
    const tCategory = useTranslations('enums.requirementCategory');
    const color = CategoryColors[category];

    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <TrainingPlanIcon category={category} sx={{ fontSize: '1rem', color }} />
            <Typography
                variant='caption'
                sx={{
                    color,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                }}
            >
                {tCategory.has(category) ? tCategory(category) : category}
            </Typography>
        </Box>
    );
}

/**
 * Today's time on a task as a small pill that fills in as time is logged. It stays
 * neutral until the goal is met, then turns green with a check: not having started
 * yet is not an error, so it is never red.
 */
export function DailyTimePill({
    worked,
    goal,
    label,
    onClick,
    'data-testid': dataTestId,
}: {
    worked: number;
    goal: number;
    /** Overrides the "worked / goal" text. */
    label?: string;
    onClick?: () => void;
    'data-testid'?: string;
}) {
    const tTime = useTranslations('common');
    const done = goal > 0 ? worked >= goal : worked > 0;
    const percent = goal > 0 ? Math.min(100, (100 * worked) / goal) : 0;

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
                    done ? alpha(theme.palette.success.main, 0.5) : theme.palette.divider
                }`,
                color: done ? theme.palette.success.main : theme.palette.text.secondary,
                backgroundColor: done ? alpha(theme.palette.success.main, 0.12) : 'transparent',
                '&.Mui-disabled': {
                    color: done ? theme.palette.success.main : theme.palette.text.secondary,
                },
            })}
        >
            {!done && percent > 0 && (
                <Box
                    sx={(theme) => ({
                        position: 'absolute',
                        inset: 0,
                        width: `${percent}%`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.18),
                    })}
                />
            )}
            {done && <Check sx={{ fontSize: '0.95rem', zIndex: 1 }} />}
            <Box component='span' sx={{ zIndex: 1 }}>
                {label ?? `${formatTime(worked, tTime)} / ${formatTime(goal, tTime)}`}
            </Box>
        </ButtonBase>
    );
}
