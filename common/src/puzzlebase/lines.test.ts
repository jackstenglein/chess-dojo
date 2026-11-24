import { describe, expect, it } from 'vitest';
import { linesFromSolution, readMarker } from './lines';
import { parsePuzzlePgn } from './parse';
import { SAMPLE_PGNS } from './samplePgns';

const pgn = (fen: string, moves: string) => `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}`;

describe('linesFromSolution', () => {
    it('turns a single line into one line', () => {
        const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
        expect(linesFromSolution(pgn(fen, '1. Rd8#'))).toEqual({
            fen,
            userColor: 'white',
            lines: [['Rd8#']],
            alternates: [],
        });
    });

    it('makes a line of its own for each defense, with the main line last', () => {
        const fen = 'r1bqr1k1/p1R1bp1p/1p4p1/3pB2Q/3p4/3BP3/PP3PPP/5RK1 w - - 0 1';
        const { lines } = linesFromSolution(pgn(fen, '1. Bxg6 hxg6 (1... fxg6 2. Qh6) 2. Qh8#'));
        expect(lines).toEqual([
            ['Bxg6', 'fxg6', 'Qh6'],
            ['Bxg6', 'hxg6', 'Qh8#'],
        ]);
    });

    it('handles several defenses at different depths, in the order they occur', () => {
        const fen = 'r1bq1rk1/ppp2pbp/3p2p1/2n5/2P3n1/1PN1PN2/PB1QBPPP/3RK2R b K - 0 1';
        const { lines, userColor } = linesFromSolution(
            pgn(fen, '1... Nxf2 2. Kxf2 (2. O-O Nxd1) 2... Bxc3'),
        );
        expect(userColor).toBe('black');
        expect(lines).toEqual([
            ['Nxf2', 'O-O', 'Nxd1'],
            ['Nxf2', 'Kxf2', 'Bxc3'],
        ]);
    });

    it('ignores a variation on the solver’s own move: the first move is the answer', () => {
        const fen = '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1';
        const { lines } = linesFromSolution(pgn(fen, '1. Nf7+ (1. Nd7) 1... Kg8 2. Nxd8'));
        expect(lines).toEqual([['Nf7+', 'Kg8', 'Nxd8']]);
    });

    it('rejects a PGN that is not a puzzle', () => {
        expect(() => linesFromSolution('1. e4 e5 *')).toThrow(/full game/);
    });
});

describe('variation markers', () => {
    const [defenses, skipAlt, alt2] = SAMPLE_PGNS;

    it('reads a marker at the start of a comment, ignoring case', () => {
        expect(readMarker('SKIP -- reason')).toBe('SKIP');
        expect(readMarker('  alt - another way')).toBe('ALT');
        expect(readMarker('ALT2 - weaker')).toBe('ALT2');
        expect(readMarker('ALT2')).toBe('ALT2');
    });

    it('does not read a marker from the middle of a comment or a longer word', () => {
        expect(readMarker('this is an ALT line')).toBeUndefined();
        expect(readMarker('ALTERNATIVE was better')).toBeUndefined();
        expect(readMarker('SKIPPING ahead')).toBeUndefined();
        expect(readMarker(undefined)).toBeUndefined();
    });

    it('keeps every sample valid, so the guide never shows a rejected PGN', () => {
        for (const sample of SAMPLE_PGNS) {
            expect(parsePuzzlePgn(sample.pgn).problems).toEqual([]);
            expect(() => linesFromSolution(sample.pgn)).not.toThrow();
        }
    });

    it('treats the first sample as a defense and ignores the analysis line', () => {
        const { lines, alternates } = linesFromSolution(defenses.pgn);
        expect(lines).toEqual([
            ['Nxf2', 'O-O', 'Nxd1'],
            ['Nxf2', 'Kxf2', 'Bxc3', 'Qxc3', 'Ne4+'],
        ]);
        expect(alternates).toEqual([]);
    });

    it('drops a SKIP defense from the lines but finds the ALT solution', () => {
        const { lines, alternates } = linesFromSolution(skipAlt.pgn);
        expect(lines).toEqual([['Bxg6', 'fxg6', 'Rb8', 'Kxb8', 'f7']]);
        expect(alternates).toEqual([
            { kind: 'alt', ply: 2, line: ['Bxg6', 'fxg6', 'f7', 'Ra8', 'Ke5', 'Kd7', 'Kf6'] },
        ]);
    });

    it('finds the ALT2 move at the first ply', () => {
        const { lines, alternates } = linesFromSolution(alt2.pgn);
        expect(lines).toHaveLength(1);
        expect(alternates).toEqual([{ kind: 'alt2', ply: 0, line: ['Re2', 'Kf1', 'Qe6'] }]);
    });

    it('ignores a SKIP marker on a solver variation, and a variation with no marker', () => {
        const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
        const text = pgn(
            fen,
            '1. Rd8# (1. Rd7 {SKIP not for solver moves}) (1. Rd6 {just analysis}) *',
        );
        expect(linesFromSolution(text).alternates).toEqual([]);
    });
});

