import {
    SIDE_PANEL_TAB_LABELS,
    SidePanelTabPlacement,
    getSidePanelPlacement,
    useSidePanelTabs,
} from '@/board/pgn/sidePanelTabs';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DefaultUnderboardTab } from '../underboardTabs';

interface SidePanelSettingsProps {
    tabs: DefaultUnderboardTab[];
}

const placements: { value: SidePanelTabPlacement; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'both', label: 'Both' },
];

export default function SidePanelSettings({ tabs }: SidePanelSettingsProps) {
    const { config, setPlacement } = useSidePanelTabs(tabs);

    return (
        <Stack spacing={2}>
            <Typography variant='h6'>Side Panels</Typography>

            {tabs.map((tab) => (
                <Stack
                    key={tab}
                    data-testid={`side-panel-setting-${tab}`}
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent='space-between'
                    spacing={1}
                >
                    <Typography>{SIDE_PANEL_TAB_LABELS[tab]}</Typography>
                    <ToggleButtonGroup
                        size='small'
                        exclusive
                        value={getSidePanelPlacement(tab, config)}
                        onChange={(_, value: SidePanelTabPlacement | null) => {
                            if (value) {
                                setPlacement(tab, value);
                            }
                        }}
                    >
                        {placements.map((placement) => (
                            <ToggleButton key={placement.value} value={placement.value}>
                                {placement.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Stack>
            ))}
        </Stack>
    );
}
