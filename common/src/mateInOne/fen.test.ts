import { describe, expect, it } from 'vitest';
import { fenToPieceList } from './fen';

describe('fenToPieceList', () => {
    it('starting position - all pieces and pawns', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        expect(fenToPieceList(fen)).toBe(
            'White: Qd1, Ra1, Rh1, Bc1, Bf1, Nb1, Ng1, Ke1, pawns a2 b2 c2 d2 e2 f2 g2 h2\nBlack: Qd8, Ra8, Rh8, Bc8, Bf8, Nb8, Ng8, Ke8, pawns a7 b7 c7 d7 e7 f7 g7 h7',
        );
    });

    it('no pawns - Q and K vs K', () => {
        // White Qd1 Ke1, Black Kh1
        const fen = '8/8/8/8/8/8/8/3QK2k w - - 0 1';
        expect(fenToPieceList(fen)).toBe('White: Qd1, Ke1\nBlack: Kh1');
    });

    it('promotion - two queens on the board', () => {
        // White has a promoted queen on a8 and original queen on d1, king on e1; Black king on h1
        const fen = 'Q7/8/8/8/8/8/8/3QK2k w - - 0 1';
        expect(fenToPieceList(fen)).toBe('White: Qa8, Qd1, Ke1\nBlack: Kh1');
    });

    it('single piece each side - K vs K', () => {
        // White Ke1, Black Ke8
        const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
        expect(fenToPieceList(fen)).toBe('White: Ke1\nBlack: Ke8');
    });

    it('only pawns remaining for one side', () => {
        // White has only pawns a2 b2, Black has king and queen
        const fen = '4k3/8/8/8/8/8/PP6/3QK3 w - - 0 1';
        expect(fenToPieceList(fen)).toBe(
            'White: Qd1, Ke1, pawns a2 b2\nBlack: Ke8',
        );
    });

    it('piece ordering - Q before R before B before N before K', () => {
        // White has K, N, B, R, Q in various positions - should output Q, R, B, N, K order
        const fen = '4k3/8/8/8/8/8/8/RNBQKBNR w - - 0 1';
        expect(fenToPieceList(fen)).toBe(
            'White: Qd1, Ra1, Rh1, Bc1, Bf1, Nb1, Ng1, Ke1\nBlack: Ke8',
        );
    });

    it('uses board field only - ignores side to move and other FEN fields', () => {
        const fenW = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
        const fenB = '4k3/8/8/8/8/8/8/4K3 b - - 0 1';
        expect(fenToPieceList(fenW)).toBe(fenToPieceList(fenB));
    });

    it('mate-in-one position - Rxh7#', () => {
        // Typical rook-delivers-mate position: White Re7 Ke1, Black Ke8 - placeholder
        const fen = '4k3/4R3/8/8/8/8/8/4K3 w - - 0 1';
        expect(fenToPieceList(fen)).toBe('White: Re7, Ke1\nBlack: Ke8');
    });
});
