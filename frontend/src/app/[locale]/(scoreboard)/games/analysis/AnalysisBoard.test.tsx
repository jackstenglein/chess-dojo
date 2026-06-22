import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnalysisBoard from './AnalysisBoard';

const { pgnBoardProps } = vi.hoisted(() => ({
    pgnBoardProps: [] as Record<string, unknown>[],
}));

vi.mock('@/auth/Auth', () => ({
    AuthStatus: {
        Authenticated: 'authenticated',
        Loading: 'loading',
    },
    useAuth: () => ({
        status: 'authenticated',
        user: {
            displayName: 'Dojo User',
            ratings: {},
        },
    }),
}));

vi.mock('@/board/pgn/PgnBoard', () => ({
    default: (props: Record<string, unknown>) => {
        pgnBoardProps.push(props);
        return <div data-testid='pgn-board' />;
    },
}));

vi.mock('@/components/games/edit/SaveGameDialog', () => ({
    default: () => <div data-testid='save-game-dialog' />,
    SaveGameDialogType: {
        Save: 'save',
    },
}));

vi.mock('@/components/games/view/GameMoveButtonExtras', () => ({
    GameMoveButtonExtras: () => <div data-testid='move-button-extras' />,
}));

vi.mock('@/games/view/PgnErrorBoundary', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useNextSearchParams', () => ({
    useNextSearchParams: () => ({
        searchParams: new URLSearchParams(),
    }),
}));

vi.mock('@/hooks/useSaveGame', () => ({
    default: () => ({
        stagedGame: null,
    }),
}));

vi.mock('@/hooks/useUnsavedGame', () => ({
    useUnsavedGame: () => ({
        showDialog: false,
        setShowDialog: vi.fn(),
        onSubmit: vi.fn(),
        request: { isLoading: () => false },
    }),
}));

vi.mock('@/loading/LoadingPage', () => ({
    default: () => <div data-testid='loading-page' />,
}));

vi.mock('next-navigation-guard', () => ({
    useNavigationGuard: () => ({
        active: false,
        accept: vi.fn(),
        reject: vi.fn(),
    }),
}));

describe('AnalysisBoard side tabs', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        localStorage.clear();
        pgnBoardProps.length = 0;
    });

    it('uses the familiar default side-panel layout', () => {
        renderWithIntl(<AnalysisBoard />);

        expect(pgnBoardProps[0]).toMatchObject({
            underboardTabs: [
                DefaultUnderboardTab.Tags,
                DefaultUnderboardTab.Editor,
                DefaultUnderboardTab.Explorer,
                DefaultUnderboardTab.Clocks,
                DefaultUnderboardTab.Share,
                DefaultUnderboardTab.Settings,
            ],
            rightTabs: [DefaultUnderboardTab.PgnText],
            initialUnderboardTab: DefaultUnderboardTab.Explorer,
            initialRightTab: DefaultUnderboardTab.PgnText,
            sidePanelTabs: [
                DefaultUnderboardTab.PgnText,
                DefaultUnderboardTab.Tags,
                DefaultUnderboardTab.Editor,
                DefaultUnderboardTab.Explorer,
                DefaultUnderboardTab.Clocks,
                DefaultUnderboardTab.Share,
                DefaultUnderboardTab.Settings,
            ],
            tabStorageKeyPrefix: 'analysis',
        });
    });

    it('uses stored side-panel tab placement', () => {
        localStorage.setItem(
            'analysisSidePanelTabs',
            JSON.stringify({
                [DefaultUnderboardTab.Explorer]: 'both',
                [DefaultUnderboardTab.Editor]: 'right',
            }),
        );

        renderWithIntl(<AnalysisBoard />);

        expect(pgnBoardProps[0]).toMatchObject({
            underboardTabs: [
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
});
