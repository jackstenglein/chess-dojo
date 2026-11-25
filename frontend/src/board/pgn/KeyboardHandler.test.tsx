import { Chess } from '@jackstenglein/chess';
import type { Api } from '@lichess-org/chessground/api';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useMemo, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import KeyboardHandler from './KeyboardHandler';
import { ChessContext } from './PgnBoard';
import type { UnderboardApi } from './boardTools/underboard/Underboard';
import { ScrollToMove } from './boardTools/underboard/settings/ViewerSettings';

vi.mock('@/board/sounds/useBoardSound', () => ({
    useBoardSound: () => ({ playSound: vi.fn() }),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

const PGN = '1. e4 e5 2. Nf3 *';

function WheelHarness({ chess, board }: { chess: Chess; board: Api }) {
    const boardRef = useRef<HTMLDivElement>(null);
    const underboardRef = useRef<UnderboardApi | null>(null);
    const value = useMemo(() => ({ chess, board, boardRef }), [chess, board]);

    return (
        <ChessContext.Provider value={value}>
            <div ref={boardRef} data-testid='wheel-board' />
            <KeyboardHandler underboardRef={underboardRef} />
        </ChessContext.Provider>
    );
}

function renderWheel() {
    const chess = new Chess({ pgn: PGN });
    chess.seek(null);
    const board = { set: vi.fn(), state: { orientation: 'white' } } as unknown as Api;
    const view = render(<WheelHarness chess={chess} board={board} />);
    return { chess, ...view };
}

describe('KeyboardHandler scroll', () => {
    beforeEach(() => {
        localStorage.setItem(ScrollToMove.key, 'true');
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
        vi.useRealTimers();
    });

    it('steps to the next move after the throttle when still mounted', () => {
        const { chess } = renderWheel();

        fireEvent.wheel(screen.getByTestId('wheel-board'), { deltaY: 100 });
        vi.advanceTimersByTime(20);

        expect(chess.currentMove()?.san).toBe('e4');
    });

    it('does not step after unmount while a scroll is pending', () => {
        const { chess, unmount } = renderWheel();

        fireEvent.wheel(screen.getByTestId('wheel-board'), { deltaY: 100 });
        unmount();
        vi.advanceTimersByTime(20);

        expect(chess.currentMove()?.san).toBeUndefined();
    });
});