describe('evaluations end a line', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';

    it('stops the main line at the first evaluation, keeping later moves out of the test', () => {
        const text = pgn(fen, '1. Rd7 f6 2. Rxg7+ $18 Kxg7 3. h4 h5 *');
        expect(linesFromSolution(text).lines).toEqual([['Rd7', 'f6', 'Rxg7+']]);
    });

    it('accepts the evaluation with or without the dollar sign, and ignores other NAGs', () => {
        expect(linesFromSolution(pgn(fen, '1. Rd7 $3 f6 2. Rxg7+ $16 Kxg7 *')).lines).toEqual([
            ['Rd7', 'f6', 'Rxg7+'],
        ]);
        expect(linesFromSolution(pgn(fen, '1. Rd7 $1 f6 $2 2. Rxg7+ *')).lines).toEqual([
            ['Rd7', 'f6', 'Rxg7+'],
        ]);
    });

    it('ends a defense at its own evaluation', () => {
        const text = pgn(fen, '1. Rd7 f6 (1... g6 2. Rxf7 $18 Kxf7 3. h4) 2. Rxg7+ $18 *');
        expect(linesFromSolution(text).lines).toEqual([
            ['Rd7', 'g6', 'Rxf7'],
            ['Rd7', 'f6', 'Rxg7+'],
        ]);
    });

    it('drops a defense that starts after the main line has ended', () => {
        const text = pgn(fen, '1. Rd7 f6 2. Rxg7+ $18 Kxg7 (2... Kf8 3. Rxh7) 3. h4 *');
        expect(linesFromSolution(text).lines).toEqual([['Rd7', 'f6', 'Rxg7+']]);
    });

    it('cuts an alternate at its evaluation too', () => {
        const text = pgn(fen, '1. Rd7 f6 2. Rxg7+ $18 (2. Rd8+ {ALT} Kf7 3. h4 $18 h5 4. g3) *');
        expect(linesFromSolution(text).alternates[0].line).toEqual([
            'Rd7',
            'f6',
            'Rd8+',
            'Kf7',
            'h4',
        ]);
    });

    it('ends the first sample where its comment says the puzzle ends', () => {
        const { lines } = linesFromSolution(SAMPLE_PGNS[0].pgn);
        expect(lines[lines.length - 1]).toEqual(['Nxf2', 'Kxf2', 'Bxc3', 'Qxc3', 'Ne4+']);
    });
});

describe('defenses and alternates inside defenses', () => {
    // A real one: in the 2... Kg8 defense, 3. Qd2 and 3. Qc1 also win.
    const PGN = `[SetUp "1"]
[FEN "r1b2rk1/1pqp1ppp/p1n1pn2/5N2/8/2PBB3/P1P2PPP/R2QR1K1 w - - 0 1"]

1. Nxg7 $1 1... Kxg7 2. Bh6+ $1 2... Kxh6 (2... Kg8 3. Qf3 $18 (3. Qd2 $18 { ALT }) (3. Qc1 { ALT })) (2... Kh8 { SKIP } 3. Qf3 $18 (3. Bxf8 $18)) 3. Qd2+ Kh5 4. Re3 $1 Qf4 5. Rh3+ Kg5 6. Rg3+ Ng4 7. h4+ $1 $18 (7. Rxg4+ $18 { ALT2 }) 1-0`;

    it('finds an ALT written inside a defense', () => {
        const { alternates } = linesFromSolution(PGN);
        expect(alternates).toContainEqual({
            kind: 'alt',
            ply: 4,
            line: ['Nxg7', 'Kxg7', 'Bh6+', 'Kg8', 'Qd2'],
        });
        expect(alternates).toContainEqual({
            kind: 'alt',
            ply: 4,
            line: ['Nxg7', 'Kxg7', 'Bh6+', 'Kg8', 'Qc1'],
        });
    });

    it('still finds the ALT2 on the main line, and the defense itself', () => {
        const { lines, alternates } = linesFromSolution(PGN);
        expect(alternates.some((a) => a.kind === 'alt2' && a.line.at(-1) === 'Rxg4+')).toBe(true);
        expect(lines).toContainEqual(['Nxg7', 'Kxg7', 'Bh6+', 'Kg8', 'Qf3']);
    });

    it('leaves a SKIP defense out, along with everything inside it', () => {
        const { lines } = linesFromSolution(PGN);
        expect(lines.some((line) => line.includes('Kh8'))).toBe(false);
    });

    it('finds a defense written inside another defense', () => {
        const text = pgn(
            '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
            '1. Rd7 f6 (1... g6 2. Rxf7 Kxf7 (2... Kh8 3. Rxh7+ $18) 3. h4 $18) 2. Rxg7+ $18 *',
        );
        const { lines } = linesFromSolution(text);
        expect(lines).toContainEqual(['Rd7', 'g6', 'Rxf7', 'Kxf7', 'h4']);
        expect(lines).toContainEqual(['Rd7', 'g6', 'Rxf7', 'Kh8', 'Rxh7+']);
        expect(lines[lines.length - 1]).toEqual(['Rd7', 'f6', 'Rxg7+']);
    });
});
