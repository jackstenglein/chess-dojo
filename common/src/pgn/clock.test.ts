import { Chess, Move } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { timeControlForMove } from './clock';

function loadChess(timeControl: string | undefined, body: string): Chess {
    const header = timeControl === undefined ? '' : `[TimeControl "${timeControl}"]\n`;
    return new Chess({ pgn: `${header}\n${body}` });
}

function moveAtPly(chess: Chess, ply: number): Move {
    const move = chess.history().find((m) => m.ply === ply);
    if (!move) {
        throw new Error(`No move at ply ${ply}`);
    }
    return move;
}

describe('timeControlForMove', () => {
    it('returns undefined when the TimeControl tag is absent', () => {
        const chess = loadChess(undefined, '1. e4 e5 *');
        expect(timeControlForMove(chess, moveAtPly(chess, 1))).toBeUndefined();
    });

    it('returns the only segment for a single-period control', () => {
        const chess = loadChess('600+0', '1. e4 e5 2. Nf3 *');
        const tc = timeControlForMove(chess, moveAtPly(chess, 3));
        expect(tc?.value).toBe('600+0');
        expect(tc?.seconds).toBe(600);
    });

    it('returns the first segment immediately when it has no move limit', () => {
        const chess = loadChess('600+0', '1. e4 *');
        const tc = timeControlForMove(chess, moveAtPly(chess, 1));
        expect(tc?.value).toBe('600+0');
    });

    it('uses the first phase while the full-move number is within that phase', () => {
        const chess = loadChess('2/7200:3600', '1. e4 e5 2. Nf3 Nc6 3. Bb5 *');
        expect(timeControlForMove(chess, moveAtPly(chess, 1))?.value).toBe('2/7200');
        expect(timeControlForMove(chess, moveAtPly(chess, 4))?.value).toBe('2/7200');
    });

    it('switches to the next phase after the allotted full moves', () => {
        const chess = loadChess('2/7200:3600', '1. e4 e5 2. Nf3 Nc6 3. Bb5 *');
        expect(timeControlForMove(chess, moveAtPly(chess, 5))?.value).toBe('3600');
    });

    it('selects the correct segment across three phased controls', () => {
        const chess = loadChess(
            '2/7200:2/3600:1800',
            '1. e4 e5 2. Nf3 Nc6 3. Bb5 Bc5 4. c3 Nf6 5. d4 *',
        );
        expect(timeControlForMove(chess, moveAtPly(chess, 1))?.value).toBe('2/7200');
        expect(timeControlForMove(chess, moveAtPly(chess, 5))?.value).toBe('2/3600');
        expect(timeControlForMove(chess, moveAtPly(chess, 9))?.value).toBe('1800');
    });

    it('returns the last segment when the move count exceeds all limited phases', () => {
        const chess = loadChess('1/60:2/120', '1. e4 e5 2. Nf3 Nc6 3. Bb5 Bc5 4. c3 *');
        expect(timeControlForMove(chess, moveAtPly(chess, 1))?.value).toBe('1/60');
        expect(timeControlForMove(chess, moveAtPly(chess, 2))?.value).toBe('1/60');
        expect(timeControlForMove(chess, moveAtPly(chess, 3))?.value).toBe('2/120');
        expect(timeControlForMove(chess, moveAtPly(chess, 7))?.value).toBe('2/120');
    });
});
