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
    let minutes = 0;
    let seconds = 0;

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
