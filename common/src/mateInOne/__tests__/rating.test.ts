import { describe, expect, it } from 'vitest';
import { PUZZLES_PER_BLOCK, computeMateInOneRating } from '../rating';

const min = (m: number) => m * 60;

describe('PUZZLES_PER_BLOCK', () => {
    it('equals 10', () => {
        expect(PUZZLES_PER_BLOCK).toBe(10);
    });
});

describe('computeMateInOneRating - score 0', () => {
    it('returns 0 regardless of time', () => {
        expect(computeMateInOneRating(0, 0)).toBe(0);
        expect(computeMateInOneRating(0, min(5))).toBe(0);
        expect(computeMateInOneRating(0, min(60))).toBe(0);
    });
});

describe("computeMateInOneRating - Jesse's examples", () => {
    it('score 1 t=35min → 350', () => {
        expect(computeMateInOneRating(1, min(35))).toBe(350);
    });

    it('score 1 t=45min → 300 (floor)', () => {
        expect(computeMateInOneRating(1, min(45))).toBe(300);
    });

    it('score 7 t=5min → 2199', () => {
        expect(computeMateInOneRating(7, min(5))).toBe(2199);
    });

    it('score 7 t=10min → 2150 (rounded from 2149.5)', () => {
        expect(computeMateInOneRating(7, min(10))).toBe(2150);
    });

    it('score 7 t=15min → 2100', () => {
        expect(computeMateInOneRating(7, min(15))).toBe(2100);
    });

    it('score 7 t=20min → 2000 (cliff)', () => {
        expect(computeMateInOneRating(7, min(20))).toBe(2000);
    });

    it('score 10 t=8min → 2500', () => {
        expect(computeMateInOneRating(10, min(8))).toBe(2500);
    });
});

describe('computeMateInOneRating - scores 1-5 boundaries', () => {
    it('score 1 at t=40 → 300 (floor wins)', () => {
        expect(computeMateInOneRating(1, min(40))).toBe(300);
    });

    it('score 1 at t=10 → 600 (cap value)', () => {
        expect(computeMateInOneRating(1, min(10))).toBe(600);
    });

    it('score 5 at t=40 → 1500', () => {
        expect(computeMateInOneRating(5, min(40))).toBe(1500);
    });

    it('score 5 at t=10 → 1800', () => {
        expect(computeMateInOneRating(5, min(10))).toBe(1800);
    });

    it('score 5 at t=5 → 1800 (cap)', () => {
        expect(computeMateInOneRating(5, min(5))).toBe(1800);
    });

    it('score 3 at t=25 → 1050 (linear midpoint)', () => {
        // 300*3 + (40-25)*10 = 900 + 150 = 1050
        expect(computeMateInOneRating(3, min(25))).toBe(1050);
    });
});

describe('computeMateInOneRating - score 6 boundaries', () => {
    it('t=40 → 1800', () => {
        expect(computeMateInOneRating(6, min(40))).toBe(1800);
    });

    it('t=41 → 1800 (floor)', () => {
        expect(computeMateInOneRating(6, min(41))).toBe(1800);
    });

    it('t=15 → 1900 (slow band wins)', () => {
        expect(computeMateInOneRating(6, min(15))).toBe(1900);
    });

    it('t=14.999 → 2000 (fast band starts; ε-test)', () => {
        expect(computeMateInOneRating(6, min(14.999))).toBe(2000);
    });

    it('t=15.001 → 1900 (slow band; ε-test)', () => {
        expect(computeMateInOneRating(6, min(15.001))).toBe(1900);
    });

    it('t=5 → 2099 (cap value at fast edge)', () => {
        expect(computeMateInOneRating(6, min(5))).toBe(2099);
    });

    it('t=4 → 2099 (cap)', () => {
        expect(computeMateInOneRating(6, min(4))).toBe(2099);
    });
});

describe('computeMateInOneRating - score 7 boundaries', () => {
    it('t=14.999 → 2100 (interp band; ε-test)', () => {
        expect(computeMateInOneRating(7, min(14.999))).toBe(2100);
    });

    it('t=15.001 → 2000 (floor; ε-test)', () => {
        expect(computeMateInOneRating(7, min(15.001))).toBe(2000);
    });

    it('t=4 → 2199 (cap)', () => {
        expect(computeMateInOneRating(7, min(4))).toBe(2199);
    });
});

describe('computeMateInOneRating - score 8 boundaries', () => {
    it('t=15 → 2200', () => {
        expect(computeMateInOneRating(8, min(15))).toBe(2200);
    });

    it('t=14.999 → 2200 (interp; ε-test)', () => {
        expect(computeMateInOneRating(8, min(14.999))).toBe(2200);
    });

    it('t=15.001 → 2100 (floor; ε-test)', () => {
        expect(computeMateInOneRating(8, min(15.001))).toBe(2100);
    });

    it('t=5 → 2299', () => {
        expect(computeMateInOneRating(8, min(5))).toBe(2299);
    });
});

describe('computeMateInOneRating - score 9 boundaries', () => {
    it('t=15 → 2300', () => {
        expect(computeMateInOneRating(9, min(15))).toBe(2300);
    });

    it('t=14.999 → 2300 (interp; ε-test)', () => {
        expect(computeMateInOneRating(9, min(14.999))).toBe(2300);
    });

    it('t=15.001 → 2200 (floor; ε-test)', () => {
        expect(computeMateInOneRating(9, min(15.001))).toBe(2200);
    });

    it('t=5 → 2399', () => {
        expect(computeMateInOneRating(9, min(5))).toBe(2399);
    });
});

describe('computeMateInOneRating - score 10 boundaries', () => {
    it('t=15 → 2400 (interp band wins)', () => {
        expect(computeMateInOneRating(10, min(15))).toBe(2400);
    });

    it('t=14.999 → 2400 (interp; ε-test)', () => {
        expect(computeMateInOneRating(10, min(14.999))).toBe(2400);
    });

    it('t=15.001 → 2300 (floor; ε-test)', () => {
        expect(computeMateInOneRating(10, min(15.001))).toBe(2300);
    });

    it('t=10 → 2500 (cap value at fast edge)', () => {
        expect(computeMateInOneRating(10, min(10))).toBe(2500);
    });

    it('t=10.001 → 2500 (interp; ε-test)', () => {
        expect(computeMateInOneRating(10, min(10.001))).toBe(2500);
    });

    it('t=9.999 → 2500 (cap; ε-test)', () => {
        expect(computeMateInOneRating(10, min(9.999))).toBe(2500);
    });

    it('t=12.5 → 2450 (linear midpoint)', () => {
        // 2400 + (15 - 12.5) * 20 = 2450
        expect(computeMateInOneRating(10, min(12.5))).toBe(2450);
    });
});

describe('computeMateInOneRating - returns integers', () => {
    for (const score of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        it(`score ${score}, t=12min returns an integer`, () => {
            const r = computeMateInOneRating(score, min(12));
            expect(Number.isInteger(r)).toBe(true);
        });
    }
});
