import { MoreVert } from '@mui/icons-material';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

/** An action shown in a daily task card's overflow menu. */
export interface DailyTaskMenuAction {
    /** A key unique within the menu. */
    key: string;
    /** The label of the action. */
    label: string;
    /** The icon shown beside the label. */
    icon: ReactNode;
    /** The callback invoked when the action is selected. */
    onClick: () => void;
}

/**
 * Renders the overflow menu for a daily task card. Secondary actions live here so
 * that the card's footer can hold only the primary action, the timer and the
 * progress chip, which fits the narrowest phone without wrapping.
 */
export function DailyTaskMenu({ actions }: { actions: DailyTaskMenuAction[] }) {
    const tCommon = useTranslations('profile.trainingPlan.common');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    if (actions.length === 0) {
        return null;
    }

    return (
        <>
            <Tooltip title={tCommon('moreActions')}>
                <IconButton
                    size='small'
                    aria-label={tCommon('moreActions')}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        zIndex: 1,
                        color: 'text.secondary',
                    }}
                    data-testid='daily-task-menu-button'
                >
                    <MoreVert fontSize='small' />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {actions.map((action) => (
                    <MenuItem
                        key={action.key}
                        onClick={() => {
                            setAnchorEl(null);
                            action.onClick();
                        }}
                        data-testid={`daily-task-menu-${action.key}`}
                    >
                        <ListItemIcon sx={{ color: 'text.secondary' }}>{action.icon}</ListItemIcon>
                        <ListItemText>{action.label}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
