import { Timer, TimerContext } from '@/components/timer/TimerContext';
import { Requirement } from '@/database/requirement';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyBook, StudyItem } from './book';
import { StudyPanel, StudyPanelProps } from './StudyPanel';
import { StudySessionState } from './useStudy';

vi.mock('@/board/pgn/pgnText/PgnText', () => ({
    UnderboardPgnText: () => <div data-testid='pgn-text' />,
}));

const item = (key: string, name: string): StudyItem => ({
    kind: 'canonical',
    key,
    name,
    pgn: '',
    orientation: 'white',
    allowExport: false,
});
const first = item('k1', 'Problem 7');
const second = item('k2', 'Problem 8');
const book: StudyBook = {
    title: 'Polgar',
    chapters: [{ name: 'Problems', items: [first, second] }],
    skipped: 0,
};

const timer = {
    isRunning: false,
    isPaused: false,
    timerSeconds: 0,
    onStart: vi.fn(),
    onPause: vi.fn(),
} as unknown as Timer;

const session = { task: { id: 'polgar' } } as StudySessionState;

function renderPanel(overrides: Partial<StudyPanelProps> = {}, timerValue = timer) {
    const props: StudyPanelProps = {
        book,
        current: first,
        session,
        hasCopy: false,
        isDone: false,
        solveStatus: { kind: 'prompt', toMove: 'white' },
        mark: { canUndo: false, saving: false, onUndo: vi.fn() },
        onMarkDone: vi.fn(),
        onSelect: vi.fn(),
        onSetMode: vi.fn(),
        ...overrides,
    };
    const tree = (p: StudyPanelProps) => (
        <TimerContext.Provider value={timerValue}>
            <StudyPanel {...p} />
        </TimerContext.Provider>
    );
    const view = renderWithIntl(tree(props));
    return {
        props,
        rerender: (more: Partial<StudyPanelProps>) => view.rerender(tree({ ...props, ...more })),
    };
}

afterEach(cleanup);

