import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SIDE_PANEL_TABS_KEY } from '../../../sidePanelTabs';
import { DefaultUnderboardTab } from '../underboardTabs';
import SidePanelSettings from './SidePanelSettings';

describe('SidePanelSettings', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        localStorage.clear();
    });

    it('renders a placement control for each provided tab', () => {
        render(
            <SidePanelSettings
                tabs={[
                    DefaultUnderboardTab.PgnText,
                    DefaultUnderboardTab.Explorer,
                    DefaultUnderboardTab.Settings,
                ]}
            />,
        );

        expect(screen.getByText('Side Panels')).toBeInTheDocument();
        expect(screen.getByTestId('side-panel-setting-pgnText')).toHaveTextContent('PGN Text');
        expect(screen.getByTestId('side-panel-setting-explorer')).toHaveTextContent(
            'Position Database',
        );
        expect(screen.getByTestId('side-panel-setting-settings')).toHaveTextContent('Settings');
    });

    it('stores placement changes in localStorage', () => {
        render(
            <SidePanelSettings
                tabs={[DefaultUnderboardTab.PgnText, DefaultUnderboardTab.Explorer]}
            />,
        );

        fireEvent.click(
            within(screen.getByTestId('side-panel-setting-explorer')).getByRole('button', {
                name: 'Both',
            }),
        );

        expect(localStorage.getItem(SIDE_PANEL_TABS_KEY)).toBe(
            JSON.stringify({ [DefaultUnderboardTab.Explorer]: 'both' }),
        );
    });
});
