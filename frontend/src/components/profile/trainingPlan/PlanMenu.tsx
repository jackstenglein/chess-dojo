import { ResetProgressDialog } from '@/components/profile/edit/ResetProgressButton';
import { User } from '@/database/user';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { Check, RestartAlt, Schedule, Tune } from '@mui/icons-material';
import {
    Box,
    Button,
    ButtonBase,
    Checkbox,
    Divider,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Menu,
    MenuItem,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
    BAR_COLORS,
    BarColor,
    MULTICOLOR_SWATCH,
    SINGLE_BAR_COLORS,
    useBarColor,
} from './barColor';
import { WorkGoalDialog } from './WorkGoalDialog';

/** Which of the optional training plan sections the viewer has chosen to show. */
export interface TrainingPlanSections {
    showToday: boolean;
    setShowToday: (show: boolean) => void;
    showWeek: boolean;
    setShowWeek: (show: boolean) => void;
    /** Whether Today and This Week include the tasks the plan suggests. */
    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;
}

/**
 * Returns which of the Today and This Week sections are shown. The choice is saved
 * in the browser, like the sections' expanded state.
 */
export function useTrainingPlanSections(): TrainingPlanSections {
    const [showToday, setShowToday] = useLocalStorage('training-plan-show-today', true);
    const [showWeek, setShowWeek] = useLocalStorage('training-plan-show-week', true);
    const [showSuggestions, setShowSuggestions] = useLocalStorage(
        'training-plan-show-suggestions',
        true,
    );
    return {
        showToday,
        setShowToday,
        showWeek,
        setShowWeek,
        showSuggestions,
        setShowSuggestions,
    };
}

/**
 * The training plan's options button. It opens a menu with the options for how the
 * plan is viewed (which sections are shown) and, for the plan's owner, the work
 * goal and resetting progress.
 */
