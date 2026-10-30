import { Chess, Move, TimeControl } from '@jackstenglein/chess';

/**
 * Converts the given clock string in the format hh:mm:ss to an
 * equivalent number of seconds. Returns undefined if clk is undefined
 * or cannot be parsed.
 * @param clk The clock string to convert.
 * @returns The number of seconds in the clock string.
 */
export function clockToSeconds(clk?: string): number | undefined {
    if (!clk) {
        return undefined;
    }

    const tokens = clk.split(':');
    let hours = 0;
    let minutes: number;
    let seconds: number;

    if (tokens.length === 3) {
        hours = parseInt(tokens[0]);
        minutes = parseInt(tokens[1]);
        seconds = parseInt(tokens[2]);
    } else if (tokens.length === 2) {
        minutes = parseInt(tokens[0]);
        seconds = parseInt(tokens[1]);
    } else {
        return undefined;
    }

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return undefined;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Converts the given number of seconds to a clock string in the
 * format hh:mm:ss.
 * @param value The number of seconds to convert.
 * @returns The value converted to hh:mm:ss format.
 */
export function secondsToClock(value: number): string {
    let result = '';
    if (value < 0) {
        result = '-';
        value = Math.abs(value);
    }

    const hours = Math.floor(value / 3600);
    if (hours > 0) {
        result = `${hours}:`;
    }

    const minutes = Math.floor((value % 3600) / 60);
    result += `${minutes.toLocaleString(undefined, { minimumIntegerDigits: 2 })}:`;

    const seconds = (value % 3600) % 60;
    result += seconds.toLocaleString(undefined, { minimumIntegerDigits: 2 });
    return result;
}

/**
 * Returns the time control for the given move in the given chess instance.
 * @param chess The chess instance to get the time control for.
 * @param move The move to get the time control for.
 */
export function timeControlForMove(chess: Chess, move: Move | undefined): TimeControl | undefined {
    const timeControls = chess.header().tags.TimeControl?.items;
    if (!timeControls) return undefined;
    if (!move) return timeControls[0];

    let moveNumber = Math.floor(move.ply / 2);
    if (move.ply % 2) {
        moveNumber += 1;
    }

    let moveCount = 0;
    for (const timeControl of timeControls) {
        if (!timeControl.moves) {
            return timeControl;
        }
        if (timeControl.moves + moveCount >= moveNumber) {
            return timeControl;
        }
        moveCount += timeControl.moves;
    }
    return timeControls[timeControls.length - 1];
}

/**
 * Returns the maximum clock time in seconds that each of the given moves can have,
 * based on the time control and the earlier clock times of the same player. Moves
 * without a clock time are assumed to have taken no time, so the increments and the
 * time added at the start of a new period still accumulate across them. The clock
 * of the last move of a period may include the time added for the next period.
 * @param chess The chess instance containing the time control.
 * @param moves The mainline moves of the game, starting from the first move.
 * @returns The maximum clock time in seconds for each move, or undefined if unknown.
 */
export function maxClockSeconds(chess: Chess, moves: Move[]): (number | undefined)[] {
    const timeControls = chess.header().tags.TimeControl?.items ?? [];
    const initialSeconds = timeControls[0]?.seconds;
    const prevSeconds = [initialSeconds, initialSeconds];

    return moves.map((move, i) => {
        const color = i % 2;
        const { timeControl, nextTimeControl } = timeControlPeriodForMoveNumber(
            timeControls,
            Math.floor(i / 2) + 1,
        );

        let max = prevSeconds[color];
        if (max !== undefined) {
            max +=
                Math.max(0, timeControl?.increment ?? 0) +
                Math.max(0, nextTimeControl?.seconds ?? 0);
        }

        prevSeconds[color] = clockToSeconds(move.commentDiag?.clk) || max;
        return max;
    });
}

/**
 * Returns the time control period that applies to the given full-move number. If the
 * move is the last move of its period, the period that follows it is also returned.
 * A final period with a move limit repeats until the end of the game.
 * @param timeControls The time control periods of the game.
 * @param moveNumber The 1-based full-move number.
 */
function timeControlPeriodForMoveNumber(
    timeControls: TimeControl[],
    moveNumber: number,
): { timeControl?: TimeControl; nextTimeControl?: TimeControl } {
    let moveCount = 0;
    let idx = 0;
    while (idx < timeControls.length) {
        const timeControl = timeControls[idx];
        if (!timeControl.moves || timeControl.moves <= 0) {
            return { timeControl };
        }
        if (moveNumber <= moveCount + timeControl.moves) {
            if (moveNumber === moveCount + timeControl.moves) {
                return {
                    timeControl,
                    nextTimeControl: timeControls[Math.min(idx + 1, timeControls.length - 1)],
                };
            }
            return { timeControl };
        }
        moveCount += timeControl.moves;
        if (idx + 1 < timeControls.length) {
            idx++;
        }
    }
    return {};
}
