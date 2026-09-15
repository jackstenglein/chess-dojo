import { describe, expect, it } from 'vitest';
import { DefaultUnderboardTab } from './boardTools/underboard/underboardTabs';
import {
    DEFAULT_SIDE_PANEL_TAB_CONFIG,
    getInitialSidePanelTab,
    getSidePanelPlacement,
    getSidePanelTabs,
} from './sidePanelTabs';

const analysisTabs = [
    DefaultUnderboardTab.PgnText,
    DefaultUnderboardTab.Tags,
    DefaultUnderboardTab.Editor,
    DefaultUnderboardTab.Explorer,
    DefaultUnderboardTab.Clocks,
    DefaultUnderboardTab.Share,
    DefaultUnderboardTab.Settings,
];

describe('side panel tab preferences', () => {
    it('keeps the default analysis layout familiar', () => {
        expect(getSidePanelTabs(analysisTabs, {})).toEqual({
            leftTabs: [
                DefaultUnderboardTab.Tags,
                DefaultUnderboardTab.Editor,
                DefaultUnderboardTab.Explorer,
                DefaultUnderboardTab.Clocks,
                DefaultUnderboardTab.Share,
                DefaultUnderboardTab.Settings,
            ],
            rightTabs: [DefaultUnderboardTab.PgnText],
        });
    });

    it('allows a tab to appear on both sides', () => {
        expect(
            getSidePanelTabs(analysisTabs, {
                [DefaultUnderboardTab.Explorer]: 'both',
                [DefaultUnderboardTab.Editor]: 'right',
            }),
        ).toEqual({
            leftTabs: [
                DefaultUnderboardTab.Tags,
                DefaultUnderboardTab.Explorer,
                DefaultUnderboardTab.Clocks,
                DefaultUnderboardTab.Share,
                DefaultUnderboardTab.Settings,
            ],
            rightTabs: [
                DefaultUnderboardTab.PgnText,
                DefaultUnderboardTab.Editor,
                DefaultUnderboardTab.Explorer,
            ],
        });
    });

    it('ignores stored tabs unavailable on the current page', () => {
        expect(
            getSidePanelTabs([DefaultUnderboardTab.PgnText, DefaultUnderboardTab.Settings], {
                [DefaultUnderboardTab.Comments]: 'right',
                [DefaultUnderboardTab.PgnText]: 'both',
            }),
        ).toEqual({
            leftTabs: [DefaultUnderboardTab.PgnText, DefaultUnderboardTab.Settings],
            rightTabs: [DefaultUnderboardTab.PgnText],
        });
    });

    it('falls back to PGN Text when a stored config would empty the right panel', () => {
        expect(
            getSidePanelTabs(analysisTabs, {
                [DefaultUnderboardTab.PgnText]: 'left',
                [DefaultUnderboardTab.Tags]: 'left',
                [DefaultUnderboardTab.Editor]: 'left',
                [DefaultUnderboardTab.Explorer]: 'left',
                [DefaultUnderboardTab.Clocks]: 'left',
                [DefaultUnderboardTab.Share]: 'left',
                [DefaultUnderboardTab.Settings]: 'left',
            }),
        ).toEqual({
            leftTabs: analysisTabs,
            rightTabs: [DefaultUnderboardTab.PgnText],
        });
    });

    it('returns default placement when no stored placement exists', () => {
        expect(getSidePanelPlacement(DefaultUnderboardTab.PgnText, {})).toBe('right');
        expect(getSidePanelPlacement(DefaultUnderboardTab.Explorer, {})).toBe(
            DEFAULT_SIDE_PANEL_TAB_CONFIG[DefaultUnderboardTab.Explorer],
        );
    });

    it('returns an available initial tab', () => {
        expect(
            getInitialSidePanelTab(
                [DefaultUnderboardTab.Tags, DefaultUnderboardTab.Settings],
                DefaultUnderboardTab.Explorer,
            ),
        ).toBe(DefaultUnderboardTab.Tags);
        expect(
            getInitialSidePanelTab(
                [DefaultUnderboardTab.Explorer, DefaultUnderboardTab.Settings],
                DefaultUnderboardTab.Explorer,
            ),
        ).toBe(DefaultUnderboardTab.Explorer);
    });
});
