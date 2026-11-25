import { Config } from '@lichess-org/chessground/config';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveBoard } from './LiveBoard';

const sets: Config[] = [];

vi.mock('@lichess-org/chessground', () => ({
    Chessground: () => ({
        set: (config: Config) => sets.push(config),
        setAutoShapes: vi.fn(),
        destroy: vi.fn(),
        state: { dom: { bounds: { clear: vi.fn() } } },
    }),
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('LiveBoard', () => {
    beforeEach(() => {
        sets.length = 0;
    });

    it('lets the side to move play again after a guess is put back', async () => {
        const onGuess = vi.fn(() => false);
        render(<LiveBoard fen={START} orientation='white' onGuess={onGuess} />);

        await waitFor(() => expect(sets.some((s) => s.movable?.events?.after)).toBe(true));
        const after = sets.find((s) => s.movable?.events?.after)?.movable?.events?.after;
        sets.length = 0;

        // Chessground calls this once a piece is dropped. It has already
        // passed the turn to black and dropped the legal moves by then.
        after?.('e2', 'e4', {} as never);

        expect(onGuess).toHaveBeenCalledWith('e2e4');
        const putBack = sets.find((s) => s.fen === START);
        expect(putBack?.turnColor).toBe('white');
        expect(putBack?.movable?.color).toBe('white');
        expect(putBack?.movable?.dests?.get('e2')).toEqual(['e3', 'e4']);
    });
});
