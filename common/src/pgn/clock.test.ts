import { Chess, Move } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { maxClockSeconds, timeControlForMove } from './clock';

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

/** Builds a PGN body of the given number of full moves, shuffling knights back and forth. */
function shuffleKnights(fullMoves: number, clocks: Record<number, string> = {}): string {
    const white = ['Nf3', 'Ng1'];
    const black = ['Nf6', 'Ng8'];
    let body = '';
    for (let i = 0; i < fullMoves * 2; i++) {
        const san = i % 2 === 0 ? white[(i / 2) % 2] : black[((i - 1) / 2) % 2];
        body += i % 2 === 0 ? `${i / 2 + 1}. ${san} ` : `${san} `;
        if (clocks[i + 1]) {
            body += `{ [%clk ${clocks[i + 1]}] } `;
        }
    }
    return `${body}*`;
}

describe('maxClockSeconds', () => {
    it('returns undefined for every move without a time control or clocks', () => {
        const chess = loadChess(undefined, '1. e4 e5 2. Nf3 *');
        expect(maxClockSeconds(chess, chess.history())).toEqual([undefined, undefined, undefined]);
    });

    it('adds the increment to the previous clock of the same player', () => {
        const chess = loadChess('600+5', shuffleKnights(2, { 1: '0:09:50', 2: '0:09:40' }));
        expect(maxClockSeconds(chess, chess.history())).toEqual([605, 605, 595, 585]);
    });

    it('accumulates increments across moves without a clock (issue #2773)', () => {
        const chess = loadChess('40/5400+30:1800+30', shuffleKnights(5, { 9: '1:32:00' }));
        const max = maxClockSeconds(chess, chess.history());
        // White's 5th move (ply 9) can have at most 1:30:00 + 5 * 30s = 1:32:30.
        expect(max[8]).toBe(5400 + 5 * 30);
        expect(max[9]).toBe(5400 + 5 * 30);
    });

    it('adds the next period time on the last move of a period', () => {
        const chess = loadChess('40/5400+30:1800+30', shuffleKnights(41, { 77: '0:10:00' }));
        const max = maxClockSeconds(chess, chess.history());
        // White's 39th move had 10 minutes, so after move 40 white can have 10:00 + 30s + 30:00.
        expect(max[78]).toBe(600 + 30 + 1800);
        // Black never entered a clock, so has at most 1:30:00 + 40 * 30s + 30:00 after move 40.
        expect(max[79]).toBe(5400 + 40 * 30 + 1800);
        // The second period's increment applies from move 41.
        expect(max[80]).toBe(600 + 30 + 1800 + 30);
    });

    it('repeats a final period that has a move limit', () => {
        const chess = loadChess('2/600', shuffleKnights(4));
        expect(maxClockSeconds(chess, chess.history())).toEqual([
            600, 600, 1200, 1200, 1200, 1200, 1800, 1800,
        ]);
    });
});
