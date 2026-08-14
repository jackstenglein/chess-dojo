'use client';

import { Settings } from '@mui/icons-material';
import { IconButton, Popover, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useFiltersContext } from './CalendarFilters';
import TimezoneFilter from './TimezoneFilter';

export default function CalendarSettingsMenu() {
    const t = useTranslations('navbar');
    const filters = useFiltersContext();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const menuId = useId();
    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title={t('settings')}>
                <IconButton
                    data-testid='calendar-settings-button'
                    aria-label={t('settings')}
                    aria-controls={open ? menuId : undefined}
                    aria-haspopup='true'
                    aria-expanded={open ? 'true' : undefined}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size='small'
                >
                    <Settings />
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { p: 2, width: 280 },
                    },
                }}
            >
                <TimezoneFilter filters={filters} />
            </Popover>
        </>
    );
}
