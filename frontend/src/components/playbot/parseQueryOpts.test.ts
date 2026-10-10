import { describe, expect, it } from 'vitest';
import { parseQueryOpts } from './PlayBotPage';

const FEN = '6k1/pp3pp1/2p1q1Pp/3b4/8/6Q1/PB3Pp1/3r1NK1 w - - 0 28';

describe('parseQueryOpts', () => {
    it('returns nothing without a position', () => {
        expect(parseQueryOpts(new URLSearchParams({ color: 'black' }))).toBeNull();
    });

    it('starts an unlimited game when the query carries no clock', () => {
        const opts = parseQueryOpts(new URLSearchParams({ fen: FEN, color: 'black' }));
        expect(opts).toMatchObject({
            startFen: FEN,
            playerColor: 'black',
            maiaRating: 1500,
            timeControl: { initialMs: null, incrementMs: 0 },
        });
        expect(parseQueryOpts(new URLSearchParams({ fen: FEN, mins: '0' }))?.timeControl).toEqual({
            initialMs: null,
            incrementMs: 0,
        });
    });

    it('keeps a clock the query names', () => {
        const opts = parseQueryOpts(new URLSearchParams({ fen: FEN, mins: '5', inc: '3' }));
        expect(opts?.timeControl).toEqual({ initialMs: 300000, incrementMs: 3000 });
    });
});
