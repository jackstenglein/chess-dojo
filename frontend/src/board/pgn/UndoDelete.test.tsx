import { useReconcile } from '@/board/Board';
import { useChess } from '@/board/pgn/PgnBoard';
import { Chess } from '@jackstenglein/chess';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoDeleteContextType, UndoDeleteProvider, useUndoDelete } from './UndoDelete';

vi.mock('@/board/Board', () => ({ useReconcile: vi.fn() }));
vi.mock('@/board/pgn/PgnBoard', () => ({ useChess: vi.fn() }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) =>
        `${key}:${(values?.count as number | undefined) ?? ''}`,
}));

const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 *';

describe('UndoDeleteProvider', () => {
    let chess: Chess;
    let context: UndoDeleteContextType;
    const reconcile = vi.fn();

    function Probe() {
        context = useUndoDelete();
        return null;
    }

    beforeEach(() => {
        chess = new Chess({ pgn: PGN });
        vi.mocked(useChess).mockReturnValue({ chess });
        vi.mocked(useReconcile).mockReturnValue(reconcile);
        render(
            <UndoDeleteProvider>
                <Probe />
            </UndoDeleteProvider>,
        );
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('restores and persists the deleted moves when undo is clicked', () => {
        const pgnAtSave: string[] = [];
        const savePgn = vi.fn(() => {
            pgnAtSave.push(chess.renderPgn());
        });
        context.savePgnRef.current = savePgn;

        const snapshot = chess.renderPgn();
        chess.delete(chess.history()[2]);
        act(() => context.onMovesDeleted({ moves: 3, pgn: snapshot }));
        const deletedPgn = chess.renderPgn();
        expect(deletedPgn).not.toContain('Nf3');
        expect(screen.getByText('deletedMoves:3')).toBeTruthy();

        fireEvent.click(screen.getByText('undo:'));

        expect(chess.renderPgn()).toContain('Nf3 Nc6 3. Bb5');
        expect(reconcile).toHaveBeenCalledTimes(1);
        // Saved before loadPgn, i.e. while the board still held the deleted PGN.
        expect(savePgn).toHaveBeenCalledExactlyOnceWith(snapshot);
        expect(pgnAtSave).toEqual([deletedPgn]);
    });
});
