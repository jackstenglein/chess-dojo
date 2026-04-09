import { ChessContext } from '@/board/pgn/PgnBoard';
import { Chess, Move } from '@jackstenglein/chess';
import { secondsToClock } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterLuxon } from '@mui/x-date-pickers-pro/AdapterLuxon';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClockFieldFormat, ClockFieldFormatKey } from '../settings/EditorSettings';
import ClockTextField from './ClockTextField';

vi.mock('@/board/pgn/PgnBoard', async () => {
    const React = await import('react');
    const ChessContext = React.createContext({});
    return {
        ChessContext,
        BlockBoardKeyboardShortcuts: 'blockBoardKeyboardShortcuts',
        useChess: () => React.useContext(ChessContext),
    };
});

vi.mock('../settings/EditorSettings', () => ({
    ClockFieldFormatKey: 'clockFieldFormat',
    ClockFieldFormat: {
        SingleField: 'SINGLE_FIELD',
        ThreeField: 'THREE_FIELD',
        SingleFieldInTotalMinutes: 'SINGLE_FIELD_IN_TOTAL_MINUTES',
    },
}));

vi.mock('./ClockUsage', async () => {
    const { secondsToClock: toClock } =
        await import('@jackstenglein/chess-dojo-common/src/pgn/clock');
    return { formatTime: toClock };
});

const mockUseLocalStorage = vi.fn();

vi.mock('usehooks-ts', () => ({
    useLocalStorage: (key: string, initialValue: unknown) =>
        mockUseLocalStorage(key, initialValue) as [string, (value: string) => void],
}));

const theme = createTheme();

function TestProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterLuxon}>{children}</LocalizationProvider>
        </ThemeProvider>
    );
}

function makeMove(overrides: Partial<Move> = {}): Move {
    return {
        san: 'e4',
        ply: 1,
        commentDiag: {},
        ...overrides,
    } as Move;
}

function renderWithChess(ui: React.ReactElement, chess: Chess | undefined) {
    return render(
        <ChessContext.Provider value={{ chess }}>
            <TestProviders>{ui}</TestProviders>
        </ChessContext.Provider>,
    );
}

