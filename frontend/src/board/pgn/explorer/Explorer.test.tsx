import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Explorer, { ExplorerDatabaseType } from './Explorer';

const { useLocalStorageMock } = vi.hoisted(() => ({
    useLocalStorageMock: vi.fn((_key: string, _initialValue: unknown) => ['dojo', vi.fn()]),
}));

vi.mock('usehooks-ts', async () => {
    const actual = await vi.importActual<typeof import('usehooks-ts')>('usehooks-ts');
    return {
        ...actual,
        useLocalStorage: (key: string, initialValue: unknown) =>
            useLocalStorageMock(key, initialValue),
    };
});

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@mui/icons-material', () => ({
    PersonSearch: () => <span data-testid='person-search-icon' />,
}));

vi.mock('@mui/icons-material/Cloud', () => ({
    default: () => <span data-testid='cloud-icon' />,
}));

vi.mock('react-icons/si', () => ({
    SiLichess: () => <span data-testid='lichess-icon' />,
}));

vi.mock('@/stockfish/hooks/useChessDb', () => ({
    useChessDB: () => ({
        data: [],
        loading: false,
        error: null,
        queueAnalysis: vi.fn(),
    }),
}));

vi.mock('../../../api/cache/positions', () => ({
    usePosition: () => ({
        position: undefined,
        request: {
            isLoading: () => false,
            isSent: () => true,
        },
        putPosition: vi.fn(),
    }),
}));

vi.mock('../../../style/ChessDojoIcon', () => ({
    ChessDojoIcon: () => <span data-testid='dojo-icon' />,
}));

vi.mock('../../../style/ChessIcons', () => ({
    KingIcon: () => <span data-testid='king-icon' />,
    RookIcon: () => <span data-testid='rook-icon' />,
}));

vi.mock('./usePositionGames', () => ({
    usePositionGames: () => ({
        page: 0,
        setPage: vi.fn(),
        pageSize: 10,
        setPageSize: vi.fn(),
        data: [],
        request: { isLoading: () => false },
        hasMore: false,
        rowCount: 0,
        setGames: vi.fn(),
        onSearch: vi.fn(),
        onDelete: vi.fn(),
    }),
}));

vi.mock('../PgnBoard', () => ({
    useChess: () => ({ chess: undefined }),
}));

vi.mock('./Header', () => ({
    default: () => <div data-testid='explorer-header' />,
}));

vi.mock('./Database', () => ({
    default: () => <div data-testid='explorer-database' />,
}));

vi.mock('./ChessDb', () => ({
    ChessDBTab: () => <div data-testid='chessdb-tab' />,
}));

vi.mock('./player/PlayerTab', () => ({
    PlayerTab: () => <div data-testid='player-tab' />,
}));

vi.mock('./Tablebase', () => ({
    Tablebase: () => <div data-testid='tablebase-tab' />,
}));

describe('Explorer storage', () => {
    afterEach(() => {
        cleanup();
        useLocalStorageMock.mockClear();
    });

    it('uses the provided storage key for its internal database tab', () => {
        renderWithIntl(<Explorer storageKey='analysis.right.explorerTab' />);

        expect(useLocalStorageMock).toHaveBeenCalledWith(
            'analysis.right.explorerTab',
            ExplorerDatabaseType.Dojo,
        );
    });
});
