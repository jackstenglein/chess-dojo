import {
    AttemptSubmission,
    MoveRecord,
    TryRecord,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';

/** The longest time the server accepts for one move, in ms. */
const MAX_MS = 60 * 60 * 1000;

interface OpenTurn {
    line: number;
    ply: number;
    expected: string;
    startedAt: number;
    tries: TryRecord[];
}

/**
 * Keeps the record of one puzzle as the solver plays it: each of their turns, every move they
 * tried on it (wrong ones included), and how long each took.
 *
 * The trainer calls `beginTurn` when it becomes the solver's move, `recordWrong` for each wrong
 * move, and `recordCorrect` when the turn is settled. `finish` produces what is sent to the
 * server. It knows nothing about the board, so it can be tested with a fake clock.
 */
export class AttemptRecorder {
    private readonly startedAt: number;
    private readonly moves: MoveRecord[] = [];
    private turn?: OpenTurn;

    /**
     * @param puzzleId The puzzle being solved.
     * @param now Returns the current time in ms. Pass a fake one to test.
     */
    constructor(
        readonly puzzleId: string,
        private readonly now: () => number = Date.now,
    ) {
        this.startedAt = now();
    }

    /** Whether the solver has tried anything yet. Nothing worth saving if they have not. */
    get hasActivity(): boolean {
        return this.moves.length > 0 || (this.turn?.tries.length ?? 0) > 0;
    }

    /**
     * Starts the clock on one of the solver's turns. Calling it again for the turn that is
     * already open does nothing, so it is safe to call whenever the screen updates.
     * @param line Which line of the puzzle this is, counting from 0.
     * @param ply The move's position in the line, counting from 0.
     * @param expected The move the puzzle wants, in SAN.
     */
    beginTurn(line: number, ply: number, expected: string) {
        if (this.turn?.line === line && this.turn.ply === ply) {
            return;
        }
        this.turn = { line, ply, expected, startedAt: this.now(), tries: [] };
    }

    private sinceTurnStart(turn: OpenTurn): number {
        return Math.min(Math.max(0, this.now() - turn.startedAt), MAX_MS);
    }

    /** Records a wrong move on the open turn. */
    recordWrong(move: string) {
        if (this.turn) {
            this.turn.tries.push({ move, correct: false, ms: this.sinceTurnStart(this.turn) });
        }
    }

    /**
     * Records an alternate move that did not settle the turn: an ALT2 move, or an ALT move the
     * solver chose to try again after. It is not a wrong move.
     */
    recordAlternate(move: string, kind: 'alt' | 'alt2') {
        if (this.turn) {
            this.turn.tries.push({
                move,
                correct: false,
                alt: kind,
                ms: this.sinceTurnStart(this.turn),
            });
        }
    }

    /**
     * Records the right move, which settles the turn.
     * @param revealed Whether the trainer played it for the solver after two misses.
     * @param alt Set when the move is an ALT solution the solver chose to move on from. It
     * settles the turn just as the main-line move would.
     */
    recordCorrect(move: string, revealed = false, alt?: 'alt') {
        const turn = this.turn;
        if (!turn) {
            return;
        }
        const ms = this.sinceTurnStart(turn);
        turn.tries.push({
            move,
            correct: true,
            ms,
            ...(revealed ? { revealed: true } : {}),
            ...(alt ? { alt } : {}),
        });
        this.moves.push(toMoveRecord(turn, ms));
        this.turn = undefined;
    }

    /**
     * Ends the record.
     * @param abandoned Whether the solver left before finishing. A turn they were in the middle
     * of is kept if they had already tried something on it, so their wrong moves are not lost.
     */
    finish(abandoned = false): AttemptSubmission {
        const moves = [...this.moves];
        if (this.turn && this.turn.tries.length > 0) {
            moves.push(toMoveRecord(this.turn, this.sinceTurnStart(this.turn)));
        }
        return {
            puzzleId: this.puzzleId,
            startedAt: new Date(this.startedAt).toISOString(),
            finishedAt: new Date(this.now()).toISOString(),
            abandoned,
            moves,
        };
    }
}

function toMoveRecord(turn: OpenTurn, ms: number): MoveRecord {
    return { line: turn.line, ply: turn.ply, expected: turn.expected, tries: turn.tries, ms };
}
