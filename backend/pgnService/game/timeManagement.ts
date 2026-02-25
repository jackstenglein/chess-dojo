import { Chess } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import {
    calculateTimeRating,
    ClockDatum,
} from '@jackstenglein/chess-dojo-common/src/ratings/clockRating';

export interface TimeManagementRatings {
    white?: number;
    black?: number;
}

/**
 * Extracts clock data from a parsed Chess instance and calculates
 * time management ratings for both sides.
 * @param chess The parsed Chess instance with move history.
 * @returns An object with optional white and black time management ratings.
 */
export function calculateTimeManagementRatings(chess: Chess): TimeManagementRatings {
    const timeControls = chess.header().tags.TimeControl?.items;
    if (!timeControls?.length) {
        return {};
    }

    const initialSeconds = timeControls[0].seconds ?? 0;
    const moves = chess.history();

    const whiteClock: ClockDatum[] = [{ seconds: initialSeconds }];
    const blackClock: ClockDatum[] = [{ seconds: initialSeconds }];
    let hasClockData = false;

    for (let i = 0; i < moves.length; i += 2) {
        const whiteSeconds = clockToSeconds(moves[i]?.commentDiag?.clk);
        if (whiteSeconds !== undefined) hasClockData = true;
        whiteClock.push({
            seconds: whiteSeconds ?? whiteClock[whiteClock.length - 1].seconds,
        });

        if (moves[i + 1]) {
            const blackSeconds = clockToSeconds(moves[i + 1]?.commentDiag?.clk);
            if (blackSeconds !== undefined) hasClockData = true;
            blackClock.push({
                seconds: blackSeconds ?? blackClock[blackClock.length - 1].seconds,
            });
        }
    }

    if (!hasClockData) {
        return {};
    }

    const whiteResult = calculateTimeRating(timeControls, whiteClock);
    const blackResult = calculateTimeRating(timeControls, blackClock);

    return {
        white: whiteResult?.rating,
        black: blackResult?.rating,
    };
}
