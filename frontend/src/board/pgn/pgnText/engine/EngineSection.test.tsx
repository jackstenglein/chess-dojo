import { ChessContext } from '@/board/pgn/PgnBoard';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EngineControl, EngineControlContext } from './EngineControl';
import EngineSection from './EngineSection';

const mocks = vi.hoisted(() => ({ useEval: vi.fn() }));

vi.mock('@/stockfish/hooks/useEval', () => ({ useEval: mocks.useEval }));
vi.mock('@/stockfish/hooks/useChessDb', () => ({
    useChessDB: () => ({ pv: undefined, pvLoading: false }),
}));
vi.mock('./EvaluationSection', () => ({ EvaluationSection: () => null }));
vi.mock('./Settings', () => ({ default: () => null }));

function renderSection(control?: EngineControl) {
    return renderWithIntl(
        <ChessContext.Provider value={{ chess: new Chess() }}>
            <EngineControlContext.Provider value={control}>
                <EngineSection />
            </EngineControlContext.Provider>
        </ChessContext.Provider>,
    );
}

/** The `enabled` values the section asked the engine hook for. */
const askedFor = () => new Set(mocks.useEval.mock.calls.map(([enabled]) => enabled as boolean));

describe('EngineSection', () => {
    afterEach(() => {
        cleanup();
        mocks.useEval.mockReset();
    });

    it('renders nothing and starts no engine while the page has the engine off', () => {
        const { container } = renderSection({ enabled: false, setEnabled: vi.fn() });
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('switch')).toBeNull();
        expect(askedFor()).toEqual(new Set([false]));
    });

    it('shows the switch on while the page has the engine on and hands the change to the page', () => {
        const setEnabled = vi.fn();
        renderSection({ enabled: true, setEnabled });
        const toggle = screen.getByRole('switch');
        expect(toggle).toBeChecked();
        expect(askedFor()).toEqual(new Set([true]));

        fireEvent.click(toggle);
        expect(setEnabled).toHaveBeenCalledTimes(1);
        expect(setEnabled).toHaveBeenCalledWith(false);
        expect(toggle).toBeChecked();
    });

    it('keeps its own switch when no page owns it', () => {
        renderSection();
        const toggle = screen.getByRole('switch');
        expect(toggle).not.toBeChecked();
        expect(askedFor()).toEqual(new Set([false]));

        fireEvent.click(toggle);
        expect(toggle).toBeChecked();
        expect(mocks.useEval).toHaveBeenLastCalledWith(true, expect.any(String));
    });
});
