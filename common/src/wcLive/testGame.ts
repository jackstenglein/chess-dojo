/**
 * "Game 0": a replayed game for testing the live page at any time, without
 * waiting for a match game. Morphy's Opera Game is played back one move every
 * MOVE_SECONDS, after PRESTART_SECONDS in which move 1 can be guessed, and then
 * starts again. Every loop is its own round, so each gets a fresh leaderboard.
 *
 * The page and the API both compute the position from the clock with this
 * file, so they always agree on which moves have been played.
 */

const MOVES = [
    'e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6',
    'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8',
    'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#',
]; // prettier-ignore

export const TEST_MOVE_SECONDS = 20;
export const TEST_PRESTART_SECONDS = 60;
/** How long the final position stays up before the next loop. */
const TEST_END_SECONDS = 60;
const START_CLOCK_SECONDS = 2 * 60 * 60;

const CYCLE_MS =
    (TEST_PRESTART_SECONDS + MOVES.length * TEST_MOVE_SECONDS + TEST_END_SECONDS) * 1000;

/** Test rounds are "tst" plus the loop number in base 36, 8 characters like Lichess ids. */
const TEST_ID = /^tst[0-9a-z]{5}$/;

export const TEST_GAME_NUMBER = 0;
export const TEST_GAME_NAME = 'Game 0 (test)';

export function isTestRoundId(roundId: string | undefined): boolean {
    return !!roundId && TEST_ID.test(roundId);
}

function loopOf(roundId: string): number {
    return parseInt(roundId.slice(3), 36);
}

/** The id of the loop running at the given time. */
export function currentTestRoundId(now: number): string {
    const loop = Math.floor(now / CYCLE_MS);
    return `tst${loop.toString(36).padStart(5, '0').slice(-5)}`;
}

export interface TestRoundState {
    roundId: string;
    /** When move 1 is played. */
    startsAt: number;
    /** Moves played so far, in SAN. */
    sans: string[];
    result: string;
    /** When the last move was played, for the ticking clock. */
    lastMoveAt?: number;
    /** A PGN of the moves so far, with clocks, like a Lichess broadcast. */
    pgn: string;
}

/**
 * The state of a test round at the given time, or undefined if the round has
 * not begun or is not a test round.
 */
export function testRoundState(roundId: string, now: number): TestRoundState | undefined {
    if (!isTestRoundId(roundId)) {
        return undefined;
    }
    const loopStart = loopOf(roundId) * CYCLE_MS;
    if (now < loopStart) {
        return undefined;
    }
    const startsAt = loopStart + TEST_PRESTART_SECONDS * 1000;
    const elapsed = now - startsAt;
    const plies =
        elapsed < 0
            ? 0
            : Math.min(MOVES.length, Math.floor(elapsed / (TEST_MOVE_SECONDS * 1000)) + 1);
    const sans = MOVES.slice(0, plies);
    const result = plies === MOVES.length ? '1-0' : '*';

    let movetext = '';
    sans.forEach((san, i) => {
        const ownMoves = Math.floor(i / 2) + 1;
        const clock = START_CLOCK_SECONDS - ownMoves * TEST_MOVE_SECONDS;
        const h = Math.floor(clock / 3600);
        const m = String(Math.floor((clock % 3600) / 60)).padStart(2, '0');
        const s = String(clock % 60).padStart(2, '0');
        const number = i % 2 === 0 ? `${i / 2 + 1}. ` : `${Math.floor(i / 2) + 1}... `;
        movetext += `${number}${san} { [%clk ${h}:${m}:${s}] } `;
    });

    const pgn = [
        '[Event "ChessDojo test game"]',
        '[White "Morphy, Paul"]',
        '[Black "Duke Karl / Count Isouard"]',
        `[Result "${result}"]`,
        '',
        `${movetext}${result}`,
        '',
    ].join('\n');

    return {
        roundId,
        startsAt,
        sans,
        result,
        lastMoveAt: plies > 0 ? startsAt + (plies - 1) * TEST_MOVE_SECONDS * 1000 : undefined,
        pgn,
    };
}
