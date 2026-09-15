import { useCallback, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { DefaultUnderboardTab } from './boardTools/underboard/underboardTabs';

export type SidePanelTabPlacement = 'left' | 'right' | 'both';
export type SidePanelTabConfig = Partial<Record<DefaultUnderboardTab, SidePanelTabPlacement>>;

export const SIDE_PANEL_TABS_KEY = 'analysisSidePanelTabs';

export const DEFAULT_SIDE_PANEL_TAB_CONFIG: Record<DefaultUnderboardTab, SidePanelTabPlacement> = {
    [DefaultUnderboardTab.Directories]: 'left',
    [DefaultUnderboardTab.PgnText]: 'right',
    [DefaultUnderboardTab.Tags]: 'left',
    [DefaultUnderboardTab.Editor]: 'left',
    [DefaultUnderboardTab.Comments]: 'left',
    [DefaultUnderboardTab.Explorer]: 'left',
    [DefaultUnderboardTab.Clocks]: 'left',
    [DefaultUnderboardTab.Share]: 'left',
    [DefaultUnderboardTab.Settings]: 'left',
    [DefaultUnderboardTab.Tools]: 'left',
};

export const SIDE_PANEL_TAB_LABELS: Record<DefaultUnderboardTab, string> = {
    [DefaultUnderboardTab.Directories]: 'Files',
    [DefaultUnderboardTab.PgnText]: 'PGN Text',
    [DefaultUnderboardTab.Tags]: 'PGN Tags',
    [DefaultUnderboardTab.Editor]: 'Edit PGN',
    [DefaultUnderboardTab.Comments]: 'Comments',
    [DefaultUnderboardTab.Explorer]: 'Position Database',
    [DefaultUnderboardTab.Clocks]: 'Clock Usage',
    [DefaultUnderboardTab.Share]: 'Share',
    [DefaultUnderboardTab.Settings]: 'Settings',
    [DefaultUnderboardTab.Tools]: 'Tools',
};

export function getSidePanelPlacement(
    tab: DefaultUnderboardTab,
    config?: SidePanelTabConfig,
): SidePanelTabPlacement {
    return config?.[tab] ?? DEFAULT_SIDE_PANEL_TAB_CONFIG[tab];
}

export function getSidePanelTabs(
    availableTabs: DefaultUnderboardTab[],
    config?: SidePanelTabConfig,
): { leftTabs: DefaultUnderboardTab[]; rightTabs: DefaultUnderboardTab[] } {
    const leftTabs: DefaultUnderboardTab[] = [];
    const rightTabs: DefaultUnderboardTab[] = [];

    for (const tab of availableTabs) {
        const placement = getSidePanelPlacement(tab, config);
        if (placement === 'left' || placement === 'both') {
            leftTabs.push(tab);
        }
        if (placement === 'right' || placement === 'both') {
            rightTabs.push(tab);
        }
    }

    if (rightTabs.length === 0 && availableTabs.includes(DefaultUnderboardTab.PgnText)) {
        rightTabs.push(DefaultUnderboardTab.PgnText);
    }

    return { leftTabs, rightTabs };
}

export function getInitialSidePanelTab(
    tabs: DefaultUnderboardTab[],
    preferred: DefaultUnderboardTab,
): DefaultUnderboardTab | undefined {
    return tabs.includes(preferred) ? preferred : tabs[0];
}

export function useSidePanelTabs(availableTabs: DefaultUnderboardTab[]) {
    const [config, setConfig] = useLocalStorage<SidePanelTabConfig>(SIDE_PANEL_TABS_KEY, {});

    const { leftTabs, rightTabs } = useMemo(
        () => getSidePanelTabs(availableTabs, config),
        [availableTabs, config],
    );

    const setPlacement = useCallback(
        (tab: DefaultUnderboardTab, placement: SidePanelTabPlacement) => {
            setConfig((prev) => ({ ...prev, [tab]: placement }));
        },
        [setConfig],
    );

    return {
        config,
        leftTabs,
        rightTabs,
        setPlacement,
    };
}