export function PlanMenu({
    user,
    isCurrentUser,
    sections,
}: {
    /** The user whose training plan is shown. */
    user: User;
    /** Whether the viewer owns the training plan. */
    isCurrentUser: boolean;
    /** The sections shown and their setters. */
    sections: TrainingPlanSections;
}) {
    const t = useTranslations('profile.trainingPlan.planMenu');
    const [anchor, setAnchor] = useState<HTMLElement>();
    const [workGoalOpen, setWorkGoalOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);

    const close = () => setAnchor(undefined);
    // Tighter than the default so the groups read as separate blocks.
    const dividerSx = { my: '4px !important' };

    return (
        <>
            <Tooltip title={t('tooltip')}>
                <Button
                    variant='outlined'
                    color='inherit'
                    startIcon={
                        <ChessDojoIcon sx={{ color: 'primary.main' }} titleAccess='ChessDojo' />
                    }
                    endIcon={<Tune />}
                    onClick={(e) => setAnchor(e.currentTarget)}
                    aria-label={t('tooltip')}
                    aria-haspopup='menu'
                    aria-expanded={!!anchor}
                    data-testid='plan-menu-button'
                    sx={{
                        textTransform: 'none',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        height: 44,
                        px: 2,
                        borderRadius: '22px',
                        borderColor: 'divider',
                        '& .MuiButton-startIcon > svg, & .MuiButton-endIcon > svg': {
                            fontSize: '1.5rem',
                        },
                    }}
                >
                    {t('plan')}
                </Button>
            </Tooltip>

            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={close}
                slotProps={{ paper: { sx: { minWidth: 240 } } }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {isCurrentUser && (
                    <MenuItem
                        onClick={() => {
                            close();
                            setWorkGoalOpen(true);
                        }}
                        data-testid='plan-menu-work-goal'
                    >
                        <ListItemIcon>
                            <Schedule fontSize='small' />
                        </ListItemIcon>
                        <ListItemText>{t('workGoal')}</ListItemText>
                    </MenuItem>
                )}
                {isCurrentUser && <Divider sx={dividerSx} />}
                <MenuSubheader>{t('show')}</MenuSubheader>
                <MenuItem
                    onClick={() => sections.setShowToday(!sections.showToday)}
                    data-testid='plan-menu-show-today'
                >
                    <ListItemIcon>
                        <Checkbox
                            size='small'
                            checked={sections.showToday}
                            tabIndex={-1}
                            disableRipple
                            sx={{ p: 0 }}
                        />
                    </ListItemIcon>
                    <ListItemText>{t('today')}</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => sections.setShowWeek(!sections.showWeek)}
                    data-testid='plan-menu-show-week'
                >
                    <ListItemIcon>
                        <Checkbox
                            size='small'
                            checked={sections.showWeek}
                            tabIndex={-1}
                            disableRipple
                            sx={{ p: 0 }}
                        />
                    </ListItemIcon>
                    <ListItemText>{t('thisWeek')}</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => sections.setShowSuggestions(!sections.showSuggestions)}
                    data-testid='plan-menu-show-suggestions'
                >
                    <ListItemIcon>
                        <Checkbox
                            size='small'
                            checked={sections.showSuggestions}
                            tabIndex={-1}
                            disableRipple
                            sx={{ p: 0 }}
                        />
                    </ListItemIcon>
                    <ListItemText>{t('suggestedTasks')}</ListItemText>
                </MenuItem>

                <Divider sx={dividerSx} />
                <MenuSubheader>{t('barColor')}</MenuSubheader>
                <BarColorPicker />
                {isCurrentUser && <Divider sx={dividerSx} />}
                {isCurrentUser && (
                    <MenuItem
                        onClick={() => {
                            close();
                            setResetOpen(true);
                        }}
                        sx={{ color: 'error.main' }}
                        data-testid='plan-menu-reset'
                    >
                        <ListItemIcon>
                            <RestartAlt fontSize='small' color='error' />
                        </ListItemIcon>
                        <ListItemText>{t('resetProgress')}</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {isCurrentUser && (
                <WorkGoalDialog
                    open={workGoalOpen}
                    onClose={() => setWorkGoalOpen(false)}
                    initialWeekStart={user.weekStart}
                    workGoal={user.workGoal}
                    workGoalHistory={user.workGoalHistory}
                />
            )}
            {isCurrentUser && (
                <ResetProgressDialog open={resetOpen} onClose={() => setResetOpen(false)} />
            )}
        </>
    );
}

/** A small, muted, all-caps heading for a group of options in the plan menu. */
function MenuSubheader({ children }: { children: ReactNode }) {
    return (
        <ListSubheader
            disableSticky
            sx={{
                backgroundColor: 'transparent',
                px: 2,
                pt: 0.5,
                lineHeight: '28px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
            }}
        >
            {children}
        </ListSubheader>
    );
}

/**
 * A row of swatches to pick the Today and This Week bar color: the multicolor
 * blend (the default) or one single color.
 */
function BarColorPicker() {
    const t = useTranslations('profile.trainingPlan.planMenu');
    const [barColor, setBarColor] = useBarColor();

    return (
        <Box
            role='radiogroup'
            aria-label={t('barColor')}
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                px: 2,
                pt: 0.75,
                pb: 1.25,
            }}
        >
            {BAR_COLORS.map((choice: BarColor) => {
                const selected = choice === barColor;
                const label = t(`barColors.${choice}`);
                return (
                    <Tooltip key={choice} title={label}>
                        <ButtonBase
                            role='radio'
                            aria-checked={selected}
                            aria-label={label}
                            onClick={() => setBarColor(choice)}
                            data-testid={`bar-color-${choice}`}
                            sx={{
                                width: 24,
                                height: 24,
                                flexShrink: 0,
                                borderRadius: '50%',
                                background:
                                    choice === 'multicolor'
                                        ? MULTICOLOR_SWATCH
                                        : SINGLE_BAR_COLORS[choice],
                                outline: selected ? '1.5px solid' : 'none',
                                outlineColor: 'text.primary',
                                outlineOffset: 2,
                                '&.Mui-focusVisible': {
                                    outline: '2px solid',
                                    outlineColor: 'text.secondary',
                                },
                            }}
                        >
                            {selected && <Check sx={{ fontSize: 14, color: '#000' }} />}
                        </ButtonBase>
                    </Tooltip>
                );
            })}
        </Box>
    );
}
