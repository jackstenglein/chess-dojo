import { Chess } from '@jackstenglein/chess';
import { clockToSeconds, secondsToClock } from './clock';

/**
 * Splits a list of PGNs in the same string into a list of strings,
 * using the provided separator.
 * @param pgns The PGN string to split.
 * @param separator The separator to split around. Defaults to a game
 * termination symbol, followed by 1 or more newlines, followed by the [ character.
 * @returns The list of split PGNs.
 */
export function splitPgns(pgns: string, separator = /(1-0|0-1|1\/2-1\/2|\*)(\r?\n)+\[/): string[] {
    const splits = pgns.split(separator);
    const games: string[] = [];

    for (const split of splits) {
        if (isValidResult(split) && games.length > 0) {
            games[games.length - 1] += split;
        } else if (split.startsWith('[') || /^\d+/.exec(split.trim())) {
            games.push(split);
        } else if (split.trim().length > 0) {
            games.push(`[${split}`);
        }
    }

    return games.map((g) => g.trim()).filter((v) => v !== '');
}

/**
 * Returns true if the given result is a valid PGN result.
 * @param result The result to check.
 * @returns True if the given result is valid.
 */
export function isValidResult(result?: string): boolean {
    return result === '1-0' || result === '0-1' || result === '1/2-1/2' || result === '*';
}

/**
 * Cleans up a PGN to remove Chessbase-specific issues and convert %emt to %clk.
 * If the PGN is from Chessbase (determined by the presence of the %evp command),
 * then all newlines in the PGN are converted to the space character to revert
 * Chessbase PGN line wrapping. After this conversion, any double spaces are
 * converted to a newline to re-introduce newlines added by the user in a comment.
 *
 * Secondly, if the clock times are present in %emt format, they are converted to
 * %clk format.
 * @param pgn The PGN to potentially clean up.
 * @returns The cleaned PGN.
 */
export function cleanupPgn(pgn: string): string {
    const startIndex = pgn.indexOf('{[%evp');
    if (startIndex < 0) {
        return convertEmt(pgn);
    }
    return convertEmt(
        pgn.substring(0, startIndex) +
            pgn.substring(startIndex).replaceAll('\n', ' ').replaceAll('  ', '\n'),
    );
}

/**
 * Converts %emt commands to %clk commands in the PGN using the following
 * algorithm:
 *   1. If the TimeControl header is not present in the PGN, then %emt is
 *      converted to %clk using raw string replacement.
 *   2. Otherwise, go through each move and use the %emt value to calculate
 *      the player's remaining clock time after the move. Set %clk to that
 *      value.
 *   3. If at any point during step 2 a player has a negative clock time,
 *      assume that this is a Chessbase PGN which incorrectly used %emt and
 *      fallback to using raw string replacement.
 * @param pgn The PGN to convert.
 * @returns The converted PGN.
 */
export function convertEmt(pgn: string): string {
    if (!pgn.includes('[%emt')) {
        return pgn;
    }

    const chess = new Chess({ pgn });
    const timeControls = chess.header().tags.TimeControl?.items;

    if (!timeControls || timeControls.length === 0) {
        return pgn.replaceAll('[%emt', '[%clk');
    }

    let timeControlIdx = 0;
    let evenPlayerClock = timeControls[0].seconds || 0;
    let oddPlayerClock = timeControls[0].seconds || 0;

    for (let i = 0; i < chess.history().length; i++) {
        const move = chess.history()[i];
        const timeControl = timeControls[timeControlIdx];

        let timeUsed = clockToSeconds(move.commentDiag?.emt) ?? 0;
        if ((i === 0 || i === 1) && timeUsed === 60) {
            // Chessbase has a weird bug where it will say the players used 1 min on the first
            // move even if they actually used no time
            timeUsed = 0;
        }

        let newTime: number;
        let additionalTime = 0;

        if (
            timeControl.moves &&
            timeControlIdx + 1 < timeControls.length &&
            i / 2 === timeControl.moves - 1
        ) {
            additionalTime = Math.max(0, timeControls[timeControlIdx + 1].seconds ?? 0);
            if (move.color === 'b') {
                timeControlIdx++;
            }
        }

        if (i % 2) {
            oddPlayerClock =
                oddPlayerClock -
                timeUsed +
                Math.max(0, timeControl.increment ?? timeControl.delay ?? 0) +
                additionalTime;
            newTime = oddPlayerClock;
        } else {
            evenPlayerClock =
                evenPlayerClock -
                timeUsed +
                Math.max(0, timeControl.increment ?? timeControl.delay ?? 0) +
                additionalTime;
            newTime = evenPlayerClock;
        }

        if (newTime < 0) {
            return pgn.replaceAll('[%emt', '[%clk');
        }

        chess.setCommand('emt', '', move);
        chess.setCommand('clk', secondsToClock(newTime), move);
    }

    return chess.renderPgn();
}
