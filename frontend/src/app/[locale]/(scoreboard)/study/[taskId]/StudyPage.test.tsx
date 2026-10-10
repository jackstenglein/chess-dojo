import { Request, RequestStatus } from '@/api/Request';
import { CanonicalItem, StudyItem } from '@/components/profile/trainingPlan/study/book';
import { BookMapping } from '@/components/profile/trainingPlan/study/selectors';
import { StudyMode, StudySessionState } from '@/components/profile/trainingPlan/study/useStudy';
import { Timer, TimerContext } from '@/components/timer/TimerContext';
import { renderWithIntl } from '@/i18n/intl.test';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudyPage } from './StudyPage';

const mocks = vi.hoisted(() => ({
    searchParams: new URLSearchParams(),
    useStudy: vi.fn(),
    board: vi.fn(),
    boardPgn: vi.fn(),
    solvePgn: vi.fn(),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { username: 'student', dojoCohort: '1500-1600' } }),
    useFreeTier: () => false,
}));
vi.mock('@/hooks/useNextSearchParams', () => ({
    useNextSearchParams: () => ({ searchParams: mocks.searchParams, setSearchParams: vi.fn() }),
}));
vi.mock('@/components/profile/trainingPlan/study/useStudy', () => ({
    useStudy: mocks.useStudy,
}));
vi.mock('@/loading/LoadingPage', () => ({ default: () => <div data-testid='loading' /> }));
// The panel is the board's only right tab and the actions are its slot. Render both so the
// test can press Done and the engine toggle. The board records the engine control it is given,
// whether the page also passed disableEngine, and the PGN it loads. The PGN parses first, so a
// malformed PGN throws here as it does from the board.
vi.mock('@/board/pgn/PgnBoard', async () => {
    const { Chess } = await import('@jackstenglein/chess');
    const { useContext } = await import('react');
    const { EngineControlContext } = await import('@/board/pgn/pgnText/engine/EngineControl');
    const chess = new Chess();
    function PgnBoardMock({
        pgn,
        rightTabs,
        slots,
        disableEngine,
    }: {
        pgn: string;
        rightTabs: { element: ReactNode }[];
        slots?: { boardButtons?: ReactNode };
        disableEngine?: boolean;
    }) {
        mocks.board({ enabled: useContext(EngineControlContext)?.enabled, disableEngine });
        mocks.boardPgn(pgn);
        new Chess().loadPgn(pgn);
        return (
            <>
                {slots?.boardButtons}
                {rightTabs[0].element}
            </>
        );
    }
    return { useChess: () => ({ chess }), default: PgnBoardMock };
});
vi.mock('@/components/profile/trainingPlan/study/SolveBoard', () => ({
    SolveBoard: ({ pgn }: { pgn: string }) => {
        mocks.solvePgn(pgn);
        return null;
    },
}));
vi.mock('@/board/pgn/pgnText/PgnText', () => ({
    UnderboardPgnText: () => <div data-testid='pgn-text' />,
}));
vi.mock(
    '@/app/[locale]/(scoreboard)/courses/[type]/[id]/[chapter]/[module]/PurchaseCoursePage',
    () => ({ default: () => null }),
);
vi.mock('next-navigation-guard', () => ({
    useNavigationGuard: () => ({ active: false, accept: vi.fn(), reject: vi.fn() }),
}));

const TASK = { kind: 'task', taskId: 'task-1' } as const;

describe('StudyPage: the cohort param', () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        mocks.useStudy.mockReset().mockReturnValue({ status: 'loading' });
    });

    afterEach(() => {
        cleanup();
    });

    it("keeps the session when the cohort param is the member's own", async () => {
        mocks.searchParams = new URLSearchParams({ cohort: '1500-1600', item: 'k1' });
        renderWithIntl(<StudyPage source={TASK} />);
        await screen.findByTestId('loading');
        expect(mocks.useStudy).toHaveBeenCalledWith(TASK, 'k1');
    });

    it("browses another cohort's share when the cohort param differs", async () => {
        mocks.searchParams = new URLSearchParams({ cohort: '1000-1100' });
        renderWithIntl(<StudyPage source={TASK} />);
        await screen.findByTestId('loading');
        expect(mocks.useStudy).toHaveBeenCalledWith({ ...TASK, cohort: '1000-1100' }, null);
    });
});