describe('StudyPanel in solve mode', () => {
    it('shows the side to move and Show solution instead of the move list, with Done off', () => {
        const { props } = renderPanel();
        expect(screen.getByText('White to move')).toBeVisible();
        expect(screen.queryByTestId('pgn-text')).toBeNull();
        expect(screen.getByTestId('study-mark-done')).toBeDisabled();
        expect(screen.getByTestId('study-next')).toBeEnabled();
        fireEvent.click(screen.getByTestId('study-show-solution'));
        expect(props.onSetMode).toHaveBeenCalledWith('read');
    });

    it("shows the author's feedback after a wrong move", () => {
        renderPanel({
            solveStatus: { kind: 'wrong', toMove: 'black', feedback: 'The king slips away.' },
        });
        expect(screen.getByText('Black to move')).toBeVisible();
        expect(screen.getByText('The king slips away.')).toBeVisible();
        expect(screen.getByTestId('study-mark-done')).toBeDisabled();
    });

    it('keeps Done off while the solve is posting and offers it once the post failed', () => {
        renderPanel({
            solveStatus: { kind: 'complete' },
            mark: { canUndo: false, saving: true, onUndo: vi.fn() },
        });
        expect(screen.getByTestId('study-mark-done')).toBeDisabled();
        cleanup();

        const { props } = renderPanel({ solveStatus: { kind: 'complete' } });
        expect(screen.getByTestId('study-solve-card')).toHaveTextContent(/^Solved\.$/);
        expect(screen.getByTestId('study-mark-done')).toBeEnabled();
        expect(screen.queryByTestId('study-mark-next')).toBeNull();
        fireEvent.click(screen.getByTestId('study-mark-done'));
        expect(props.onMarkDone).toHaveBeenCalledTimes(1);
    });

    it('swaps Done for Undo and makes Next primary once solved and marked, with only the status on the card', () => {
        const onUndo = vi.fn();
        const { props } = renderPanel({
            isDone: true,
            solveStatus: { kind: 'complete' },
            mark: { canUndo: true, saving: false, onUndo },
        });
        expect(screen.getByTestId('study-solve-card')).toHaveTextContent(/^Solved\.$/);
        expect(screen.queryByTestId('study-mark-done')).toBeNull();
        fireEvent.click(screen.getByTestId('study-undo-mark'));
        expect(onUndo).toHaveBeenCalledTimes(1);
        const next = screen.getByTestId('study-mark-next');
        expect(next).toHaveClass('MuiButton-contained');
        fireEvent.click(next);
        expect(props.onSelect).toHaveBeenCalledWith(second);
    });

    it('keeps Undo in the footer when the member comes back to an item they solved', () => {
        const onUndo = vi.fn();
        renderPanel({ isDone: true, mark: { canUndo: true, saving: false, onUndo } });
        expect(screen.getByText('White to move')).toBeVisible();
        expect(screen.queryByTestId('study-mark-done')).toBeNull();
        expect(screen.getByTestId('study-mark-next')).toHaveClass('MuiButton-contained');
        fireEvent.click(screen.getByTestId('study-undo-mark'));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('flips the mode from the footer switch', () => {
        const { props } = renderPanel();
        fireEvent.click(screen.getByTestId('study-mode-read'));
        expect(props.onSetMode).toHaveBeenCalledWith('read');
    });
});

describe('StudyPanel in read mode', () => {
    it('keeps the move list and Prev, Done, Next before a mark', () => {
        const { props } = renderPanel({ solveStatus: undefined });
        expect(screen.getByTestId('pgn-text')).toBeInTheDocument();
        expect(screen.queryByTestId('study-solve-card')).toBeNull();
        expect(screen.getByTestId('study-prev')).toBeDisabled();
        expect(screen.getByTestId('study-mark-done')).toBeEnabled();
        expect(screen.getByTestId('study-next')).toBeEnabled();
        expect(screen.queryByTestId('study-undo-mark')).toBeNull();
        expect(screen.queryByTestId('study-mark-next')).toBeNull();
        fireEvent.click(screen.getByTestId('study-mode-solve'));
        expect(props.onSetMode).toHaveBeenCalledWith('solve');
    });

    it('keeps Done off while the mark posts', () => {
        renderPanel({
            solveStatus: undefined,
            mark: { canUndo: false, saving: true, onUndo: vi.fn() },
        });
        expect(screen.getByTestId('study-mark-done')).toBeDisabled();
        expect(screen.queryByTestId('study-undo-mark')).toBeNull();
    });

    it('swaps Done for Undo and makes Next the primary action once marked', () => {
        const onUndo = vi.fn();
        const { props } = renderPanel({
            solveStatus: undefined,
            isDone: true,
            mark: { canUndo: true, saving: false, onUndo },
        });
        expect(screen.getByTestId('pgn-text')).toBeInTheDocument();
        expect(screen.queryByTestId('study-mark-done')).toBeNull();
        expect(screen.queryByTestId('study-next')).toBeNull();
        fireEvent.click(screen.getByTestId('study-undo-mark'));
        expect(onUndo).toHaveBeenCalledTimes(1);
        const next = screen.getByTestId('study-mark-next');
        expect(next).toHaveClass('MuiButton-contained');
        expect(next).toHaveTextContent('Next');
        fireEvent.click(next);
        expect(props.onSelect).toHaveBeenCalledWith(second);
    });

    it('keeps Undo off while the undo posts', () => {
        renderPanel({
            solveStatus: undefined,
            isDone: true,
            mark: { canUndo: true, saving: true, onUndo: vi.fn() },
        });
        expect(screen.getByTestId('study-undo-mark')).toBeDisabled();
        expect(screen.getByTestId('study-mark-next')).toBeEnabled();
    });

    it('offers Undo with the chevron still off on the last item', () => {
        renderPanel({
            current: second,
            solveStatus: undefined,
            isDone: true,
            mark: { canUndo: true, saving: false, onUndo: vi.fn() },
        });
        expect(screen.getByTestId('study-undo-mark')).toBeEnabled();
        expect(screen.queryByTestId('study-mark-next')).toBeNull();
        expect(screen.getByTestId('study-next')).toBeDisabled();
    });

    it('brings Done and the chevron back once the mark is undone', () => {
        const { rerender } = renderPanel({
            solveStatus: undefined,
            isDone: true,
            mark: { canUndo: true, saving: false, onUndo: vi.fn() },
        });
        expect(screen.getByTestId('study-undo-mark')).toBeVisible();
        rerender({ isDone: false, mark: { canUndo: false, saving: false, onUndo: vi.fn() } });
        expect(screen.queryByTestId('study-undo-mark')).toBeNull();
        expect(screen.queryByTestId('study-mark-next')).toBeNull();
        expect(screen.getByTestId('study-mark-done')).toBeEnabled();
        expect(screen.getByTestId('study-next')).toBeEnabled();
    });
});

describe('StudyPanel timer', () => {
    it('names the task the timer is running on as the navbar timer does', () => {
        const polgarM3 = {
            id: 'polgar-m3',
            name: 'Solve Polgar M3s through Problem {{count}}',
            shortName: 'Polgar M3s',
            sortPriority: '0',
        } as Requirement;
        renderPanel({}, { ...timer, isRunning: true, task: polgarM3 });
        expect(screen.getByText('The timer is running on Polgar M3s.')).toBeVisible();
        expect(screen.queryByTestId('study-pause-timer')).toBeNull();
    });
});
