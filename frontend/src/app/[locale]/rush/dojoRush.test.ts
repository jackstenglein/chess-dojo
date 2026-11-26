import { Chess } from '@jackstenglein/chess';
import { PuzzleRushPuzzle } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    nextRushRating,
    PUZZLE_RUSH_DURATION_SECONDS,
    PUZZLE_RUSH_MAX_RATING,
    PUZZLE_RUSH_MAX_STRIKES,
    PUZZLE_RUSH_START_RATING,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { beforeEach, describe, expect, it } from 'vitest';
import { CORE_OFFER, GAME_REVIEW_OFFER, WORKSHOPS_OFFER } from '../class/content';
import * as content from './content';
import {
    CLIMB_CAPTION,
    CLIMB_EXAMPLE,
    COUPON,
    DEMO_RUN,
    FAQ,
    FREE_ACCOUNTS_CAN_PLAY,
    HERO,
    HERO_POSITION,
    heroHeadline,
    JESSE_BEST,
    JESSE_QUOTE,
    missesLabel,
    offerLabel,
    PLANS,
    runsLeftLine,
    RUSH_DEMO_RUN_LIMIT,
    WHY,
} from './content';
import puzzlePack from './pack/puzzlePack.json';
import { createPackSource } from './puzzleSource';
import { answeredAttempts, bandLine, ladderBand, paceInsight, shareText } from './runInsights';
import { rushLeadSchema } from './rushLead';
import { bestSolved, readRuns, resetRunsForTest, RushDemoRun, saveRun } from './rushStorage';

const puzzles: PuzzleRushPuzzle[] = puzzlePack.puzzles;

function bandCount(from: number, to: number): number {
    return puzzles.filter((puzzle) => puzzle.rating >= from && puzzle.rating < to).length;
}