const item = (key: string, name: string): CanonicalItem => ({
    kind: 'canonical',
    key,
    name,
    pgn: '',
    orientation: 'white',
    allowExport: false,
});
const first = item('k1', 'Problem 307');
const second = item('k2', 'Problem 308');
const idle: Request = {
    status: RequestStatus.NotSent,
    onStart: vi.fn(),
    onSuccess: vi.fn(),
    onFailure: vi.fn(),
    reset: vi.fn(),
    isLoading: () => false,
    isSent: () => false,
    isFailure: () => false,
};
const timer = {
    isRunning: false,
    isPaused: false,
    timerSeconds: 0,
    onStart: vi.fn(),
    onPause: vi.fn(),
} as unknown as Timer;
// The layout reads breakpoints and the colour scheme from the theme.
const theme = createTheme({ cssVariables: true, colorSchemes: { light: true, dark: true } });

/** A ready study on the first of two items in read mode, with a session mapped as given. */
function readyOn(mapping: BookMapping) {
    const session = {
        task: { id: 'task-1', name: 'Polgar', counts: { '1500-1600': 10 }, startCount: 0 },
        cohort: '1500-1600',
        currentCount: 0,
        totalCount: 10,
        mapping,
        done: new Set<string>(),
        historyComplete: true,
        markItemDone: vi.fn().mockResolvedValue(undefined),
        undoMark: vi.fn().mockResolvedValue(undefined),
        canUndo: false,
    } as unknown as StudySessionState;
    mocks.useStudy.mockReturnValue({
        status: 'ready',
        session,
        book: { title: 'Polgar', chapters: [{ name: 'Problems', items: [first, second] }] },
        current: first,
        select: vi.fn(() => true),
        setMode: vi.fn(() => true),
        workedOn: new Set(),
        pendingEdits: false,
        onBoardUnsaved: vi.fn(),
        copyRequest: idle,
        board: {
            key: 'k1:read',
            pgn: '',
            latestPgn: () => '',
            mode: { kind: 'read' },
            orientation: 'white',
            context: {},
            disableExport: true,
        },
        onBoardInitialize: vi.fn(),
    });
    renderWithIntl(
        <ThemeProvider theme={theme}>
            <TimerContext.Provider value={timer}>
                <StudyPage source={TASK} />
            </TimerContext.Provider>
        </ThemeProvider>,
    );
    return session;
}

describe('StudyPage: a malformed PGN', () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        mocks.useStudy.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it("shows the error in the board's place and lets the member open another item", async () => {
        const bad = { ...first, pgn: '[Event "A"]\n\n1. e4 (1. d4 e5 *' };
        const session = {
            task: { id: 'task-1', name: 'Games', counts: { '1500-1600': 10 }, startCount: 0 },
            cohort: '1500-1600',
            currentCount: 0,
            totalCount: 10,
            mapping: { mapped: false, startCount: 0, unit: '' },
            done: new Set<string>(),
            historyComplete: true,
            markItemDone: vi.fn().mockResolvedValue(undefined),
            undoMark: vi.fn().mockResolvedValue(undefined),
            canUndo: false,
        } as unknown as StudySessionState;
        // A hook whose select works, so the page opens the item the member picks.
        mocks.useStudy.mockImplementation(() => {
            const [current, setCurrent] = useState<CanonicalItem>(bad);
            return {
                status: 'ready',
                session,
                book: { title: 'Games', chapters: [{ name: 'Games', items: [bad, second] }] },
                current,
                select: (item: CanonicalItem) => {
                    setCurrent(item);
                    return true;
                },
                setMode: () => true,
                workedOn: new Set(),
                pendingEdits: false,
                onBoardUnsaved: vi.fn(),
                copyRequest: idle,
                board: {
                    key: `${current.key}:read`,
                    pgn: current.pgn,
                    latestPgn: () => current.pgn,
                    mode: { kind: 'read' },
                    orientation: 'white',
                    context: {},
                    disableExport: true,
                },
                onBoardInitialize: vi.fn(),
            };
        });
        renderWithIntl(
            <ThemeProvider theme={theme}>
                <TimerContext.Provider value={timer}>
                    <StudyPage source={TASK} />
                </TimerContext.Provider>
            </ThemeProvider>,
        );
        await screen.findByText('Invalid PGN');
        expect(screen.queryByTestId('study-panel')).toBeNull();
        const rows = screen.getAllByTestId('study-item');
        expect(rows).toHaveLength(2);

        fireEvent.click(rows[1]);
        const panel = await screen.findByTestId('study-panel');
        expect(within(panel).getByText('Problem 308')).toBeVisible();
        expect(screen.queryByText('Invalid PGN')).toBeNull();
    });
});

describe('StudyPage: the catalog header', () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        mocks.useStudy.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('counts in the unit only for a workbook whose book maps onto its count', async () => {
        readyOn({ mapped: true, startCount: 0, unit: 'problems' });
        const mapped = await screen.findByTestId('study-catalog-progress');
        expect(mapped.textContent).toBe('0 of 2 problems');
        cleanup();

        readyOn({ mapped: false, startCount: 30, unit: 'pages' });
        const unmapped = await screen.findByTestId('study-catalog-progress');
        expect(unmapped.textContent).toBe('0 of 2 studied');
    });
});

