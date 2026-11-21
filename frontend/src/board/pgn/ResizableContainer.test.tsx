import { renderWithIntl as render } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResizableContainer from './ResizableContainer';
import { DefaultUnderboardTab } from './boardTools/underboard/underboardTabs';

import { useImperativeHandle, type ReactNode, type Ref } from 'react';
import type { UnderboardApi } from './boardTools/underboard/Underboard';

const { redrawAll } = vi.hoisted(() => ({
    redrawAll: vi.fn(),
}));

vi.mock('@/style/useLightMode', () => ({ useLightMode: () => true }));
vi.mock('@/context/useGame', () => ({ default: () => ({}) }));
vi.mock('./PgnBoard', () => ({
    useChess: () => ({ chess: {}, board: { redrawAll }, toggleOrientation: () => null }),
}));
vi.mock('./boardTools/boardButtons/StartButtons', () => ({ default: () => null }));
vi.mock('./boardTools/boardButtons/StatusIcon', () => ({ default: () => null }));
vi.mock('@/components/games/edit/UnpublishedGameBanner', () => ({ VisibilityIcon: () => null }));
vi.mock('@/components/games/edit/UnsavedGameBanner', () => ({ UnsavedGameIcon: () => null }));

vi.mock('./KeyboardHandler', () => ({
    default: ({ underboardRef }: { underboardRef: React.RefObject<UnderboardApi | null> }) => (
        <button onClick={() => underboardRef.current?.switchTab(DefaultUnderboardTab.Explorer)}>
            Reveal explorer
        </button>
    ),
}));

vi.mock('../Board', () => ({
    default: ({
        resizeData,
        hideResize,
        onResize,
    }: {
        resizeData: { width: number };
        hideResize?: boolean;
        onResize: (event: unknown, data: { size: { width: number; height: number } }) => void;
    }) => (
        <div data-testid='board-area' data-width={resizeData.width} data-hide-resize={hideResize}>
            <input aria-label='board state' />
            <button onClick={() => onResize(null, { size: { width: 300, height: 300 } })}>
                Resize board
            </button>
        </div>
    ),
    useReconcile: () => null,
}));
vi.mock('./PlayerHeader', () => ({
    default: ({ type }: { type: string }) => <div data-testid={`player-${type}`} />,
}));

vi.mock('./pgnText/PgnText', () => ({
    PgnTextBanners: () => <div data-testid='pgn-text-banners' />,
    ResizablePgnText: ({ hidden }: { hidden?: boolean }) => (
        <div data-testid='dedicated-pgn-panel' style={{ display: hidden ? 'none' : undefined }} />
    ),
}));

vi.mock('./boardTools/underboard/Underboard', () => ({
    default: function MockUnderboard({
        tabs,
        initialTab,
        storageKey,
        explorerStorageKey,
        buttonTestIdPrefix,
        header,
        sidePanelTabs,
        hidden,
        onReveal,
        onResize,
        ref,
    }: {
        tabs: unknown[];
        initialTab?: string;
        storageKey?: string;
        explorerStorageKey?: string;
        buttonTestIdPrefix?: string;
        header?: ReactNode;
        sidePanelTabs?: unknown[];
        hidden?: boolean;
        onReveal?: () => void;
        onResize: (width: number, height: number) => void;
        ref?: Ref<UnderboardApi>;
    }) {
        useImperativeHandle(ref, () => ({
            switchTab: () => onReveal?.(),
            focusEditor: () => onReveal?.(),
            focusCommenter: () => onReveal?.(),
        }));
        return (
            <div
                data-testid='underboard-panel'
                data-tabs={tabs.length}
                data-initial-tab={initialTab}
                data-storage-key={storageKey}
                data-explorer-storage-key={explorerStorageKey}
                data-button-test-id-prefix={buttonTestIdPrefix}
                data-has-header={header ? 'true' : 'false'}
                data-side-panel-tabs={sidePanelTabs?.length ?? 0}
                style={{ display: hidden ? 'none' : undefined }}
            >
                <input aria-label={`${buttonTestIdPrefix || 'left-'}draft`} />
                <button onClick={() => onResize(200, 400)}>
                    Resize {buttonTestIdPrefix || 'left-'}
                </button>
            </div>
        );
    },
}));

