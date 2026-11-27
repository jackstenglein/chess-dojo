import { Chess } from '@jackstenglein/chess';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChessContext } from '../PgnBoard';
import { UnderboardPgnText } from './PgnText';

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: undefined }),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({}),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/board/sounds/useBoardSound', () => ({
    useBoardSound: () => ({ playSound: vi.fn() }),
}));

const SHORT_PGN = '1. e4 e5 *';
const LONG_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *';

function renderMoves(pgn: string) {
    const chess = new Chess({ pgn });
    const addObserver = vi.spyOn(chess, 'addObserver');
    render(
        <ChessContext.Provider value={{ chess, config: { disableEngine: true } }}>
            <UnderboardPgnText />
        </ChessContext.Provider>,
    );
    return addObserver.mock.calls.length;
}

describe('PGN move list subscriptions', () => {
    afterEach(() => {
        cleanup();
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('subscribes a constant number of times regardless of how many moves are shown', () => {
        expect(renderMoves(LONG_PGN)).toBe(renderMoves(SHORT_PGN));
    });

    it('does not scroll back to the current move when the context identity changes', () => {
        const chess = new Chess({ pgn: LONG_PGN });
        const rect = {
            top: 0,
            bottom: 20,
            left: 0,
            right: 20,
            width: 20,
            height: 20,
            x: 0,
            y: 0,
            toJSON() {
                return {};
            },
        };
        const measure = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockReturnValue(rect);

        function Harness() {
            return (
                <ChessContext.Provider value={{ chess, config: { disableEngine: true } }}>
                    <UnderboardPgnText />
                </ChessContext.Provider>
            );
        }

        const view = render(<Harness />);
        const afterMount = measure.mock.calls.length;

        view.rerender(<Harness />);

        expect(measure.mock.calls.length).toBe(afterMount);
    });
});