describe('StudyPage: Done in read mode', () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        mocks.useStudy.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('posts the mark with no dialog, even for a book counted in pages, once for two quick presses', async () => {
        const session = readyOn({ mapped: false, startCount: 30, unit: 'pages' });
        const done = await screen.findByTestId('study-mark-done');
        fireEvent.click(done);
        fireEvent.click(done);
        await waitFor(() => expect(session.markItemDone).toHaveBeenCalledWith(first));
        expect(session.markItemDone).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('StudyPage: the engine in read mode', () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        mocks.useStudy.mockReset();
        mocks.board.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('is off until the row under the board turns it on, through the context alone', async () => {
        readyOn({ mapped: true, startCount: 0, unit: 'problems' });
        const toggle = await screen.findByTestId('study-engine-toggle');
        expect(mocks.board).toHaveBeenLastCalledWith({ enabled: false, disableEngine: undefined });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(toggle);
        await waitFor(() =>
            expect(mocks.board).toHaveBeenLastCalledWith({
                enabled: true,
                disableEngine: undefined,
            }),
        );
        expect(screen.getByTestId('study-engine-toggle')).toHaveAttribute('aria-pressed', 'true');
    });
});

describe('StudyPage: the PGN a board loads', () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        mocks.useStudy.mockReset();
        mocks.boardPgn.mockReset();
        mocks.solvePgn.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it("takes the hook's latest PGN at each mount and keeps it while the board lives", async () => {
        const latestPgn = vi.fn(() => '[Event "A"]\n\n1. e4 *');
        const session = {
            task: { id: 'task-1', name: 'Games', counts: { '1500-1600': 10 }, startCount: 0 },
            cohort: '1500-1600',
            currentCount: 0,
            totalCount: 10,
            mapping: { mapped: false, startCount: 0, unit: '' },
            done: new Set<string>(),
            historyComplete: true,
            markItemDone: vi.fn().mockResolvedValue(undefined),
            undoMark: vi.fn().mockResolvedValue(undefined),
            canUndo: false,
        } as unknown as StudySessionState;
        // A hook whose mode switch works, so the page remounts the board the way it does live.
        mocks.useStudy.mockImplementation(() => {
            const [kind, setKind] = useState<StudyMode['kind']>('read');
            return {
                status: 'ready',
                session,
                book: { title: 'Games', chapters: [{ name: 'Games', items: [first, second] }] },
                current: first,
                select: () => true,
                setMode: (_item: StudyItem, next: StudyMode['kind']) => {
                    setKind(next);
                    return true;
                },
                workedOn: new Set(),
                pendingEdits: false,
                onBoardUnsaved: vi.fn(),
                copyRequest: idle,
                board: {
                    key: `k1:${kind}`,
                    pgn: '[Event "A"]\n\n*',
                    latestPgn,
                    mode: kind === 'read' ? { kind } : { kind, playBothSides: false },
                    orientation: 'white',
                    context: {},
                    disableExport: true,
                },
                onBoardInitialize: vi.fn(),
            };
        });
        renderWithIntl(
            <ThemeProvider theme={theme}>
                <TimerContext.Provider value={timer}>
                    <StudyPage source={TASK} />
                </TimerContext.Provider>
            </ThemeProvider>,
        );
        await screen.findByTestId('study-engine-toggle');
        expect(mocks.boardPgn).toHaveBeenLastCalledWith('[Event "A"]\n\n1. e4 *');

        latestPgn.mockReturnValue('[Event "A"]\n\n1. e4 e5 *');
        fireEvent.click(screen.getByTestId('study-engine-toggle'));
        await waitFor(() => expect(mocks.boardPgn).toHaveBeenCalledTimes(2));
        expect(mocks.boardPgn).toHaveBeenLastCalledWith('[Event "A"]\n\n1. e4 *');

        fireEvent.click(screen.getByTestId('study-mode-solve'));
        await waitFor(() =>
            expect(mocks.solvePgn).toHaveBeenLastCalledWith('[Event "A"]\n\n1. e4 e5 *'),
        );

        latestPgn.mockReturnValue('[Event "A"]\n\n1. e4 e5 2. Nf3 *');
        fireEvent.click(screen.getByTestId('study-mode-read'));
        await waitFor(() =>
            expect(mocks.boardPgn).toHaveBeenLastCalledWith('[Event "A"]\n\n1. e4 e5 2. Nf3 *'),
        );
    });
});
