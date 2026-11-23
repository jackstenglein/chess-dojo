import { ChessContext } from '@/board/pgn/PgnBoard';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnderboardPgnText } from './PgnText';

type ScrollHandler = (child: HTMLElement | null) => void;
const mocks = vi.hoisted(() => ({ variation: vi.fn<(handleScroll: ScrollHandler) => void>() }));

vi.mock('./Variation', () => ({
    default: ({ handleScroll }: { handleScroll: ScrollHandler }) => {
        mocks.variation(handleScroll);
        return <div data-testid='variation' />;
    },
}));
vi.mock('./GameComment', () => ({ default: () => null }));
vi.mock('./StartingPositionComments', () => ({ default: () => null }));
vi.mock('./Result', () => ({ default: () => null }));
vi.mock('@/stockfish/hooks/useEval', () => ({ useEval: () => undefined }));
vi.mock('@/stockfish/hooks/useChessDb', () => ({
    useChessDB: () => ({ pv: undefined, pvLoading: false }),
}));
vi.mock('./engine/EvaluationSection', () => ({ EvaluationSection: () => null }));
vi.mock('./engine/Settings', () => ({ default: () => null }));

/** Re-renders the panel on every tick, as the reader does while a timer runs. */
function TickingParent() {
    const [, setTick] = useState(0);
    return (
        <>
            <button data-testid='tick' onClick={() => setTick((v) => v + 1)} />
            <UnderboardPgnText />
        </>
    );
}

describe('UnderboardPgnText', () => {
    afterEach(() => {
        cleanup();
        mocks.variation.mockReset();
    });

    it('hands the moves one scroll handler for its whole life, across parent re-renders', () => {
        renderWithIntl(
            <ChessContext.Provider value={{ chess: new Chess() }}>
                <TickingParent />
            </ChessContext.Provider>,
        );
        const before = mocks.variation.mock.calls.length;
        fireEvent.click(screen.getByTestId('tick'));
        fireEvent.click(screen.getByTestId('tick'));
        expect(mocks.variation.mock.calls.length).toBe(before + 2);

        const handlers = new Set(mocks.variation.mock.calls.map(([handleScroll]) => handleScroll));
        expect(handlers.size).toBe(1);
        expect(typeof [...handlers][0]).toBe('function');
    });
});
