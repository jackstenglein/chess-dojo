import { ChessContext } from '@/board/pgn/PgnBoard';
import { EngineControl, EngineControlContext } from '@/board/pgn/pgnText/engine/EngineControl';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyBoardActions } from './StudyBoardActions';

// The test reads the viewer setting from a mock, so it writes nothing to storage that another
// test file running at the same time could read.
const settings = vi.hoisted(() => ({ hideEngine: false }));
vi.mock('usehooks-ts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('usehooks-ts')>()),
    useLocalStorage: () => [settings.hideEngine, vi.fn(), vi.fn()],
}));

const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const ENCODED = 'rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR+b+KQkq+-+0+1';

function renderActions(control?: EngineControl) {
    const chess = new Chess({ fen: BLACK_TO_MOVE });
    renderWithIntl(
        <ChessContext.Provider value={{ chess }}>
            <EngineControlContext.Provider value={control}>
                <StudyBoardActions />
            </EngineControlContext.Provider>
        </ChessContext.Provider>,
    );
    return chess;
}

const query = (element: HTMLElement) =>
    new URL(element.getAttribute('href') ?? '', 'http://localhost').searchParams;

describe('StudyBoardActions', () => {
    afterEach(() => {
        cleanup();
        settings.hideEngine = false;
    });

    it('leaves the engine button out when the viewer setting hides the engine', () => {
        settings.hideEngine = true;
        renderActions({ enabled: false, setEnabled: vi.fn() });
        expect(screen.queryByTestId('study-engine-toggle')).toBeNull();
        expect(screen.getByTestId('study-play-bot')).toBeInTheDocument();
    });

    it('leaves the engine button out when no page owns the engine, and keeps the links', () => {
        renderActions();
        expect(screen.queryByTestId('study-engine-toggle')).toBeNull();
        expect(screen.getByTestId('study-play-bot')).toBeInTheDocument();
        expect(screen.getByTestId('study-analyze')).toBeInTheDocument();
    });

    it.each([
        [false, true],
        [true, false],
    ])('shows the engine as enabled=%s and asks the page for %s', (enabled, next) => {
        const setEnabled = vi.fn();
        renderActions({ enabled, setEnabled });
        const toggle = screen.getByTestId('study-engine-toggle');
        expect(toggle).toHaveAttribute('aria-pressed', String(enabled));

        fireEvent.click(toggle);
        expect(setEnabled).toHaveBeenCalledTimes(1);
        expect(setEnabled).toHaveBeenCalledWith(next);
    });

    it('opens the position and the side to move in a new tab, and follows the board', () => {
        const chess = renderActions({ enabled: false, setEnabled: vi.fn() });
        const play = screen.getByTestId('study-play-bot');
        const analyze = screen.getByTestId('study-analyze');
        expect(play).toHaveAttribute('href', `/play-bot?fen=${ENCODED}&color=black`);
        expect(play).toHaveAttribute('target', '_blank');
        expect(analyze).toHaveAttribute('href', `/games/analysis?fen=${ENCODED}`);
        expect(analyze).toHaveAttribute('target', '_blank');

        act(() => {
            chess.move('e5');
        });
        expect(chess.fen()).toMatch(/ w KQkq /);
        expect(query(play).get('fen')).toBe(chess.fen());
        expect(query(play).get('color')).toBe('white');
        expect(query(analyze).get('fen')).toBe(chess.fen());
    });
});
