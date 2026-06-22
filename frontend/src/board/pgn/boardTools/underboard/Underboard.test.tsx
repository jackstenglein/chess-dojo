import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Underboard from './Underboard';
import { DefaultUnderboardTab } from './underboardTabs';

const { explorerProps } = vi.hoisted(() => ({
    explorerProps: [] as { storageKey?: string }[],
}));

vi.mock('@mui/icons-material', () => ({
    AccessAlarm: () => <span data-testid='icon-clock' />,
    Article: () => <span data-testid='icon-pgn-text' />,
    Chat: () => <span data-testid='icon-chat' />,
    Construction: () => <span data-testid='icon-tools' />,
    Edit: () => <span data-testid='icon-edit' />,
    Folder: () => <span data-testid='icon-folder' />,
    MoreHoriz: () => <span data-testid='icon-more' />,
    Sell: () => <span data-testid='icon-tags' />,
    Settings: () => <span data-testid='icon-settings' />,
    Share: () => <span data-testid='icon-share' />,
    Storage: () => <span data-testid='icon-storage' />,
}));

vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Authenticated: 'authenticated' },
    useAuth: () => ({ status: 'authenticated' }),
}));

vi.mock('@/context/useGame', () => ({
    default: () => ({ game: undefined, isOwner: true }),
}));

vi.mock('@/style/useLightMode', () => ({
    useLightMode: () => true,
}));

vi.mock('react-resizable', () => ({
    Resizable: ({ children }: { children: ReactNode }) => (
        <div data-testid='resizable'>{children}</div>
    ),
}));

vi.mock('../../PgnBoard', () => ({
    useChess: () => ({ chess: {} }),
}));

vi.mock('../../ResizeHandle', () => ({
    default: () => <div data-testid='resize-handle' />,
}));

vi.mock('../../pgnText/PgnText', () => ({
    UnderboardPgnText: () => <div data-testid='underboard-pgn-text'>PGN text tab</div>,
}));

vi.mock('../../explorer/Explorer', () => ({
    default: (props: { storageKey?: string }) => {
        explorerProps.push(props);
        return <div data-testid='explorer-tab'>Explorer tab</div>;
    },
}));

vi.mock('../../explorer/player/PlayerOpeningTree', () => ({
    PlayerOpeningTreeProvider: ({ children }: { children: ReactNode }) => (
        <div data-testid='player-opening-tree-provider'>{children}</div>
    ),
}));

vi.mock('./Editor', () => ({
    default: () => <div data-testid='editor-tab' />,
}));

vi.mock('./clock/ClockUsage', () => ({
    default: () => <div data-testid='clock-tab' />,
}));

vi.mock('./comments/Comments', () => ({
    default: () => <div data-testid='comments-tab' />,
}));

vi.mock('./directories/Directories', () => ({
    Directories: () => <div data-testid='directories-tab' />,
}));

vi.mock('./settings/Settings', () => ({
    default: ({ sidePanelTabs }: { sidePanelTabs?: unknown[] }) => (
        <div data-testid='settings-tab' data-side-panel-tabs={sidePanelTabs?.length ?? 0} />
    ),
}));

vi.mock('./share/ShareTab', () => ({
    ShareTab: () => <div data-testid='share-tab' />,
}));

vi.mock('./tags/Tags', () => ({
    default: () => <div data-testid='tags-tab' />,
}));

vi.mock('./tools/Tools', () => ({
    Tools: () => <div data-testid='tools-tab' />,
}));

const resizeData = {
    width: 480,
    minWidth: 100,
    maxWidth: 800,
    height: 500,
    minHeight: 200,
    maxHeight: 800,
};

describe('Underboard side-panel tabs', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        localStorage.clear();
        explorerProps.length = 0;
    });

    it('renders PGN Text as a selectable tab', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                initialTab={DefaultUnderboardTab.Explorer}
                resizeData={resizeData}
                onResize={vi.fn()}
            />,
        );

        expect(screen.getByTestId('explorer-tab')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('underboard-button-pgnText'));

        expect(screen.getByTestId('underboard-pgn-text')).toBeInTheDocument();
    });

    it('uses the provided tab storage key when no forced initial tab is set', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                storageKey='analysis.left.tab'
                resizeData={resizeData}
                onResize={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('underboard-button-pgnText'));

        expect(localStorage.getItem('analysis.left.tab')).toBe(JSON.stringify('pgnText'));
        expect(localStorage.getItem('underboardTab')).toBeNull();
    });

    it('passes the panel-scoped Explorer storage key', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                initialTab={DefaultUnderboardTab.Explorer}
                explorerStorageKey='analysis.left.explorerTab'
                resizeData={resizeData}
                onResize={vi.fn()}
            />,
        );

        expect(screen.getByTestId('player-opening-tree-provider')).toBeInTheDocument();
        expect(explorerProps[0]).toEqual({ storageKey: 'analysis.left.explorerTab' });
    });

    it('prefixes tab button test ids for secondary panels', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.Tags, DefaultUnderboardTab.PgnText]}
                buttonTestIdPrefix='right-'
                resizeData={resizeData}
                onResize={vi.fn()}
            />,
        );

        expect(screen.getByTestId('right-underboard-button-tags')).toBeInTheDocument();
        expect(screen.queryByTestId('underboard-button-tags')).not.toBeInTheDocument();
    });

    it('renders header content above the tab buttons', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                initialTab={DefaultUnderboardTab.Explorer}
                resizeData={resizeData}
                onResize={vi.fn()}
                header={<div data-testid='right-panel-header'>Header</div>}
            />,
        );

        expect(screen.getByTestId('right-panel-header')).toBeInTheDocument();
        expect(screen.getByTestId('explorer-tab')).toBeInTheDocument();
    });

    it('keeps header content outside the tab content card', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.PgnText]}
                initialTab={DefaultUnderboardTab.PgnText}
                resizeData={resizeData}
                onResize={vi.fn()}
                header={<div data-testid='right-panel-header'>Header</div>}
            />,
        );

        expect(screen.getByTestId('right-panel-header').closest('.MuiCard-root')).toBeNull();
        expect(
            screen.getByTestId('underboard-tab-content').closest('.MuiCard-root'),
        ).not.toBeNull();
    });

    it('falls back to an available tab when initialTab is unavailable', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.PgnText]}
                initialTab={DefaultUnderboardTab.Explorer}
                resizeData={resizeData}
                onResize={vi.fn()}
            />,
        );

        expect(screen.getByTestId('underboard-pgn-text')).toBeInTheDocument();
    });

    it('passes available side-panel tabs to Settings', () => {
        renderWithIntl(
            <Underboard
                tabs={[DefaultUnderboardTab.Settings]}
                initialTab={DefaultUnderboardTab.Settings}
                resizeData={resizeData}
                onResize={vi.fn()}
                sidePanelTabs={[DefaultUnderboardTab.PgnText, DefaultUnderboardTab.Settings]}
            />,
        );

        expect(screen.getByTestId('settings-tab')).toHaveAttribute('data-side-panel-tabs', '2');
    });
});
