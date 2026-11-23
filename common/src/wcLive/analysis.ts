import { Chess } from '@jackstenglein/chess';
import { z } from 'zod';

/**
 * The senseis' shared analysis of a game. Only senseis see it: fans get the
 * live position.
 *
 * The analysis is stored as lines: each line is every move from the starting
 * position to the end of one variation, in SAN. The tree is rebuilt from the
 * main line (from Lichess) and the lines, so a line keeps its place even as
 * the game goes on, and it simply becomes part of the main line when the
 * players follow it.
 */

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Limits that keep the item small. */
export const MAX_LINES = 200;
export const MAX_PATH = 300;

/** Where the senseis are looking. */
export interface WcAnalysisCursor {
    /** Moves from the start to the position on the board. */
    path: string[];
    /**
     * Main line moves when it was set. Once the game has more, the cursor is
     * stale and everyone goes back to the live position.
     */
    mainPlies: number;
    by: string;
    at: string;
}

export interface WcAnalysis {
    roundId: string;
    lines: string[][];
    cursor?: WcAnalysisCursor;
    /** Bumped on every write, so two senseis saving at once cannot lose a line. */
    version: number;
}

const san = z.string().regex(/^[A-Za-z0-9+#=\-]{2,8}$/);
const path = z.array(san).max(MAX_PATH);
const roundId = z.string().regex(/^[A-Za-z0-9]{8}$/);

export const WcAnalysisRequestSchema = z.discriminatedUnion('action', [
    /** Plays a move: path ends with it. Adds a variation if it leaves the known moves. */
    z.object({ action: z.literal('move'), roundId, path: path.min(1) }),
    /** Shows a position to the other senseis. */
    z.object({ action: z.literal('select'), roundId, path }),
    /** Deletes the variation from the move at the end of path. */
    z.object({ action: z.literal('delete'), roundId, path: path.min(1) }),
]);
export type WcAnalysisRequest = z.infer<typeof WcAnalysisRequestSchema>;

function startsWith(line: readonly string[], prefix: readonly string[]): boolean {
    return prefix.length <= line.length && prefix.every((m, i) => line[i] === m);
}

/** Whether every move of the path can be played from the start. */
export function isLegalPath(moves: readonly string[]): boolean {
    let fen = START_FEN;
    for (const m of moves) {
        try {
            const move = new Chess({ fen }).move(m);
            if (!move) {
                return false;
            }
            fen = move.fen;
        } catch {
            return false;
        }
    }
    return true;
}

/**
 * Drops lines that add nothing: those that only follow the main line, those
 * contained in a longer line, and duplicates.
 */
export function normalizeLines(lines: string[][], mainline: readonly string[]): string[][] {
    const kept: string[][] = [];
    for (const line of lines) {
        if (line.length === 0 || startsWith(mainline, line)) {
            continue;
        }
        if (
            lines.some(
                (other) => other !== line && other.length > line.length && startsWith(other, line),
            )
        ) {
            continue;
        }
        if (kept.some((k) => k.length === line.length && startsWith(k, line))) {
            continue;
        }
        kept.push(line);
    }
    return kept;
}

/** The lines after a move that ends the given path. */
export function addLine(
    lines: string[][],
    movePath: string[],
    mainline: readonly string[],
): string[][] {
    return normalizeLines([...lines, movePath], mainline);
}

/**
 * The lines after deleting the variation that starts with the last move of
 * the path: every line through that move is cut just before it.
 */
export function deleteFrom(
    lines: string[][],
    movePath: string[],
    mainline: readonly string[],
): string[][] {
    const cut = lines.map((line) =>
        startsWith(line, movePath) ? line.slice(0, movePath.length - 1) : line,
    );
    return normalizeLines(cut, mainline);
}

/** Whether the cursor still applies: no main line move has come since it was set. */
export function cursorIsCurrent(cursor: WcAnalysisCursor | undefined, mainPlies: number): boolean {
    return !!cursor && cursor.mainPlies === mainPlies;
}

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

export interface MainlineMove {
    san: string;
    uci: string;
    from: string;
    to: string;
    fen: string;
}

export interface AnalysisNode {
    /** Empty for the root. */
    san: string;
    uci: string;
    from: string;
    to: string;
    /** The position after the move. */
    fen: string;
    /** 1 is White's first move. 0 for the root. */
    ply: number;
    /** Moves from the start to this node. */
    path: string[];
    /** Whether the node is on the game's main line. */
    mainline: boolean;
    /** The main line continuation first, then variations in the order they were added. */
    children: AnalysisNode[];
}

function child(parent: AnalysisNode, sanMove: string): AnalysisNode | undefined {
    const existing = parent.children.find((c) => c.san === sanMove);
    if (existing) {
        return existing;
    }
    try {
        const move = new Chess({ fen: parent.fen }).move(sanMove);
        if (!move) {
            return undefined;
        }
        const node: AnalysisNode = {
            san: move.san,
            uci: move.uci,
            from: move.from,
            to: move.to,
            fen: move.fen,
            ply: parent.ply + 1,
            path: [...parent.path, move.san],
            mainline: false,
            children: [],
        };
        parent.children.push(node);
        return node;
    } catch {
        return undefined;
    }
}

/** Builds the tree of the main line and the senseis' variations. */
export function buildTree(
    mainline: readonly MainlineMove[],
    lines: readonly string[][],
): AnalysisNode {
    const root: AnalysisNode = {
        san: '',
        uci: '',
        from: '',
        to: '',
        fen: START_FEN,
        ply: 0,
        path: [],
        mainline: true,
        children: [],
    };
    let node = root;
    for (const m of mainline) {
        const next: AnalysisNode = {
            ...m,
            ply: node.ply + 1,
            path: [...node.path, m.san],
            mainline: true,
            children: [],
        };
        node.children.push(next);
        node = next;
    }
    for (const line of lines) {
        let at: AnalysisNode | undefined = root;
        for (const m of line) {
            at = at && child(at, m);
        }
    }
    return root;
}

/** The node at the end of the path, or undefined if the tree does not have it. */
export function findNode(
    root: AnalysisNode,
    movePath: readonly string[],
): AnalysisNode | undefined {
    let node: AnalysisNode | undefined = root;
    for (const m of movePath) {
        node = node?.children.find((c) => c.san === m);
    }
    return node;
}

/** A request the analysis rules refuse, with a message for the sensei. */
export class AnalysisRuleError extends Error {}

/**
 * The analysis after a sensei's request. The API saves this, and the page
 * shows it at once while the API is answering.
 */
export function applyAnalysisRequest(
    current: WcAnalysis,
    request: WcAnalysisRequest,
    mainline: readonly string[],
    username: string,
    now = new Date(),
): WcAnalysis {
    const cursor = (movePath: string[]): WcAnalysisCursor => ({
        path: movePath,
        mainPlies: mainline.length,
        by: username,
        at: now.toISOString(),
    });

    switch (request.action) {
        case 'move': {
            const lines = addLine(current.lines, request.path, mainline);
            if (lines.length > MAX_LINES) {
                throw new AnalysisRuleError('The analysis is full. Delete a variation first.');
            }
            return { ...current, lines, cursor: cursor(request.path) };
        }
        case 'select':
            return { ...current, cursor: cursor(request.path) };
        case 'delete': {
            if (request.path.every((m, i) => mainline[i] === m)) {
                throw new AnalysisRuleError('Moves of the game cannot be deleted');
            }
            return {
                ...current,
                lines: deleteFrom(current.lines, request.path, mainline),
                cursor: cursor(request.path.slice(0, -1)),
            };
        }
    }
}