describe('ResizableContainer side panels', () => {
    const board = (
        allowPanelHiding = true,
        left = true,
        right = true,
        showPlayerHeaders = true,
    ) => (
        <div id='resize-container'>
            <ResizableContainer
                allowPanelHiding={allowPanelHiding}
                showPlayerHeaders={showPlayerHeaders}
                underboardTabs={left ? [DefaultUnderboardTab.Explorer] : []}
                rightTabs={right ? [DefaultUnderboardTab.PgnText] : []}
                onInitialize={vi.fn()}
            />
        </div>
    );

    it('toggles panels independently, retains mounted state, and resets on a fresh mount', () => {
        const { unmount } = render(board());
        const initialWidth = Number(screen.getByTestId('board-area').dataset.width);
        const draft = screen.getByRole('textbox', { name: 'left-draft' });
        fireEvent.change(draft, { target: { value: 'Unfinished comment' } });
        const position = screen.getByRole('textbox', { name: 'board state' });
        fireEvent.change(position, { target: { value: 'e4 e5 Nf3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Hide left panel' }));
        expect(draft).not.toBeVisible();
        expect(screen.getAllByTestId('underboard-panel')[1]).toBeVisible();
        expect(Number(screen.getByTestId('board-area').dataset.width)).toBe(initialWidth);
        fireEvent.click(screen.getByRole('button', { name: 'Hide right panel' }));
        expect(screen.getByRole('button', { name: 'Show right panel' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        fireEvent.click(screen.getByRole('button', { name: 'Show left panel' }));
        expect(draft).toBeVisible();
        expect(draft).toHaveValue('Unfinished comment');
        expect(position).toHaveValue('e4 e5 Nf3');
        fireEvent.click(screen.getByRole('button', { name: 'Show right panel' }));
        expect(Number(screen.getByTestId('board-area').dataset.width)).toBe(initialWidth);
        fireEvent.click(screen.getByRole('button', { name: 'Hide left panel' }));
        unmount();
        render(board());
        expect(screen.getByRole('button', { name: 'Hide left panel' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    it.each(['left', 'right'] as const)(
        'redraws the board when the %s panel changes visibility',
        (side) => {
            render(board());
            redrawAll.mockClear();

            fireEvent.click(screen.getByRole('button', { name: `Hide ${side} panel` }));
            expect(redrawAll).toHaveBeenCalledOnce();

            fireEvent.click(screen.getByRole('button', { name: `Show ${side} panel` }));
            expect(redrawAll).toHaveBeenCalledTimes(2);
        },
    );

    it('redraws the board when player bars and controls change visibility', () => {
        render(board());
        redrawAll.mockClear();

        fireEvent.click(screen.getByRole('button', { name: 'Hide player bars and controls' }));
        expect(redrawAll).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole('button', { name: 'Show player bars and controls' }));
        expect(redrawAll).toHaveBeenCalledTimes(2);
    });

    it('fits without losing manual dimensions or board state, and moves focus to restoration', () => {
        const { unmount } = render(board());
        const position = screen.getByRole('textbox', { name: 'board state' });
        fireEvent.change(position, { target: { value: 'e4 e5 Nf3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Resize board' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide left panel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide right panel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide player bars and controls' }));
        expect(screen.queryByTestId('player-header')).not.toBeInTheDocument();
        expect(screen.queryByTestId('player-footer')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Show left panel' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Show right panel' })).toBeInTheDocument();
        expect(screen.getByTestId('board-area')).toHaveAttribute('data-width', '756');
        expect(screen.getByTestId('board-area')).toHaveAttribute('data-hide-resize', 'true');
        expect(screen.getByRole('button', { name: 'Show player bars and controls' })).toHaveFocus();
        expect(screen.getByRole('textbox', { name: 'board state' })).toBe(position);
        expect(position).toHaveValue('e4 e5 Nf3');
        fireEvent.click(screen.getByRole('button', { name: 'Show player bars and controls' }));
        expect(screen.getByTestId('board-area')).toHaveAttribute('data-width', '300');
        expect(screen.getByTestId('player-header')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Hide player bars and controls' })).toHaveFocus();
        expect(screen.getByRole('button', { name: 'Show left panel' })).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Hide player bars and controls' }));
        unmount();
        render(board());
        expect(screen.getByRole('button', { name: 'Hide player bars and controls' })).toBeVisible();
    });

    it('restores the normal layout for a resized window without enabling absent headers', () => {
        render(board(true, true, true, false));
        fireEvent.click(screen.getByRole('button', { name: 'Hide player bars and controls' }));
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            width: 390,
        } as DOMRect);
        fireEvent(window, new Event('resize'));
        expect(screen.getByTestId('board-area')).toHaveAttribute('data-width', '348');
        fireEvent.click(screen.getByRole('button', { name: 'Show player bars and controls' }));
        expect(screen.getByTestId('board-area')).toHaveAttribute('data-width', '384');
        expect(screen.queryByTestId('player-header')).not.toBeInTheDocument();
        expect(screen.queryByTestId('player-footer')).not.toBeInTheDocument();
    });

    it('shows flip board button when controls are hidden', () => {
        render(board(true, true, true, false));
        fireEvent.click(screen.getByRole('button', { name: 'Hide player bars and controls' }));

        expect(screen.queryByTestId('player-header')).not.toBeInTheDocument();
        expect(screen.queryByTestId('player-footer')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'flip board' })).toBeVisible();
    });

    it('refits after an imperative panel reveal and panel resizing without losing drafts', () => {
        render(board());
        const draft = screen.getByRole('textbox', { name: 'left-draft' });
        fireEvent.change(draft, { target: { value: 'Keep my draft' } });
        const initialWidth = screen.getByTestId('board-area').dataset.width;
        fireEvent.click(screen.getByRole('button', { name: 'Hide left panel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hide player bars and controls' }));
        const hiddenWidth = Number(screen.getByTestId('board-area').dataset.width);
        fireEvent.click(screen.getByRole('button', { name: 'Reveal explorer' }));
        const revealedWidth = Number(screen.getByTestId('board-area').dataset.width);
        expect(revealedWidth).toBeLessThan(hiddenWidth);
        expect(draft).toBeVisible();
        expect(draft).toHaveValue('Keep my draft');
        fireEvent.click(screen.getByRole('button', { name: 'Resize left-' }));
        expect(Number(screen.getByTestId('board-area').dataset.width)).toBeGreaterThan(
            revealedWidth,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Show player bars and controls' }));
        expect(screen.getByTestId('board-area').dataset.width).toBe(initialWidth);
        expect(screen.getByRole('button', { name: 'Hide left panel' })).toBeVisible();
    });

    it('keeps restore controls available across window resizing', () => {
        render(board());
        fireEvent.click(screen.getByRole('button', { name: 'Hide right panel' }));
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            width: 390,
        } as DOMRect);
        fireEvent(window, new Event('resize'));
        expect(Number(screen.getByTestId('board-area').dataset.width)).toBe(384);
        expect(screen.getByRole('button', { name: 'Show right panel' })).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Show right panel' }));
        expect(screen.getAllByTestId('underboard-panel')[1]).toBeVisible();
    });

    it('does not offer hiding unless enabled', () => {
        render(board(false));
        expect(
            screen.queryByRole('button', { name: 'Hide player bars and controls' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Hide left panel' })).not.toBeInTheDocument();
    });

    it.each([
        [false, true],
        [true, false],
        [false, false],
    ])('omits toggles for missing panels (%s, %s)', (left, right) => {
        render(board(true, left, right));
        expect(Boolean(screen.queryByRole('button', { name: 'Hide left panel' }))).toBe(left);
        expect(Boolean(screen.queryByRole('button', { name: 'Hide right panel' }))).toBe(right);
    });
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        redrawAll.mockClear();
        Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({ width: 1200, height: 800, top: 0, left: 0, right: 1200, bottom: 800 }),
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: 900,
        });
    });

    it('keeps the dedicated PGN panel when rightTabs is omitted', () => {
        render(
            <div id='resize-container'>
                <ResizableContainer
                    underboardTabs={[DefaultUnderboardTab.Explorer]}
                    initialUnderboardTab={DefaultUnderboardTab.Explorer}
                    pgn='1. e4'
                    onInitialize={vi.fn()}
                />
            </div>,
        );

        expect(screen.getAllByTestId('underboard-panel')).toHaveLength(1);
        expect(screen.getByTestId('dedicated-pgn-panel')).toBeInTheDocument();
    });

    it('renders a right tab host when rightTabs is provided', () => {
        render(
            <div id='resize-container'>
                <ResizableContainer
                    underboardTabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                    initialUnderboardTab={DefaultUnderboardTab.Explorer}
                    rightTabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                    initialRightTab={DefaultUnderboardTab.PgnText}
                    sidePanelTabs={[DefaultUnderboardTab.Explorer, DefaultUnderboardTab.PgnText]}
                    tabStorageKeyPrefix='analysis'
                    pgn='1. e4'
                    onInitialize={vi.fn()}
                />
            </div>,
        );

        const panels = screen.getAllByTestId('underboard-panel');
        expect(panels).toHaveLength(2);
        expect(panels[0]).toHaveAttribute('data-initial-tab', 'explorer');
        expect(panels[0]).toHaveAttribute('data-storage-key', 'analysis.left.tab');
        expect(panels[0]).toHaveAttribute('data-explorer-storage-key', 'analysis.left.explorerTab');
        expect(panels[0]).toHaveAttribute('data-has-header', 'false');
        expect(panels[0]).toHaveAttribute('data-side-panel-tabs', '2');
        expect(panels[1]).toHaveAttribute('data-initial-tab', 'pgnText');
        expect(panels[1]).toHaveAttribute('data-storage-key', 'analysis.right.tab');
        expect(panels[1]).toHaveAttribute(
            'data-explorer-storage-key',
            'analysis.right.explorerTab',
        );
        expect(panels[1]).toHaveAttribute('data-button-test-id-prefix', 'right-');
        expect(panels[1]).toHaveAttribute('data-has-header', 'true');
        expect(panels[1]).toHaveAttribute('data-side-panel-tabs', '2');
        expect(screen.queryByTestId('dedicated-pgn-panel')).not.toBeInTheDocument();
    });
});