describe('bundled puzzle pack', () => {
    it('records where it came from', () => {
        expect(puzzlePack.source).toBe('https://database.lichess.org/lichess_db_puzzle.csv.zst');
        expect(puzzlePack.licence).toBe('CC0');
        expect(puzzlePack.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('holds puzzles in the shape the app serves', () => {
        expect(puzzles.length).toBeGreaterThanOrEqual(600);
        expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(puzzles.length);
        for (const puzzle of puzzles) {
            expect(Object.keys(puzzle).sort()).toEqual(['fen', 'id', 'moves', 'rating', 'themes']);
            expect(typeof puzzle.id).toBe('string');
            expect(Number.isInteger(puzzle.rating)).toBe(true);
            expect(puzzle.moves.length).toBeGreaterThanOrEqual(2);
            expect(puzzle.moves.length % 2).toBe(0);
            expect(Array.isArray(puzzle.themes)).toBe(true);
        }
    });

    it('has no mate puzzles and every solution plays out legally', () => {
        for (const puzzle of puzzles) {
            expect(puzzle.themes.some((theme) => theme.toLowerCase().includes('mate'))).toBe(false);
            const chess = new Chess({ fen: puzzle.fen });
            for (const move of puzzle.moves) {
                expect(chess.move(move), `${puzzle.id} ${move}`).not.toBeNull();
            }
            expect(chess.isCheckmate(), puzzle.id).toBe(false);
        }
    });

    it('covers every 100-point band from the start rating to 2600', () => {
        for (let band = PUZZLE_RUSH_START_RATING; band < 2600; band += 100) {
            expect(bandCount(band, band + 100), `band ${band}`).toBeGreaterThanOrEqual(25);
        }
    });

    it('carries more puzzles where three runs spend most of their time', () => {
        for (let band = PUZZLE_RUSH_START_RATING; band < 1500; band += 100) {
            expect(bandCount(band, band + 100), `band ${band}`).toBeGreaterThanOrEqual(30);
        }
    });

    it('has puzzles for the first search window and for the top of the ladder', () => {
        expect(
            bandCount(PUZZLE_RUSH_START_RATING - 50, PUZZLE_RUSH_START_RATING + 51),
        ).toBeGreaterThan(10);
        for (let band = 2600; band < PUZZLE_RUSH_MAX_RATING; band += 100) {
            expect(bandCount(band, band + 100), `band ${band}`).toBeGreaterThan(0);
        }
    });

    it('stays a small download', () => {
        expect(JSON.stringify(puzzlePack).length).toBeLessThan(200 * 1024);
    });
});

describe('createPackSource', () => {
    const pool: PuzzleRushPuzzle[] = [300, 340, 420, 480, 900].map((rating, index) => ({
        id: `p${index}`,
        fen: '',
        moves: ['a', 'b'],
        rating,
        themes: [],
    }));

    it('serves a puzzle inside the first window when one exists', async () => {
        const source = createPackSource(pool, { random: () => 0.99 });
        const puzzle = await source.next(300, []);
        expect(puzzle?.id).toBe('p1');
    });

    it('never serves an excluded puzzle', async () => {
        const source = createPackSource(pool);
        for (let i = 0; i < 50; i++) {
            const puzzle = await source.next(300, ['p0', 'p1']);
            expect(['p0', 'p1']).not.toContain(puzzle?.id);
        }
    });

    it('widens the window before giving up on the rating', async () => {
        const source = createPackSource(pool, { random: () => 0 });
        expect((await source.next(300, ['p0', 'p1']))?.id).toBe('p2');
    });

    it('falls back to the closest puzzle when every window is empty', async () => {
        const source = createPackSource(pool);
        expect((await source.next(2000, []))?.id).toBe('p4');
    });

    it('passes over puzzles from earlier runs while fresh ones remain', async () => {
        const source = createPackSource(pool, { avoidIds: ['p0'], random: () => 0 });
        expect((await source.next(300, []))?.id).toBe('p1');
        expect((await source.next(300, ['p1']))?.id).toBe('p0');
    });

    it('returns nothing once every puzzle has been used', async () => {
        const source = createPackSource(pool);
        expect(
            await source.next(
                300,
                pool.map((puzzle) => puzzle.id),
            ),
        ).toBeUndefined();
    });

    it('can serve a full clean climb from the real pack without repeats', async () => {
        const source = createPackSource(puzzles);
        const seen: string[] = [];
        let ladder = { stack: [PUZZLE_RUSH_START_RATING], streak: 0, strikes: 0 };
        for (let i = 0; i < 40; i++) {
            const rating = ladder.stack[ladder.stack.length - 1];
            const puzzle = await source.next(rating, seen);
            expect(puzzle, `solve ${i} at ${rating}`).toBeDefined();
            expect(seen).not.toContain(puzzle?.id);
            expect(Math.abs((puzzle?.rating ?? 0) - rating)).toBeLessThanOrEqual(200);
            seen.push(puzzle?.id ?? '');
            ladder = {
                stack: [...ladder.stack, nextRushRating(ladder)],
                streak: ladder.streak + 1,
                strikes: 0,
            };
        }
    });
});

describe('content', () => {
    function collectStrings(value: unknown, found: string[] = []): string[] {
        if (typeof value === 'string') {
            found.push(value);
        } else if (Array.isArray(value)) {
            value.forEach((item) => collectStrings(item, found));
        } else if (value && typeof value === 'object') {
            Object.values(value).forEach((item) => collectStrings(item, found));
        }
        return found;
    }

    it('keeps to the copy rules: no em dashes and no exclamation points', () => {
        const strings = collectStrings({
            ...content,
            // The class offers are owned by /class.
            PLANS: PLANS.map(({ name, tagline, points }) => ({ name, tagline, points })),
            // A stream quote keeps Jesse's own words.
            JESSE_QUOTE: undefined,
        });
        strings.push(
            runsLeftLine(1),
            runsLeftLine(2),
            missesLabel(1),
            missesLabel(3),
            offerLabel(),
        );
        expect(strings.length).toBeGreaterThan(30);
        for (const text of strings) {
            expect(text, text).not.toMatch(/[—!]/);
        }
    });

    it('states the rules the code enforces', () => {
        expect(PUZZLE_RUSH_DURATION_SECONDS).toBe(600);
        expect(PUZZLE_RUSH_MAX_STRIKES).toBe(3);
        expect(HERO.headline).toBe('Ten minutes, three strikes. How high can you climb?');
        expect(WHY[0].title).toBe('Ten minutes is long enough to think');
        expect(WHY[0].body).toContain('Dojo Rush gives you ten.');
        expect(WHY[1].title).toBe('Three strikes, and a miss costs you ground');
        expect(FAQ[3].answer).toContain('ten minutes, three strikes');
    });

    it('shows the climb the ladder code produces', () => {
        expect(CLIMB_EXAMPLE).toEqual([300, 350, 410, 480, 560, 650, 750]);
        expect(CLIMB_CAPTION).toBe('Six solves in a row take you from 300 to 750.');
    });

    it('promises three runs and 25% off, and counts the runs down', () => {
        expect(RUSH_DEMO_RUN_LIMIT).toBe(3);
        expect(HERO.reward).toContain('25% off a ChessDojo membership');
        expect(runsLeftLine(1)).toBe('2 runs left. Finish all three to unlock 25% off.');
        expect(runsLeftLine(2)).toBe('1 run left. Finish all three to unlock 25% off.');
        expect(missesLabel(1)).toBe('Go through my miss');
        expect(missesLabel(3)).toBe('Go through my 3 misses');
    });

    it('hands out the World Championship sale code', () => {
        expect(COUPON).toEqual({
            confirmed: true,
            code: 'WCC2026',
            percentOff: 25,
            terms: 'One-time discount on any ChessDojo membership, from the World Championship sale.',
        });
        expect(offerLabel()).toBe('Use my 25% off');
        expect(content.couponReminder()).toBe('Enter WCC2026 at checkout.');
        expect(FAQ[1].answer).toBe(
            'You get a code for 25% off a ChessDojo membership. One-time discount on any ChessDojo membership, from the World Championship sale.',
        );
    });

    it('keeps everything unconfirmed switched off', () => {
        expect(JESSE_BEST.confirmed).toBe(false);
        expect(JESSE_QUOTE.approved).toBe(false);
        expect(FREE_ACCOUNTS_CAN_PLAY.confirmed).toBe(false);
    });

    it('shows no Jesse number while it is unconfirmed', () => {
        const visible = [
            heroHeadline(),
            offerLabel(),
            ...FAQ.flatMap((item) => [item.question, item.answer]),
        ].join(' ');
        expect(visible).not.toContain(String(JESSE_BEST.score));
        expect(heroHeadline()).toBe(HERO.headline);
    });

    it('shows no code while the coupon is switched off', () => {
        COUPON.confirmed = false;
        try {
            expect(offerLabel()).toBe('See the plans');
            expect(content.couponReminder()).toBeUndefined();
        } finally {
            COUPON.confirmed = true;
        }
    });

    it('never promises unlimited or free play', () => {
        const text = JSON.stringify(content).toLowerCase();
        expect(text).not.toContain('unlimited');
        expect(text).not.toContain('free forever');
        expect(text).not.toContain('free account');
        expect(text).not.toContain('guarantee');
    });

    it('sells the three plans at their real prices, with the review plan renamed', () => {
        expect(PLANS.map((plan) => plan.offer)).toEqual([
            CORE_OFFER,
            WORKSHOPS_OFFER,
            GAME_REVIEW_OFFER,
        ]);
        expect(PLANS.map((plan) => plan.name)).toEqual(['Core', 'Workshops', 'Sensei Review']);
        expect(PLANS.map((plan) => plan.offer.price)).toEqual([
            { month: 20, year: 12 },
            { month: 75, year: 67 },
            { month: 200, year: 180 },
        ]);
    });

    it('shows a position from the pack in the hero', () => {
        const puzzle = puzzles.find((candidate) => candidate.id === '00Uwn');
        expect(puzzle).toBeDefined();
        const chess = new Chess({ fen: puzzle?.fen });
        chess.move(puzzle?.moves[0] ?? '');
        expect(chess.fen()).toBe(HERO_POSITION.fen);
        expect(HERO_POSITION.toMove).toBe('White to move');
    });
});

describe('run storage', () => {
    const run: RushDemoRun = {
        solved: 5,
        attempted: 8,
        accuracy: 63,
        highestSolved: 560,
        timeSeconds: 240,
        endReason: 'strikes',
        finishedAt: '2026-11-13T12:00:00.000Z',
        misses: [{ puzzleId: 'a', fen: 'fen', moves: ['e2e4', 'e7e5'], rating: 400 }],
        puzzleIds: ['a', 'b'],
        attempts: [
            { puzzleId: 'b', rating: 310, result: 'win', seconds: 20 },
            { puzzleId: 'a', rating: 400, result: 'loss', seconds: 6 },
        ],
    };

    beforeEach(() => {
        resetRunsForTest();
    });

    it('starts empty and keeps finished runs in order', () => {
        expect(readRuns()).toEqual([]);
        saveRun(run);
        saveRun({ ...run, solved: 9 });
        expect(readRuns().map((saved) => saved.solved)).toEqual([5, 9]);
        expect(bestSolved(readRuns())).toBe(9);
    });

    it('stops counting at three runs', () => {
        for (let i = 0; i < 5; i++) {
            saveRun({ ...run, solved: i });
        }
        expect(readRuns().map((saved) => saved.solved)).toEqual([0, 1, 2]);
    });

    it('treats damaged storage as no runs', () => {
        window.localStorage.setItem('rushDemo.runs', '{not json');
        expect(readRuns()).toEqual([]);
        window.localStorage.setItem('rushDemo.runs', JSON.stringify([{ solved: 'many' }]));
        expect(readRuns()).toEqual([]);
    });

    it('reads a run saved before attempts were stored', () => {
        const { attempts: _attempts, ...older } = run;
        window.localStorage.setItem('rushDemo.runs', JSON.stringify([older]));
        expect(readRuns()).toHaveLength(1);
        expect(readRuns()[0].attempts).toEqual([]);
    });

    it('never reads more than three runs, whatever is stored', () => {
        window.localStorage.setItem('rushDemo.runs', JSON.stringify(Array(6).fill(run)));
        expect(readRuns()).toHaveLength(3);
    });
});

describe('rushLeadSchema', () => {
    const lead = { email: 'player@example.com', consent: true, bestScore: 17, scores: [9, 14, 17] };

    it('accepts a complete lead', () => {
        expect(rushLeadSchema.safeParse(lead).success).toBe(true);
    });

    it('requires consent and a real email', () => {
        expect(rushLeadSchema.safeParse({ ...lead, consent: false }).success).toBe(false);
        expect(rushLeadSchema.safeParse({ ...lead, email: 'nope' }).success).toBe(false);
    });

    it('rejects a filled honeypot', () => {
        expect(rushLeadSchema.safeParse({ ...lead, website: 'x' }).success).toBe(false);
    });
});

describe('the run the hero plays by itself', () => {
    it('uses real positions from the pack and only legal moves', () => {
        for (const step of DEMO_RUN) {
            expect(puzzles.some((puzzle) => puzzle.fen === step.fen)).toBe(true);
            const chess = new Chess({ fen: step.fen });
            for (const move of step.moves) {
                expect(chess.move(move), `${step.fen} ${move}`).not.toBeNull();
            }
            const playsAs = new Chess({ fen: step.fen }).turn() === 'w' ? 'black' : 'white';
            expect(step.orientation).toBe(playsAs);
        }
    });

    it('plays the solution when it shows a solve and another move when it shows a miss', () => {
        for (const step of DEMO_RUN) {
            const puzzle = puzzles.find((candidate) => candidate.fen === step.fen);
            if (step.result === 'win') {
                expect(step.moves).toEqual(puzzle?.moves);
            } else {
                expect(step.moves[0]).toBe(puzzle?.moves[0]);
                expect(step.moves[1]).not.toBe(puzzle?.moves[1]);
            }
        }
        expect(DEMO_RUN.map((step) => step.result)).toEqual(['win', 'win', 'loss']);
    });
});

describe('run insights', () => {
    const base: RushDemoRun = {
        solved: 3,
        attempted: 5,
        accuracy: 60,
        highestSolved: 650,
        timeSeconds: 120,
        endReason: 'strikes',
        finishedAt: '2026-11-13T12:00:00.000Z',
        misses: [],
        puzzleIds: [],
        attempts: [
            { puzzleId: 'a', rating: 300, result: 'win', seconds: 20 },
            { puzzleId: 'b', rating: 350, result: 'win', seconds: 30 },
            { puzzleId: 'c', rating: 410, result: 'loss', seconds: 6 },
            { puzzleId: 'd', rating: 650, result: 'win', seconds: 25 },
            { puzzleId: 'e', rating: 560, result: 'loss', seconds: 8 },
        ],
    };

    it('says so when the misses were the fast ones', () => {
        expect(paceInsight(base)).toBe(
            'Your misses took 7s on average and your solves took 25s. The misses were the fast ones.',
        );
    });

    it('says so when the misses were slow, hard ones', () => {
        const slow = {
            ...base,
            attempts: base.attempts.map((attempt) =>
                attempt.result === 'loss' ? { ...attempt, seconds: 60 } : attempt,
            ),
        };
        expect(paceInsight(slow)).toContain('Those were hard for you, not rushed.');
    });

    it('stays quiet without enough solves, and handles a clean run', () => {
        expect(paceInsight({ ...base, attempts: base.attempts.slice(0, 1) })).toBeUndefined();
        expect(paceInsight({ ...base, attempts: base.attempts.slice(0, 2) })).toBe(
            'No misses, at 25s a puzzle.',
        );
    });

    it('leaves out the puzzle a clock or an early end cut off', () => {
        expect(answeredAttempts(base)).toHaveLength(5);
        expect(answeredAttempts({ ...base, endReason: 'time' })).toHaveLength(4);
        expect(answeredAttempts({ ...base, endReason: 'aborted' })).toHaveLength(4);
    });

    it('names the cohort band a puzzle rating falls in', () => {
        expect(ladderBand(267)).toBe('0-300');
        expect(ladderBand(300)).toBe('300-400');
        expect(ladderBand(1250)).toBe('1200-1300');
        expect(ladderBand(2399)).toBe('2300-2400');
        expect(ladderBand(2650)).toBe('2400+');
    });

    it('places the hardest solve on the ladder and says a rush score is not a rating', () => {
        expect(bandLine(base)).toContain('650');
        expect(bandLine(base)).toContain('600-700 cohort');
        expect(bandLine(base)).toContain('A rush score is not a rating');
        expect(bandLine({ ...base, highestSolved: 0 })).toBeUndefined();
    });

    it('writes a result worth pasting: score, one square per puzzle, the link', () => {
        const lines = shareText(base, 'https://www.chessdojo.club/rush').split('\n');
        expect(lines[0]).toBe('Dojo Rush: 3 solved, 60% accuracy, hardest 650');
        expect(lines[1].match(/\u{1F7E9}|\u{1F7E5}/gu)).toHaveLength(5);
        expect(lines[2]).toBe('10 minutes, 3 strikes. https://www.chessdojo.club/rush');
    });
});
