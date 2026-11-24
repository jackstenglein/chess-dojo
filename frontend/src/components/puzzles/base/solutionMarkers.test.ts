import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { isVariationHead, markerOf, mover, withMarker } from './solutionMarkers';

describe('withMarker', () => {
    it('adds a marker in front of a comment', () => {
        expect(withMarker('this also wins', 'ALT')).toBe('ALT this also wins');
        expect(withMarker(undefined, 'SKIP')).toBe('SKIP');
    });

    it('replaces the marker a comment has', () => {
        expect(withMarker('ALT - this also wins', 'ALT2')).toBe('ALT2 this also wins');
        expect(withMarker('alt2: good enough', 'ALT')).toBe('ALT good enough');
    });

    it('removes a marker and keeps the rest', () => {
        expect(withMarker('SKIP - not needed', undefined)).toBe('not needed');
        expect(withMarker('ALT', undefined)).toBe('');
    });

    it('leaves words that only start like a marker alone', () => {
        expect(withMarker('ALTERNATIVELY the queen', 'SKIP')).toBe('SKIP ALTERNATIVELY the queen');
    });
});

describe('variation moves', () => {
    const fen = '6k1/5pp1/8/8/8/8/5PPP/R5K1 w - - 0 1';
    const chess = new Chess({
        fen,
        pgn: `[SetUp "1"]\n[FEN "${fen}"]\n\n1. Ra8+ (1. Rb1 {ALT ok}) 1... Kh7 *`,
    });
    const [first, reply] = chess.history();
    const alt = first.variations[0][0];

    it('finds the start of a variation', () => {
        expect(isVariationHead(chess, alt)).toBe(true);
        expect(isVariationHead(chess, first)).toBe(false);
        expect(isVariationHead(chess, reply)).toBe(false);
    });

    it('says whose move it is', () => {
        expect(mover(first)).toBe('solver');
        expect(mover(alt)).toBe('solver');
        expect(mover(reply)).toBe('opponent');
    });

    it('reads the marker', () => {
        expect(markerOf(alt)).toBe('ALT');
        expect(markerOf(first)).toBeUndefined();
    });
});
