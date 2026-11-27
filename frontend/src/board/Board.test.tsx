import { Chess } from '@jackstenglein/chess';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Board, { toDests } from './Board';

const boards = vi.hoisted(() => ({
    apis: [] as {
        set: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
        redrawAll: ReturnType<typeof vi.fn>;
        state: { orientation: string };
    }[],
}));

vi.mock('@lichess-org/chessground', () => ({
    Chessground: () => {
        const api = {
            set: vi.fn(),
            destroy: vi.fn(),
            redrawAll: vi.fn(),
            state: { orientation: 'white' },
        };
        boards.apis.push(api);
        return api;
    },
}));

vi.mock('@/board/sounds/useBoardSound', () => ({
    useBoardSound: () => ({ playSound: vi.fn() }),
}));

describe('toDests', () => {
    it('builds every destination from a single move generation', () => {
        const chess = new Chess();
        const moves = vi.spyOn(chess, 'moves');

        const dests = toDests(chess);

        expect(moves).toHaveBeenCalledTimes(1);
        expect([...(dests.get('e2') ?? [])].sort()).toEqual(['e3', 'e4']);
        expect([...(dests.get('b1') ?? [])].sort()).toEqual(['a3', 'c3']);
    });

    it('advertises the enemy king as a null-move destination', () => {
        const chess = new Chess();

        const dests = toDests(chess);

        expect(dests.get('e1') ?? []).toContain('e8');
    });

    it('does not advertise the enemy king as a null-move destination when null moves are disabled', () => {
        const chess = new Chess({ disableNullMoves: true });

        const dests = toDests(chess);

        expect(dests.get('e1') ?? []).not.toContain('e8');
    });
});

describe('Board chessground lifetime', () => {
    afterEach(() => {
        cleanup();
        boards.apis = [];
        delete (window as { chessground?: unknown }).chessground;
    });

    it('destroys chessground and releases the global when the board unmounts', () => {
        const { unmount } = render(<Board />);
        const api = window.chessground as { destroy: ReturnType<typeof vi.fn> };

        unmount();

        expect(api.destroy).toHaveBeenCalledOnce();
        expect(window.chessground).toBeUndefined();
    });

    it('destroys a second board without leaving it assigned globally', () => {
        render(<Board />);
        const main = window.chessground as { destroy: ReturnType<typeof vi.fn> };
        const preview = render(
            <Board config={{ fen: '8/8/8/8/8/8/8/8 w - - 0 1', viewOnly: true }} />,
        );
        const previewApi = window.chessground as { destroy: ReturnType<typeof vi.fn> };

        expect(previewApi).not.toBe(main);

        preview.unmount();

        expect(previewApi.destroy).toHaveBeenCalledOnce();
        expect(window.chessground).not.toBe(previewApi);
        expect(main.destroy).not.toHaveBeenCalled();
    });
});
