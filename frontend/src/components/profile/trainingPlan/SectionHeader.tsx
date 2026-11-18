import { formatTime } from '@/database/requirement';
import { ExpandMore } from '@mui/icons-material';
import { alpha, Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { getBarColor, useBarColor } from './barColor';
import { TrainingPlanContext } from './TrainingPlanTab';
import { WorkGoalDialog } from './WorkGoalDialog';

/**
 * The width of the title column in the Today and This Week headers, in px,
 * measured from the header's outer edge. The time label starts after it, so the
 * This Week category bars below can line up with it.
 */
export const SECTION_TITLE_WIDTH = 208;

/** The width of the header's border, in px. */
const BORDER = 1;

/** The padding at the header's left, in px. */
const PADDING_LEFT = 16;

/** The gap between the title and the time label, in px. */
const GAP = 16;

/**
 * The header of the Today and This Week sections. The whole header is a progress
 * bar: it fills from the left as time is logged against the goal, and turns green
 * once the goal is met. The chevron at the right shows or hides the section (a
 * hidden section's title is slightly dimmed); for the plan's owner, clicking
 * anywhere else on the header opens the weekly goal editor.
 */
export function SectionHeader({
    title,
    expanded,
    onToggle,
    goal,
    worked,
    showProgress = true,
    testId,
}: {
    /** The section's title. */
    title: string;
    /** Whether the section is shown. */
    expanded: boolean;
    /** Called when the title is clicked. */
    onToggle: () => void;
    /** The goal for the section, in minutes. */
    goal: number;
    /** The time worked in the section, in minutes. */
    worked: number;
    /** Whether to show the progress (false while loading). */
    showProgress?: boolean;
    /** Prefix for the test ids of the title (`-title`), chevron (`-toggle`) and bar (`-goal`). */
    testId: string;
}) {
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tMenu = useTranslations('profile.trainingPlan.planMenu');
    const tTime = useTranslations('common');
    const { user, isCurrentUser } = use(TrainingPlanContext);
    const [goalOpen, setGoalOpen] = useState(false);

    const percent = goal > 0 ? Math.min(100, (100 * worked) / goal) : 0;
    const done = goal > 0 && worked >= goal;
    // The viewer's bar color: by default it blends from orange through yellow to
    // green as the goal nears; they can pick a single color instead.
    const [barColor] = useBarColor();
    const progressColor = getBarColor(percent, barColor);
    const time = `${formatTime(worked, tTime)} / ${formatTime(goal, tTime)}`;

    return (
        <Box
            data-testid={`${testId}-header`}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                width: { xs: 1, sm: 'fit-content' },
                minWidth: { sm: 440 },
                border: `${BORDER}px solid`,
                borderColor: (theme) =>
                    showProgress ? alpha(progressColor, 0.7) : theme.palette.divider,
                backgroundColor: showProgress ? alpha(progressColor, 0.05) : 'transparent',
                borderRadius: '26px',
                transition: 'border-color 300ms',
            }}
        >
            {showProgress && isCurrentUser && (
                <Tooltip title={tMenu('workGoal')} followCursor>
                    <ButtonBase
                        onClick={() => setGoalOpen(true)}
                        aria-label={`${tMenu('workGoal')}: ${time}`}
                        data-testid={`${testId}-goal`}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            transition: 'background-color 150ms',
                            '&:hover, &.Mui-focusVisible': { backgroundColor: 'action.hover' },
                        }}
                    />
                </Tooltip>
            )}

            {showProgress && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        width: `${percent}%`,
                        background: `linear-gradient(90deg, ${alpha(progressColor, 0.18)}, ${alpha(progressColor, 0.42)})`,
                        transition: 'width 400ms ease-out, background 400ms',
                    }}
                />
            )}

            <Box
                sx={{
                    position: 'relative',
                    // Clicks outside the chevron fall through to the goal button behind.
                    pointerEvents: 'none',
                    display: 'grid',
                    alignItems: 'center',
                    columnGap: `${GAP}px`,
                    py: 0.75,
                    pl: `${PADDING_LEFT}px`,
                    pr: 1,
                    // Title, time, and the chevron at the far right.
                    gridTemplateColumns: {
                        xs: 'auto minmax(0, 1fr) auto',
                        sm: `${SECTION_TITLE_WIDTH - BORDER - PADDING_LEFT}px minmax(0, 1fr) auto`,
                    },
                }}
            >
                <Typography
                    variant='h5'
                    component='h2'
                    data-testid={`${testId}-title`}
                    sx={{
                        justifySelf: 'start',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        // A hidden section's title is slightly dimmed.
                        opacity: expanded ? 1 : 0.8,
                        transition: 'opacity 200ms',
                    }}
                >
                    {title}
                </Typography>

                <Box sx={{ justifySelf: { xs: 'end', sm: 'start' } }}>
                    {showProgress && (
                        <GoalTime time={time} doneColor={done ? progressColor : undefined} />
                    )}
                </Box>

                {/* Matches the arrows on the Training Plan's category rows. */}
                <Tooltip title={expanded ? tCommon('hide') : tCommon('show')}>
                    <IconButton
                        onClick={onToggle}
                        aria-label={expanded ? tCommon('hide') : tCommon('show')}
                        aria-expanded={expanded}
                        data-testid={`${testId}-toggle`}
                        size='small'
                        sx={{ pointerEvents: 'auto' }}
                    >
                        <ExpandMore
                            sx={{
                                transform: expanded ? 'rotate(180deg)' : undefined,
                                transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        />
                    </IconButton>
                </Tooltip>
            </Box>

            {isCurrentUser && (
                <WorkGoalDialog
                    open={goalOpen}
                    onClose={() => setGoalOpen(false)}
                    initialWeekStart={user.weekStart}
                    workGoal={user.workGoal}
                    workGoalHistory={user.workGoalHistory}
                />
            )}
        </Box>
    );
}

/** The time against the goal; it takes the bar's color once the goal is met. */
function GoalTime({ time, doneColor }: { time: string; doneColor?: string }) {
    return (
        <Typography
            sx={{
                fontWeight: 700,
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
                color: doneColor ?? 'text.primary',
            }}
        >
            {time}
        </Typography>
    );
}
