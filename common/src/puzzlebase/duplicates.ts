import { PuzzlebasePuzzle } from './api';

/**
 * The part of a FEN that says what a puzzle is: where the pieces stand and whose move it is.
 * Castling rights, en passant and move counters are left out, since puzzle FENs often get them
 * slightly wrong and they almost never change the puzzle.
 */
export function positionKey(fen: string): string {
    const [board = '', turn = 'w'] = fen.trim().split(/\s+/);
    return `${board} ${turn}`;
}

/** Puzzles that start from the same position. */
export interface DuplicateGroup {
    /** The position they share (pieces and side to move). */
    position: string;
    /** The puzzles, oldest first. */
    puzzles: PuzzlebasePuzzle[];
    /** Whether they also start with the same answer, so are very likely the same puzzle. */
    sameFirstMove: boolean;
}

/**
 * Finds puzzles that start from the same position. Groups where the answer is the same come
 * first, then the biggest groups.
 */
export function findDuplicates(puzzles: PuzzlebasePuzzle[]): DuplicateGroup[] {
    const byPosition = new Map<string, PuzzlebasePuzzle[]>();
    for (const puzzle of puzzles) {
        const key = positionKey(puzzle.fen);
        byPosition.set(key, [...(byPosition.get(key) ?? []), puzzle]);
    }
    return [...byPosition.entries()]
        .filter(([, list]) => list.length > 1)
        .map(([position, list]) => {
            const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
            // Rd8+ and Rd8# are the same move written two ways.
            const firstMoves = new Set(
                sorted.map((p) => splitPuzzleMoves(p.solutionPgn)[0]?.replace(/[+#]$/, '')),
            );
            return { position, puzzles: sorted, sameFirstMove: firstMoves.size === 1 };
        })
        .sort(
            (a, b) =>
                Number(b.sameFirstMove) - Number(a.sameFirstMove) ||
                b.puzzles.length - a.puzzles.length ||
                a.puzzles[0].id.localeCompare(b.puzzles[0].id),
        );
}

/**
 * The main-line moves of a puzzle's solution, in SAN, without move numbers, comments, variations
 * or annotations. Enough to tell whether two puzzles start with the same answer.
 */
export function splitPuzzleMoves(solutionPgn: string): string[] {
    const movetext = solutionPgn.replace(/^\s*\[[^\]]*\]\s*$/gm, '');
    let depth = 0;
    let clean = '';
    let inComment = false;
    for (const char of movetext) {
        if (inComment) {
            if (char === '}') inComment = false;
            continue;
        }
        if (char === '{') {
            inComment = true;
            continue;
        }
        if (char === '(') {
            depth++;
            continue;
        }
        if (char === ')') {
            depth = Math.max(0, depth - 1);
            continue;
        }
        if (depth === 0) clean += char;
    }
    return clean
        .split(/\s+/)
        .map((token) => token.replace(/^\d+\.+/, '').replace(/[!?]+$/, ''))
        .filter(
            (token) => token && !/^\$\d+$/.test(token) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token),
        );
}