describe('ClockTextField', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders nothing when chess is undefined', () => {
        mockUseLocalStorage.mockImplementation((key) => {
            if (key === ClockFieldFormatKey) {
                return [ClockFieldFormat.ThreeField, vi.fn()];
            }
            return ['', vi.fn()];
        });
        const { container } = renderWithChess(<ClockTextField move={makeMove()} />, undefined);
        expect(container.firstChild).toBeNull();
    });

    it('three-field: shows hours, minutes, and seconds from the move clock', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.ThreeField, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '1:05:07' } });

        renderWithChess(<ClockTextField move={move} />, chess);

        expect(screen.getByTestId('clock-hours-field')).toHaveValue('1');
        expect(screen.getByTestId('clock-minutes-field')).toHaveValue('5');
        expect(screen.getByTestId('clock-seconds-field')).toHaveValue('7');
    });

    it('three-field: parses mm:ss clocks with zero hours', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.ThreeField, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '03:45' } });

        renderWithChess(<ClockTextField move={move} />, chess);

        expect(screen.getByTestId('clock-hours-field')).toHaveValue('0');
        expect(screen.getByTestId('clock-minutes-field')).toHaveValue('3');
        expect(screen.getByTestId('clock-seconds-field')).toHaveValue('45');
    });

    it('three-field: updates clock via setCommand when minutes change', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.ThreeField, vi.fn()]);
        const setCommand = vi.fn();
        const chess = { setCommand } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:01:00' } });

        renderWithChess(<ClockTextField move={move} />, chess);

        fireEvent.change(screen.getByTestId('clock-minutes-field'), { target: { value: '90' } });

        expect(setCommand).toHaveBeenCalledWith('clk', secondsToClock(90 * 60), move);
    });

    it('three-field: shows error helper when seconds exceed maxSeconds', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.ThreeField, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:10:00' } });

        renderWithChess(<ClockTextField move={move} maxSeconds={300} />, chess);

        expect(
            screen.getByText('Gained more time than possible according to time control'),
        ).toBeInTheDocument();
    });

    it('three-field: ArrowRight moves focus from hours to minutes', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.ThreeField, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        renderWithChess(<ClockTextField move={makeMove()} />, chess);

        const hours = screen.getByTestId('clock-hours-field');
        const minutes = screen.getByTestId('clock-minutes-field');

        hours.focus();
        fireEvent.keyDown(hours, { key: 'ArrowRight' });

        expect(minutes).toHaveFocus();
    });

    it('three-field: focusing hours redirects to minutes when maxSeconds < 3600', async () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.ThreeField, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        renderWithChess(<ClockTextField move={makeMove()} maxSeconds={120} />, chess);

        const hours = screen.getByTestId('clock-hours-field');
        const minutes = screen.getByTestId('clock-minutes-field');

        fireEvent.focus(hours);

        await waitFor(() => {
            expect(minutes).toHaveFocus();
        });
    });

    it('total minutes: displays floored minutes and writes clock on change', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleFieldInTotalMinutes, vi.fn()]);
        const setCommand = vi.fn();
        const chess = { setCommand } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:05:30' } });

        renderWithChess(<ClockTextField move={move} />, chess);

        expect(screen.getByPlaceholderText('Total minutes')).toHaveValue('5');

        fireEvent.change(screen.getByPlaceholderText('Total minutes'), { target: { value: '12' } });

        expect(setCommand).toHaveBeenCalledWith('clk', secondsToClock(12 * 60), move);
    });

    it('total minutes: empty input resets clock to zero', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleFieldInTotalMinutes, vi.fn()]);
        const setCommand = vi.fn();
        const chess = { setCommand } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:01:00' } });

        renderWithChess(<ClockTextField move={move} />, chess);

        fireEvent.change(screen.getByPlaceholderText('Total minutes'), { target: { value: '' } });

        expect(setCommand).toHaveBeenCalledWith('clk', secondsToClock(0), move);
    });

    it('total minutes: ignores non-numeric input', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleFieldInTotalMinutes, vi.fn()]);
        const setCommand = vi.fn();
        const chess = { setCommand } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:01:00' } });

        renderWithChess(<ClockTextField move={move} />, chess);
        setCommand.mockClear();

        fireEvent.change(screen.getByPlaceholderText('Total minutes'), {
            target: { value: 'abc' },
        });

        expect(setCommand).not.toHaveBeenCalled();
    });

    it('total minutes: clamps minutes above 999', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleFieldInTotalMinutes, vi.fn()]);
        const setCommand = vi.fn();
        const chess = { setCommand } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:00:00' } });

        renderWithChess(<ClockTextField move={move} />, chess);

        fireEvent.change(screen.getByPlaceholderText('Total minutes'), {
            target: { value: '2000' },
        });

        expect(setCommand).toHaveBeenCalledWith('clk', secondsToClock(999 * 60), move);
    });

    it('total minutes: shows error when clock exceeds maxSeconds', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleFieldInTotalMinutes, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:10:00' } });

        renderWithChess(<ClockTextField move={move} maxSeconds={300} />, chess);

        expect(
            screen.getByText('Gained more time than possible according to time control'),
        ).toBeInTheDocument();
    });

    it('single time field: renders and updates clock on change', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleField, vi.fn()]);
        const setCommand = vi.fn();
        const chess = { setCommand } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:00:45' } });

        renderWithChess(<ClockTextField move={move} label='Clock' />, chess);

        const input = screen.getByDisplayValue('00:00:45');
        expect(input).toHaveAttribute('id', 'blockBoardKeyboardShortcuts');

        fireEvent.change(input, { target: { value: '00:01:30' } });

        expect(setCommand).toHaveBeenCalledWith('clk', secondsToClock(90), move);
    });

    it('single time field: shows error when clock exceeds maxSeconds', () => {
        mockUseLocalStorage.mockReturnValue([ClockFieldFormat.SingleField, vi.fn()]);
        const chess = { setCommand: vi.fn() } as unknown as Chess;
        const move = makeMove({ commentDiag: { clk: '0:10:00' } });

        renderWithChess(<ClockTextField move={move} maxSeconds={300} />, chess);

        expect(
            screen.getByText('Gained more time than possible according to time control'),
        ).toBeInTheDocument();
    });
});
