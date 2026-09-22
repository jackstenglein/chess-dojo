/**
 * Sample tactics puzzles, taken straight from the provided PGNs.
 * Each puzzle starts at the given FEN with the solver to move — the
 * first move of every line is the solver's. No lead-in, no preamble.
 */

export interface TacticsPuzzle {
    /** Stable id for keys and progress. */
    id: string;
    /** Short title shown above the board. */
    title: string;
    /** Starting position, solver to move. */
    fen: string;
    /** Color the user plays (always the side to move). */
    userColor: 'white' | 'black';
    /** Solution lines, each a SAN list from the start position.
     * Variations come first, the main line is always last. */
    lines: string[][];
    /** Short description shown on the start card. */
    description: string;
}

export const TACTICS_PUZZLES: TacticsPuzzle[] = [
    {
        id: 'ljubojevic-stein-1973',
        title: 'Ljubojevic – Stein, 1973',
        fen: 'r1bq1rk1/ppp2pbp/3p2p1/2n5/2P3n1/1PN1PN2/PB1QBPPP/3RK2R b K - 0 1',
        userColor: 'black',
        description: 'Black to play. Sac on f2 — meet both 2. O-O and 2. Kxf2.',
        lines: [
            ['Nxf2', 'Kxf2', 'Bxc3'],
            ['Nxf2', 'O-O', 'Nxd1'],
        ],
    },
    {
        id: 'schlechter-przepiorka-1906',
        title: 'Schlechter – Przepiorka, 1906',
        fen: 'r1bqr1k1/p1R1bp1p/1p4p1/3pB2Q/3p4/3BP3/PP3PPP/5RK1 w - - 0 1',
        userColor: 'white',
        description: 'White to play. Destroy on g6 — both recaptures get punished.',
        lines: [
            ['Bxg6', 'hxg6', 'Qh8#'],
            ['Bxg6', 'fxg6', 'Qh6'],
        ],
    },
];

/** Length (in plies) of the shared prefix of two lines. */
export function commonPrefixLen(a: string[], b: string[]): number {
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) {
        n++;
    }
    return n;
}

/**
 * Total user plies across a puzzle, counting shared prefixes once —
 * the trainer jumps back to the branch point instead of replaying them.
 */
export function countUniqueUserMoves(lines: string[][]): number {
    let total = 0;
    for (let i = 0; i < lines.length; i++) {
        const shared = i === 0 ? 0 : commonPrefixLen(lines[i - 1], lines[i]);
        // User plies are even plies; count those at/after the branch point.
        for (let p = shared; p < lines[i].length; p++) {
            if (p % 2 === 0) total++;
        }
    }
    return total;
}

/** Strip check/mate suffixes so Qh5+ matches Qh5. */
export function normalizeSan(san: string): string {
    return san.replace(/[+#]+$/, '');
}

/** True when the user's move matches the expected solution move. */
export function isExpectedMove(userSan: string, expectedSan: string): boolean {
    return normalizeSan(userSan) === normalizeSan(expectedSan);
}

/** Count how many plies in a line belong to the user (for accuracy stats). */
export function countUserMoves(line: string[]): number {
    // The user is always the side to move at the start, so user
    // moves are plies 0, 2, 4, ...
    return Math.ceil(line.length / 2);
}

/** A solution line with a display label, for the post-completion reveal. */
export interface LabeledSolution {
    label: string;
    pgn: string;
}

/** Number a SAN line with correct move numbers from the start FEN. */
export function formatLine(fen: string, sans: string[]): string {
    const parts = fen.split(' ');
    const whiteToMove = parts[1] === 'w';
    let n = parseInt(parts[5] || '1', 10);
    const out: string[] = [];
    sans.forEach((san, i) => {
        const isWhite = (i % 2 === 0) === whiteToMove;
        if (isWhite) {
            out.push(`${n}. ${san}`);
        } else {
            out.push(`${n}... ${san}`);
            n++;
        }
    });
    return out.join(' ');
}

/** All solution lines of a puzzle, labeled (defenses first, main last). */
export function solutionPgns(lines: string[][], fen: string): LabeledSolution[] {
    return lines.map((line, i) => ({
        label: i + 1 < lines.length ? `Defense ${i + 1}` : 'Main line',
        pgn: formatLine(fen, line),
    }));
}

/** Local-storage rating helpers (demo rating, ticks up, persists). */
export const TACTICS_RATING_KEY = 'dojo-tactics-trainer.rating';

export function ratingForPuzzle(mistakes: number): number {
    if (mistakes === 0) return 20;
    if (mistakes <= 2) return 10;
    return 5;
}

export function formatClock(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
